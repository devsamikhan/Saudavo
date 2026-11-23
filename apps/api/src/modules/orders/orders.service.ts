import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  CancelOrderRequest,
  CheckoutQuoteDto,
  CheckoutQuoteRequest,
  CodCollectionRequest,
  CreateOrderMessageRequest,
  CreatePhysicalOrderRequest,
  CreateServiceOrderRequest,
  ManualPaymentConfirmationRequest,
  OrderCreatedSummary,
  OrderCreatedSummarySchema,
  OrderDetailDto,
  OrderMessageDto,
  RejectOrderRequest,
  RequestServiceRevisionRequest,
  RoleCode,
  STAFF_ROLES,
  UpdateSellerOrderStatusRequest
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { DomainException } from "../../common/errors/domain.exception";
import { IdempotencyService } from "../../common/idempotency/idempotency.service";
import { bigIntToSafeNumber } from "../../common/money.util";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { ClientMetadata } from "../auth/auth.service";
import { CustomerService } from "../customer/customer.service";
import { FinanceService } from "../finance/finance.service";
import { NotificationsService } from "../notifications/notifications.service";
import { OutboxService } from "../outbox/outbox.service";
import { SellerService } from "../seller/seller.service";
import {
  assertPhysicalSellerTransition,
  assertServiceSellerTransition,
  generateOrderNumber
} from "./order-state-machine";
import {
  ORDER_WITH_DETAILS_INCLUDE,
  toOrderDetailDto,
  toOrderMessageDto
} from "./orders.mapper";

const STAFF_ROLE_SET = new Set<RoleCode>(STAFF_ROLES);
export const SERVICE_AUTO_COMPLETE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotencyService: IdempotencyService,
    private readonly customerService: CustomerService,
    private readonly sellerService: SellerService,
    private readonly financeService: FinanceService,
    private readonly outboxService: OutboxService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService
  ) {}

  async quoteCheckout(
    userId: string,
    dto: CheckoutQuoteRequest,
    requestId: string
  ): Promise<{ data: CheckoutQuoteDto; meta: { requestId: string } }> {
    const { subtotalPaisa, deliveryFeePaisa, itemCount } =
      await this.evaluatePhysicalCart(userId, dto.storeId, dto.fulfilmentMode, dto.addressId);

    const subtotalNum = bigIntToSafeNumber(subtotalPaisa, "subtotalPaisa");
    const deliveryNum = bigIntToSafeNumber(deliveryFeePaisa, "deliveryFeePaisa");

    return {
      data: {
        storeId: dto.storeId,
        currency: "PKR",
        fulfilmentMode: dto.fulfilmentMode,
        subtotalPaisa: subtotalNum,
        deliveryFeePaisa: deliveryNum,
        discountPaisa: 0,
        totalPaisa: subtotalNum + deliveryNum,
        itemCount
      },
      meta: { requestId }
    };
  }

  async createPhysicalOrder(
    userId: string,
    dto: CreatePhysicalOrderRequest,
    idempotencyKey: string | undefined,
    requestId: string
  ): Promise<{ data: OrderCreatedSummary; meta: { requestId: string } }> {
    const summary = await this.idempotencyService.execute<OrderCreatedSummary>({
      userId,
      endpoint: "POST /api/v1/orders",
      keyValue: idempotencyKey,
      payload: dto,
      statusCode: HttpStatus.CREATED,
      run: async (tx) => {
        const evalResult = await this.evaluatePhysicalCart(
          userId,
          dto.storeId,
          dto.fulfilmentMode,
          dto.addressId,
          tx
        );

        const rule = await this.financeService.resolveApplicableRule(
          "PHYSICAL",
          tx
        );
        const financials = this.financeService.calculateOrderFinancials({
          subtotalPaisa: evalResult.subtotalPaisa,
          deliveryFeePaisa: evalResult.deliveryFeePaisa,
          discountPaisa: 0n,
          commissionRuleId: rule.id,
          rateBps: rule.rateBps
        });

        // Atomic conditional stock decrement per item
        for (const item of evalResult.cart.items) {
          if (item.productVariantId) {
            const dec = await tx.productVariant.updateMany({
              where: {
                id: item.productVariantId,
                deletedAt: null,
                isActive: true,
                stockQuantity: { gte: item.quantity }
              },
              data: {
                stockQuantity: { decrement: item.quantity }
              }
            });
            if (dec.count === 0) {
              throw new DomainException(
                "CONFLICT",
                HttpStatus.CONFLICT,
                `Insufficient stock for variant on product "${item.product.title}".`
              );
            }
          } else {
            const dec = await tx.product.updateMany({
              where: {
                id: item.productId,
                deletedAt: null,
                status: "ACTIVE",
                stockQuantity: { gte: item.quantity }
              },
              data: {
                stockQuantity: { decrement: item.quantity }
              }
            });
            if (dec.count === 0) {
              throw new DomainException(
                "CONFLICT",
                HttpStatus.CONFLICT,
                `Insufficient stock for product "${item.product.title}".`
              );
            }
          }
        }

        const orderNumber = generateOrderNumber(evalResult.store.district.code);
        const order = await tx.order.create({
          data: {
            orderNumber,
            customerId: userId,
            storeId: evalResult.store.id,
            districtId: evalResult.store.districtId,
            orderType: "PHYSICAL",
            status: "PENDING_CONFIRMATION",
            paymentMethod: "COD",
            codCollectionStatus: "PENDING_COLLECTION",
            currency: "PKR",
            subtotalPaisa: evalResult.subtotalPaisa,
            deliveryFeePaisa: evalResult.deliveryFeePaisa,
            discountPaisa: 0n,
            totalPaisa: financials.totalPaisa,
            commissionRuleId: financials.commissionRuleId,
            commissionRateBps: financials.commissionRateBps,
            commissionAmountPaisa: financials.commissionAmountPaisa,
            sellerNetEntitlementPaisa: financials.sellerNetEntitlementPaisa,
            customerNote: dto.customerNote ?? null
          }
        });

        await tx.orderItem.createMany({
          data: evalResult.cart.items.map((item) => {
            const unitPrice = item.productVariant
              ? item.productVariant.pricePaisa
              : item.product.basePricePaisa;
            return {
              orderId: order.id,
              productId: item.productId,
              productVariantId: item.productVariantId,
              titleSnapshot: item.product.title,
              variantTitleSnapshot: item.productVariant?.title ?? null,
              skuSnapshot: item.productVariant?.sku ?? null,
              unitPricePaisa: unitPrice,
              quantity: item.quantity,
              lineTotalPaisa: unitPrice * BigInt(item.quantity),
              currency: "PKR"
            };
          })
        });

        await tx.delivery.create({
          data: {
            orderId: order.id,
            fulfilmentMode: dto.fulfilmentMode,
            deliveryStatus: "NOT_STARTED",
            areaZoneId: evalResult.address?.areaZoneId ?? null,
            ...(evalResult.address
              ? {
                  shippingAddressSnapshotJson: {
                    recipientName: evalResult.address.recipientName,
                    recipientPhone: evalResult.address.recipientPhone,
                    streetAddress: evalResult.address.streetAddress,
                    landmark: evalResult.address.landmark,
                    districtName: evalResult.address.district.nameEn,
                    areaZoneName: evalResult.address.areaZone?.nameEn ?? null
                  }
                }
              : {})
          }
        });

        await tx.payment.create({
          data: {
            orderId: order.id,
            providerCode: "COD_MANUAL",
            paymentMethod: "COD",
            status: "PENDING",
            amountPaisa: financials.totalPaisa,
            currency: "PKR"
          }
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: null,
            toStatus: "PENDING_CONFIRMATION",
            actorId: userId,
            actorRole: "CUSTOMER",
            reason: "Customer placed single-seller COD physical order."
          }
        });

        await tx.cartItem.deleteMany({ where: { cartId: evalResult.cart.id } });
        await tx.cart.delete({ where: { id: evalResult.cart.id } });

        await this.outboxService.enqueue(
          {
            eventType: "ORDER_CREATED",
            aggregateType: "Order",
            aggregateId: order.id,
            payloadJson: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              storeId: order.storeId,
              orderType: "PHYSICAL"
            }
          },
          tx
        );

        const storeOwner = await tx.store.findUnique({
          where: { id: order.storeId },
          select: { sellerProfile: { select: { userId: true } } }
        });
        if (storeOwner?.sellerProfile.userId) {
          await this.notificationsService.notify(
            {
              userId: storeOwner.sellerProfile.userId,
              eventType: "ORDER_CREATED",
              titleKey: "notification.orderCreated",
              payloadJson: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                orderType: "PHYSICAL"
              }
            },
            tx
          );
        }

        return OrderCreatedSummarySchema.parse({
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderType: "PHYSICAL",
          storeId: order.storeId,
          status: order.status,
          paymentMethod: order.paymentMethod,
          codCollectionStatus: order.codCollectionStatus,
          currency: order.currency,
          subtotalPaisa: bigIntToSafeNumber(order.subtotalPaisa, "subtotalPaisa"),
          deliveryFeePaisa: bigIntToSafeNumber(
            order.deliveryFeePaisa,
            "deliveryFeePaisa"
          ),
          totalPaisa: bigIntToSafeNumber(order.totalPaisa, "totalPaisa")
        });
      }
    });

    return { data: summary, meta: { requestId } };
  }

  async createServiceOrder(
    userId: string,
    dto: CreateServiceOrderRequest,
    idempotencyKey: string | undefined,
    requestId: string
  ): Promise<{ data: OrderCreatedSummary; meta: { requestId: string } }> {
    const summary = await this.idempotencyService.execute<OrderCreatedSummary>({
      userId,
      endpoint: "POST /api/v1/orders/services",
      keyValue: idempotencyKey,
      payload: dto,
      statusCode: HttpStatus.CREATED,
      run: async (tx) => {
        const listing = await tx.serviceListing.findFirst({
          where: {
            id: dto.serviceListingId,
            status: "ACTIVE",
            deletedAt: null,
            store: {
              status: "ACTIVE",
              deletedAt: null,
              sellerProfile: { verificationStatus: "APPROVED" }
            }
          },
          include: {
            store: {
              include: {
                district: true,
                sellerProfile: true,
                serviceAreas: true
              }
            },
            packages: {
              where: {
                id: dto.servicePackageId,
                deletedAt: null,
                isActive: true
              }
            }
          }
        });

        if (!listing || listing.packages.length === 0) {
          throw new DomainException(
            "NOT_FOUND",
            HttpStatus.NOT_FOUND,
            "Active service listing or package not found."
          );
        }

        const selectedPkg = listing.packages[0]!;
        if (listing.store.sellerProfile.userId === userId) {
          throw new DomainException(
            "FORBIDDEN",
            HttpStatus.FORBIDDEN,
            "Self-dealing is not allowed: sellers cannot order their own services."
          );
        }

        const isRemote = listing.serviceMode === "REMOTE";
        const paymentMethod = isRemote ? "MANUAL_OFFLINE" : "COD";
        let addressSnapshot:
          | {
              recipientName: string;
              recipientPhone: string;
              streetAddress: string;
              landmark: string | null;
              districtName: string;
              areaZoneName: string | null;
            }
          | undefined;
        let resolvedAreaZoneId: string | null = null;

        if (!isRemote) {
          if (!dto.addressId) {
            throw new DomainException(
              "VALIDATION_ERROR",
              HttpStatus.BAD_REQUEST,
              `An address within the store's service area is required for ${listing.serviceMode} service orders.`
            );
          }
          const address = await this.customerService.requireOwnedAddress(
            userId,
            dto.addressId
          );
          const inServiceArea =
            address.districtId === listing.store.districtId &&
            Boolean(
              address.areaZoneId &&
                listing.store.serviceAreas.some(
                  (sa) => sa.areaZoneId === address.areaZoneId
                )
            );
          if (!inServiceArea) {
            throw new DomainException(
              "VALIDATION_ERROR",
              HttpStatus.BAD_REQUEST,
              "Selected address is outside the service provider's coverage area."
            );
          }
          resolvedAreaZoneId = address.areaZoneId;
          addressSnapshot = {
            recipientName: address.recipientName,
            recipientPhone: address.recipientPhone,
            streetAddress: address.streetAddress,
            landmark: address.landmark,
            districtName: address.district.nameEn,
            areaZoneName: address.areaZone?.nameEn ?? null
          };
        }

        const rule = await this.financeService.resolveApplicableRule(
          "SERVICE",
          tx
        );
        const financials = this.financeService.calculateOrderFinancials({
          subtotalPaisa: selectedPkg.pricePaisa,
          deliveryFeePaisa: 0n,
          discountPaisa: 0n,
          commissionRuleId: rule.id,
          rateBps: rule.rateBps
        });

        const order = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(listing.store.district.code),
            customerId: userId,
            storeId: listing.store.id,
            districtId: listing.store.districtId,
            orderType: "SERVICE",
            status: "PENDING_CONFIRMATION",
            paymentMethod,
            codCollectionStatus: "PENDING_COLLECTION",
            currency: "PKR",
            subtotalPaisa: selectedPkg.pricePaisa,
            deliveryFeePaisa: 0n,
            discountPaisa: 0n,
            totalPaisa: financials.totalPaisa,
            commissionRuleId: financials.commissionRuleId,
            commissionRateBps: financials.commissionRateBps,
            commissionAmountPaisa: financials.commissionAmountPaisa,
            sellerNetEntitlementPaisa: financials.sellerNetEntitlementPaisa,
            customerNote: dto.customerNote ?? null
          }
        });

        await tx.serviceOrderDetails.create({
          data: {
            orderId: order.id,
            serviceListingId: listing.id,
            servicePackageId: selectedPkg.id,
            serviceModeSnapshot: listing.serviceMode,
            serviceTitleSnapshot: listing.title,
            packageNameSnapshot: selectedPkg.tierName,
            packagePricePaisa: selectedPkg.pricePaisa,
            deliveryEstimateDaysSnapshot: selectedPkg.deliveryEstimateDays,
            maxRevisionsSnapshot: selectedPkg.maxRevisions,
            areaZoneId: resolvedAreaZoneId,
            ...(addressSnapshot
              ? { serviceAddressSnapshotJson: addressSnapshot }
              : {}),
            customerRequirements: dto.customerRequirements
          }
        });

        await tx.payment.create({
          data: {
            orderId: order.id,
            providerCode: isRemote ? "MANUAL_OFFLINE" : "COD_MANUAL",
            paymentMethod,
            status: "PENDING",
            amountPaisa: financials.totalPaisa,
            currency: "PKR"
          }
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: null,
            toStatus: "PENDING_CONFIRMATION",
            actorId: userId,
            actorRole: "CUSTOMER",
            reason: `Customer placed ${listing.serviceMode} service order.`
          }
        });

        await this.outboxService.enqueue(
          {
            eventType: "ORDER_CREATED",
            aggregateType: "Order",
            aggregateId: order.id,
            payloadJson: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              storeId: order.storeId,
              orderType: "SERVICE",
              serviceMode: listing.serviceMode
            }
          },
          tx
        );

        const serviceStoreOwner = await tx.store.findUnique({
          where: { id: order.storeId },
          select: { sellerProfile: { select: { userId: true } } }
        });
        if (serviceStoreOwner?.sellerProfile.userId) {
          await this.notificationsService.notify(
            {
              userId: serviceStoreOwner.sellerProfile.userId,
              eventType: "ORDER_CREATED",
              titleKey: "notification.orderCreated",
              payloadJson: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                orderType: "SERVICE"
              }
            },
            tx
          );
        }

        return OrderCreatedSummarySchema.parse({
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderType: "SERVICE",
          storeId: order.storeId,
          status: order.status,
          paymentMethod: order.paymentMethod,
          codCollectionStatus: order.codCollectionStatus,
          currency: order.currency,
          subtotalPaisa: bigIntToSafeNumber(order.subtotalPaisa, "subtotalPaisa"),
          deliveryFeePaisa: 0,
          totalPaisa: bigIntToSafeNumber(order.totalPaisa, "totalPaisa")
        });
      }
    });

    return { data: summary, meta: { requestId } };
  }

  async listCustomerOrders(
    userId: string,
    requestId: string
  ): Promise<{ data: OrderDetailDto[]; meta: { requestId: string } }> {
    const orders = await this.prisma.order.findMany({
      where: { customerId: userId },
      include: ORDER_WITH_DETAILS_INCLUDE,
      orderBy: { createdAt: "desc" }
    });

    return {
      data: orders.map((order) =>
        toOrderDetailDto(order, { revealPickupInstructions: true })
      ),
      meta: { requestId }
    };
  }

  async getCustomerOrder(
    userId: string,
    orderId: string,
    requestId: string
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: ORDER_WITH_DETAILS_INCLUDE
    });
    if (!order) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Order not found."
      );
    }

    return {
      data: toOrderDetailDto(order, { revealPickupInstructions: true }),
      meta: { requestId }
    };
  }

  /**
   * PQ-10: Customer self-cancellation is allowed ONLY while order is PENDING_CONFIRMATION.
   */
  async cancelCustomerOrder(
    userId: string,
    orderId: string,
    dto: CancelOrderRequest,
    requestId: string
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: ORDER_WITH_DETAILS_INCLUDE
    });
    if (!order) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Order not found."
      );
    }
    if (order.status !== "PENDING_CONFIRMATION") {
      throw new DomainException(
        "INVALID_STATE_TRANSITION",
        HttpStatus.CONFLICT,
        "Self-cancellation is only allowed before the seller confirms the order."
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const transitioned = await tx.order.updateMany({
        where: {
          id: order.id,
          customerId: userId,
          status: "PENDING_CONFIRMATION"
        },
        data: {
          status: "CANCELLED",
          cancelledReason: dto.reason ?? "Cancelled by customer."
        }
      });

      if (transitioned.count === 0) {
        throw new DomainException(
          "INVALID_STATE_TRANSITION",
          HttpStatus.CONFLICT,
          "Order status changed concurrently; self-cancellation rejected."
        );
      }

      if (order.orderType === "PHYSICAL") {
        await this.restorePhysicalStock(order.items, tx);
      }

      await tx.payment.updateMany({
        where: { orderId: order.id, status: "PENDING" },
        data: { status: "CANCELLED" }
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: "PENDING_CONFIRMATION",
          toStatus: "CANCELLED",
          actorId: userId,
          actorRole: "CUSTOMER",
          reason: dto.reason ?? "Cancelled by customer."
        }
      });

      await this.outboxService.enqueue(
        {
          eventType: "ORDER_CANCELLED",
          aggregateType: "Order",
          aggregateId: order.id,
          payloadJson: { orderId: order.id, byRole: "CUSTOMER" }
        },
        tx
      );

      return tx.order.findFirst({
        where: { id: order.id },
        include: ORDER_WITH_DETAILS_INCLUDE
      });
    });

    return {
      data: toOrderDetailDto(updated!, { revealPickupInstructions: true }),
      meta: { requestId }
    };
  }

  async acceptServiceDelivery(
    userId: string,
    orderId: string,
    requestId: string
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId, orderType: "SERVICE" },
      include: {
        ...ORDER_WITH_DETAILS_INCLUDE,
        payments: true
      }
    });
    if (!order || !order.serviceOrderDetails) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Service order not found."
      );
    }

    if (order.status !== "DELIVERY_SUBMITTED") {
      throw new DomainException(
        "INVALID_STATE_TRANSITION",
        HttpStatus.CONFLICT,
        "Service delivery can only be accepted when status is DELIVERY_SUBMITTED."
      );
    }

    const now = new Date();
    const isPaymentCollected =
      order.codCollectionStatus === "COLLECTED" ||
      order.payments.some((p) => p.status === "COLLECTED");

    const updated = await this.prisma.$transaction(async (tx) => {
      if (isPaymentCollected) {
        const completed = await this.completeServiceOrderInsideTx(
          {
            order,
            now,
            actorId: userId,
            actorRole: "CUSTOMER",
            commissionActorId: userId,
            reason: "Customer accepted service delivery and payment already collected."
          },
          tx
        );
        if (!completed) {
          throw new DomainException(
            "INVALID_STATE_TRANSITION",
            HttpStatus.CONFLICT,
            "Order status changed concurrently."
          );
        }
      } else {
        await tx.serviceOrderDetails.update({
          where: { id: order.serviceOrderDetails!.id },
          data: { customerAcceptedAt: now }
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: "DELIVERY_SUBMITTED",
            toStatus: "DELIVERY_SUBMITTED",
            actorId: userId,
            actorRole: "CUSTOMER",
            reason:
              "Customer accepted service delivery; awaiting payment collection confirmation."
          }
        });
      }

      return tx.order.findFirst({
        where: { id: order.id },
        include: ORDER_WITH_DETAILS_INCLUDE
      });
    });

    return {
      data: toOrderDetailDto(updated!, { revealPickupInstructions: false }),
      meta: { requestId }
    };
  }

  /**
   * PQ-10 (D-036): Auto-completes service orders 7 days after DELIVERY_SUBMITTED
   * when payment is COLLECTED and no revision or dispute is open.
   */
  async autoCompleteExpiredServiceOrders(input?: {
    actorId?: string | null;
    actorRole?: RoleCode | string;
    ipAddress?: string | null;
    userAgent?: string | null;
    now?: Date;
  }): Promise<{ checkedCount: number; completedOrderIds: string[] }> {
    const now = input?.now ?? new Date();
    const actorId = input?.actorId ?? null;

    const candidates = await this.prisma.order.findMany({
      where: {
        orderType: "SERVICE",
        status: "DELIVERY_SUBMITTED",
        codCollectionStatus: "COLLECTED"
      },
      include: {
        ...ORDER_WITH_DETAILS_INCLUDE,
        payments: true
      }
    });

    const eligible = candidates.filter((order) => {
      const details = order.serviceOrderDetails;
      if (!details || details.customerAcceptedAt !== null || !details.deliverySubmittedAt) {
        return false;
      }
      const elapsedMs = now.getTime() - details.deliverySubmittedAt.getTime();
      if (elapsedMs < SERVICE_AUTO_COMPLETE_WINDOW_MS) {
        return false;
      }
      return order.payments.some((p) => p.status === "COLLECTED");
    });

    const completedOrderIds: string[] = [];
    for (const order of eligible) {
      const completed = await this.prisma.$transaction((tx) =>
        this.completeServiceOrderInsideTx(
          {
            order,
            now,
            actorId,
            actorRole: actorId ? "ADMIN" : "SYSTEM",
            commissionActorId: actorId ?? order.customerId,
            reason:
              "PQ-10 (D-036): Auto-completed 7 days after DELIVERY_SUBMITTED with no open revision or dispute."
          },
          tx
        )
      );
      if (completed) {
        completedOrderIds.push(order.id);
      }
    }

    const firstCompletedId = completedOrderIds[0];
    if (actorId && firstCompletedId) {
      await this.auditService.record({
        actorId,
        actorRole: input?.actorRole ?? "ADMIN",
        action: "SERVICE_AUTO_COMPLETE_SWEEP",
        targetType: "Order",
        targetId: firstCompletedId,
        reason: "PQ-10 (D-036): 7-day service auto-completion sweep.",
        afterJson: {
          checkedCount: candidates.length,
          completedCount: completedOrderIds.length,
          completedOrderIds
        },
        ipAddress: input?.ipAddress ?? null,
        userAgent: input?.userAgent ?? null
      });
    }

    return {
      checkedCount: candidates.length,
      completedOrderIds
    };
  }

  private async completeServiceOrderInsideTx(
    input: {
      order: {
        id: string;
        storeId: string;
        subtotalPaisa: bigint;
        discountPaisa: bigint;
        totalPaisa: bigint;
        commissionRuleId: string;
        commissionRateBps: number;
        commissionAmountPaisa: bigint;
        sellerNetEntitlementPaisa: bigint;
        serviceOrderDetails: { id: string } | null;
      };
      now: Date;
      actorId: string | null;
      actorRole: "CUSTOMER" | "ADMIN" | "SYSTEM";
      commissionActorId: string;
      reason: string;
    },
    tx: Prisma.TransactionClient
  ): Promise<boolean> {
    if (!input.order.serviceOrderDetails) {
      return false;
    }
    const res = await tx.order.updateMany({
      where: { id: input.order.id, status: "DELIVERY_SUBMITTED" },
      data: {
        status: "COMPLETED",
        completedAt: input.now
      }
    });
    if (res.count !== 1) {
      return false;
    }

    await tx.serviceOrderDetails.update({
      where: { id: input.order.serviceOrderDetails.id },
      data: { customerAcceptedAt: input.now }
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: input.order.id,
        fromStatus: "DELIVERY_SUBMITTED",
        toStatus: "COMPLETED",
        actorId: input.actorId,
        actorRole: input.actorRole,
        reason: input.reason
      }
    });

    await this.financeService.postCommissionAccrualIfEligible(
      {
        id: input.order.id,
        storeId: input.order.storeId,
        status: "COMPLETED",
        codCollectionStatus: "COLLECTED",
        subtotalPaisa: input.order.subtotalPaisa,
        discountPaisa: input.order.discountPaisa,
        totalPaisa: input.order.totalPaisa,
        commissionRuleId: input.order.commissionRuleId,
        commissionRateBps: input.order.commissionRateBps,
        commissionAmountPaisa: input.order.commissionAmountPaisa,
        sellerNetEntitlementPaisa: input.order.sellerNetEntitlementPaisa
      },
      input.commissionActorId,
      tx
    );

    return true;
  }

  async requestServiceRevision(
    userId: string,
    orderId: string,
    dto: RequestServiceRevisionRequest,
    requestId: string
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId, orderType: "SERVICE" },
      include: ORDER_WITH_DETAILS_INCLUDE
    });
    if (!order || !order.serviceOrderDetails) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Service order not found."
      );
    }

    if (order.status !== "DELIVERY_SUBMITTED") {
      throw new DomainException(
        "INVALID_STATE_TRANSITION",
        HttpStatus.CONFLICT,
        "Revisions can only be requested when status is DELIVERY_SUBMITTED."
      );
    }

    if (
      order.serviceOrderDetails.revisionsUsed >=
      order.serviceOrderDetails.maxRevisionsSnapshot
    ) {
      throw new DomainException(
        "INVALID_STATE_TRANSITION",
        HttpStatus.CONFLICT,
        "All included service revisions have already been used."
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const transitioned = await tx.order.updateMany({
        where: { id: order.id, status: "DELIVERY_SUBMITTED" },
        data: { status: "REVISION_REQUESTED" }
      });
      if (transitioned.count === 0) {
        throw new DomainException(
          "INVALID_STATE_TRANSITION",
          HttpStatus.CONFLICT,
          "Order status changed concurrently."
        );
      }

      await tx.serviceOrderDetails.update({
        where: { id: order.serviceOrderDetails!.id },
        data: { revisionsUsed: { increment: 1 } }
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: "DELIVERY_SUBMITTED",
          toStatus: "REVISION_REQUESTED",
          actorId: userId,
          actorRole: "CUSTOMER",
          reason: dto.reason
        }
      });

      const storeOwner = await tx.store.findUnique({
        where: { id: order.storeId },
        select: { sellerProfile: { select: { userId: true } } }
      });
      if (storeOwner?.sellerProfile.userId) {
        await this.notificationsService.notify(
          {
            userId: storeOwner.sellerProfile.userId,
            eventType: "REVISION_REQUESTED",
            titleKey: "notification.revisionRequested",
            payloadJson: {
              orderId: order.id,
              orderNumber: order.orderNumber
            }
          },
          tx
        );
      }

      return tx.order.findFirst({
        where: { id: order.id },
        include: ORDER_WITH_DETAILS_INCLUDE
      });
    });

    return {
      data: toOrderDetailDto(updated!, { revealPickupInstructions: false }),
      meta: { requestId }
    };
  }

  async listSellerOrders(
    userId: string,
    requestId: string
  ): Promise<{ data: OrderDetailDto[]; meta: { requestId: string } }> {
    const { store } = await this.sellerService.requireOwnStore(userId);
    const orders = await this.prisma.order.findMany({
      where: { storeId: store.id },
      include: ORDER_WITH_DETAILS_INCLUDE,
      orderBy: { createdAt: "desc" }
    });

    const codStatsMap = await this.loadBuyerCodStatsMap(
      orders.map((order) => order.customerId)
    );

    return {
      data: orders.map((order) =>
        toOrderDetailDto(order, {
          revealPickupInstructions: true,
          buyerCodStats: codStatsMap.get(order.customerId) ?? {
            completedCodCount: 0,
            refusedCodCount: 0
          }
        })
      ),
      meta: { requestId }
    };
  }

  async getSellerOrder(
    userId: string,
    orderId: string,
    requestId: string
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    const { store } = await this.sellerService.requireOwnStore(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId: store.id },
      include: ORDER_WITH_DETAILS_INCLUDE
    });
    if (!order) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Order not found."
      );
    }

    const codStatsMap = await this.loadBuyerCodStatsMap([order.customerId]);

    return {
      data: toOrderDetailDto(order, {
        revealPickupInstructions: true,
        buyerCodStats: codStatsMap.get(order.customerId) ?? {
          completedCodCount: 0,
          refusedCodCount: 0
        }
      }),
      meta: { requestId }
    };
  }

  private async loadBuyerCodStatsMap(customerIds: string[]): Promise<
    Map<string, { completedCodCount: number; refusedCodCount: number }>
  > {
    const map = new Map<
      string,
      { completedCodCount: number; refusedCodCount: number }
    >();
    const uniqueIds = [...new Set(customerIds)];
    if (uniqueIds.length === 0) return map;

    const grouped = await this.prisma.order.groupBy({
      by: ["customerId", "codCollectionStatus"],
      where: {
        customerId: { in: uniqueIds },
        paymentMethod: "COD"
      },
      _count: { _all: true }
    });

    for (const row of grouped) {
      const current = map.get(row.customerId) ?? {
        completedCodCount: 0,
        refusedCodCount: 0
      };
      if (row.codCollectionStatus === "COLLECTED") {
        current.completedCodCount += row._count._all;
      } else if (row.codCollectionStatus === "FAILED_REFUSED") {
        current.refusedCodCount += row._count._all;
      }
      map.set(row.customerId, current);
    }

    return map;
  }

  async confirmSellerOrder(
    userId: string,
    orderId: string,
    requestId: string
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    const { store } = await this.sellerService.requireOwnStore(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId: store.id }
    });
    if (!order) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Order not found."
      );
    }
    if (order.status !== "PENDING_CONFIRMATION") {
      throw new DomainException(
        "INVALID_STATE_TRANSITION",
        HttpStatus.CONFLICT,
        "Only PENDING_CONFIRMATION orders can be confirmed."
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.order.updateMany({
        where: {
          id: order.id,
          storeId: store.id,
          status: "PENDING_CONFIRMATION"
        },
        data: { status: "CONFIRMED" }
      });
      if (res.count === 0) {
        throw new DomainException(
          "INVALID_STATE_TRANSITION",
          HttpStatus.CONFLICT,
          "Order status changed concurrently."
        );
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: "PENDING_CONFIRMATION",
          toStatus: "CONFIRMED",
          actorId: userId,
          actorRole: "SELLER",
          reason: "Seller confirmed order."
        }
      });

      await this.outboxService.enqueue(
        {
          eventType: "ORDER_CONFIRMED",
          aggregateType: "Order",
          aggregateId: order.id,
          payloadJson: { orderId: order.id, storeId: store.id }
        },
        tx
      );

      await this.notificationsService.notify(
        {
          userId: order.customerId,
          eventType: "ORDER_CONFIRMED",
          titleKey: "notification.orderConfirmed",
          payloadJson: {
            orderId: order.id,
            orderNumber: order.orderNumber
          }
        },
        tx
      );

      return tx.order.findFirst({
        where: { id: order.id },
        include: ORDER_WITH_DETAILS_INCLUDE
      });
    });

    return {
      data: toOrderDetailDto(updated!, { revealPickupInstructions: true }),
      meta: { requestId }
    };
  }

  async rejectSellerOrder(
    userId: string,
    orderId: string,
    dto: RejectOrderRequest,
    requestId: string
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    const { store } = await this.sellerService.requireOwnStore(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId: store.id },
      include: ORDER_WITH_DETAILS_INCLUDE
    });
    if (!order) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Order not found."
      );
    }
    if (order.status !== "PENDING_CONFIRMATION") {
      throw new DomainException(
        "INVALID_STATE_TRANSITION",
        HttpStatus.CONFLICT,
        "Only PENDING_CONFIRMATION orders can be rejected."
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.order.updateMany({
        where: {
          id: order.id,
          storeId: store.id,
          status: "PENDING_CONFIRMATION"
        },
        data: {
          status: "CANCELLED",
          cancelledReason: dto.reason
        }
      });
      if (res.count === 0) {
        throw new DomainException(
          "INVALID_STATE_TRANSITION",
          HttpStatus.CONFLICT,
          "Order status changed concurrently."
        );
      }

      if (order.orderType === "PHYSICAL") {
        await this.restorePhysicalStock(order.items, tx);
      }

      await tx.payment.updateMany({
        where: { orderId: order.id, status: "PENDING" },
        data: { status: "CANCELLED" }
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: "PENDING_CONFIRMATION",
          toStatus: "CANCELLED",
          actorId: userId,
          actorRole: "SELLER",
          reason: dto.reason
        }
      });

      return tx.order.findFirst({
        where: { id: order.id },
        include: ORDER_WITH_DETAILS_INCLUDE
      });
    });

    return {
      data: toOrderDetailDto(updated!, { revealPickupInstructions: true }),
      meta: { requestId }
    };
  }

  async updateSellerOrderStatus(
    userId: string,
    orderId: string,
    dto: UpdateSellerOrderStatusRequest,
    requestId: string
  ): Promise<{ data: OrderDetailDto; meta: { requestId: string } }> {
    const { store } = await this.sellerService.requireOwnStore(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId: store.id },
      include: ORDER_WITH_DETAILS_INCLUDE
    });
    if (!order) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Order not found."
      );
    }

    if (order.orderType === "PHYSICAL") {
      assertPhysicalSellerTransition(
        order.status,
        dto.toStatus,
        order.delivery?.fulfilmentMode ?? "SELLER_DELIVERY"
      );
    } else {
      assertServiceSellerTransition(order.status, dto.toStatus);
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.order.updateMany({
        where: {
          id: order.id,
          storeId: store.id,
          status: order.status
        },
        data: {
          status: dto.toStatus,
          ...(dto.toStatus === "CANCELLED"
            ? { cancelledReason: dto.reason ?? "Cancelled by seller." }
            : {})
        }
      });
      if (res.count === 0) {
        throw new DomainException(
          "INVALID_STATE_TRANSITION",
          HttpStatus.CONFLICT,
          "Order status changed concurrently."
        );
      }

      if (order.orderType === "PHYSICAL" && order.delivery) {
        await tx.delivery.update({
          where: { id: order.delivery.id },
          data: {
            ...(dto.toStatus === "PREPARING"
              ? { deliveryStatus: "PREPARING" }
              : {}),
            ...(dto.toStatus === "READY_FOR_DISPATCH"
              ? {
                  deliveryStatus: "READY_FOR_HANDOFF",
                  ...(dto.pickupInstructions !== undefined
                    ? { pickupInstructions: dto.pickupInstructions }
                    : {})
                }
              : {}),
            ...(dto.toStatus === "OUT_FOR_DELIVERY"
              ? { deliveryStatus: "OUT_FOR_DELIVERY", dispatchedAt: now }
              : {}),
            ...(dto.toStatus === "DELIVERED"
              ? { deliveryStatus: "DELIVERED", deliveredAt: now }
              : {}),
            ...(dto.toStatus === "DELIVERY_FAILED"
              ? {
                  deliveryStatus: "FAILED",
                  failedReason:
                    dto.failedReason ?? "Delivery attempt failed or refused."
                }
              : {}),
            ...(dto.trackingNote !== undefined
              ? { trackingNote: dto.trackingNote }
              : {})
          }
        });

        if (dto.toStatus === "CANCELLED") {
          await this.restorePhysicalStock(order.items, tx);
          await tx.payment.updateMany({
            where: { orderId: order.id, status: "PENDING" },
            data: { status: "CANCELLED" }
          });
        }
      } else if (
        order.orderType === "SERVICE" &&
        order.serviceOrderDetails &&
        dto.toStatus === "DELIVERY_SUBMITTED"
      ) {
        await tx.serviceOrderDetails.update({
          where: { id: order.serviceOrderDetails.id },
          data: {
            deliverySummary: dto.deliverySummary ?? null,
            deliverySubmittedAt: now
          }
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: dto.toStatus,
          actorId: userId,
          actorRole: "SELLER",
          reason: dto.reason ?? dto.failedReason ?? null
        }
      });

      await this.notificationsService.notify(
        {
          userId: order.customerId,
          eventType: "ORDER_STATUS_UPDATED",
          titleKey: "notification.orderStatusUpdated",
          payloadJson: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: dto.toStatus
          }
        },
        tx
      );

      return tx.order.findFirst({
        where: { id: order.id },
        include: ORDER_WITH_DETAILS_INCLUDE
      });
    });

    return {
      data: toOrderDetailDto(updated!, { revealPickupInstructions: true }),
      meta: { requestId }
    };
  }

  async confirmCodCollection(
    userId: string,
    orderId: string,
    dto: CodCollectionRequest,
    idempotencyKey: string | undefined,
    requestId: string
  ) {
    const keyValue = this.idempotencyService.requireKey(idempotencyKey);
    const result = await this.idempotencyService.execute({
      userId,
      endpoint: `POST /api/v1/seller/orders/${orderId}/cod-collection`,
      keyValue,
      payload: dto,
      statusCode: HttpStatus.OK,
      run: async (tx) => {
        const { store } = await this.sellerService.requireOwnStore(userId);
        const order = await tx.order.findFirst({
          where: { id: orderId, storeId: store.id },
          include: {
            ...ORDER_WITH_DETAILS_INCLUDE,
            payments: true
          }
        });

        if (!order) {
          throw new DomainException(
            "NOT_FOUND",
            HttpStatus.NOT_FOUND,
            "Order not found."
          );
        }

        if (order.paymentMethod !== "COD") {
          throw new DomainException(
            "VALIDATION_ERROR",
            HttpStatus.BAD_REQUEST,
            "Use manual-payment-confirmation for REMOTE MANUAL_OFFLINE orders."
          );
        }

        this.assertPaymentNotAlreadyCollected(order);

        if (order.orderType === "PHYSICAL" && order.status !== "DELIVERED") {
          throw new DomainException(
            "INVALID_STATE_TRANSITION",
            HttpStatus.CONFLICT,
            "Physical order must reach DELIVERED before confirming COD collection."
          );
        }

        if (
          order.orderType === "SERVICE" &&
          order.status !== "DELIVERY_SUBMITTED"
        ) {
          throw new DomainException(
            "INVALID_STATE_TRANSITION",
            HttpStatus.CONFLICT,
            "On-site/hybrid service order must be DELIVERY_SUBMITTED before confirming COD collection."
          );
        }

        const expectedTotal = bigIntToSafeNumber(order.totalPaisa, "totalPaisa");
        if (
          dto.collectionStatus === "COLLECTED" &&
          dto.collectedAmountPaisa !== expectedTotal
        ) {
          throw new DomainException(
            "VALIDATION_ERROR",
            HttpStatus.BAD_REQUEST,
            `Collected amount (${String(dto.collectedAmountPaisa)}) must match order total (${String(expectedTotal)}).`
          );
        }

        const payment = order.payments[0];
        if (!payment) {
          throw new DomainException(
            "INTERNAL_SERVER_ERROR",
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Payment record missing for order."
          );
        }

        const collectedAt = dto.collectedAt ? new Date(dto.collectedAt) : new Date();

        if (dto.collectionStatus === "COLLECTED") {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "COLLECTED",
              confirmedById: userId,
              collectedAt,
              confirmationNote: dto.note ?? null
            }
          });

          await tx.paymentEvent.create({
            data: {
              paymentId: payment.id,
              eventType: "COD_COLLECTION_CONFIRMED",
              idempotencyKey: `${order.id}:${keyValue}`,
              rawPayloadJson: {
                verificationSource: "SELLER_REPORTED",
                collectedAmountPaisa: dto.collectedAmountPaisa,
                note: dto.note ?? null
              }
            }
          });

          const canCompleteNow =
            order.orderType === "PHYSICAL" ||
            order.serviceOrderDetails?.customerAcceptedAt !== null;

          const nextOrderStatus = canCompleteNow ? "COMPLETED" : order.status;

          await tx.order.update({
            where: { id: order.id },
            data: {
              codCollectionStatus: "COLLECTED",
              status: nextOrderStatus,
              ...(canCompleteNow ? { completedAt: collectedAt } : {})
            }
          });

          if (canCompleteNow) {
            await tx.orderStatusHistory.create({
              data: {
                orderId: order.id,
                fromStatus: order.status,
                toStatus: "COMPLETED",
                actorId: userId,
                actorRole: "SELLER",
                reason: "COD cash collection confirmed."
              }
            });

            await this.financeService.postCommissionAccrualIfEligible(
              {
                id: order.id,
                storeId: order.storeId,
                status: "COMPLETED",
                codCollectionStatus: "COLLECTED",
                subtotalPaisa: order.subtotalPaisa,
                discountPaisa: order.discountPaisa,
                totalPaisa: order.totalPaisa,
                commissionRuleId: order.commissionRuleId,
                commissionRateBps: order.commissionRateBps,
                commissionAmountPaisa: order.commissionAmountPaisa,
                sellerNetEntitlementPaisa: order.sellerNetEntitlementPaisa
              },
              userId,
              tx
            );
          }

          return {
            orderId: order.id,
            orderStatus: nextOrderStatus,
            deliveryStatus: order.delivery?.deliveryStatus ?? null,
            codCollectionStatus: "COLLECTED",
            paymentStatus: "COLLECTED",
            verificationSource: "SELLER_REPORTED"
          };
        }

        // FAILED_REFUSED path
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            confirmedById: userId,
            confirmationNote: dto.note ?? "Customer refused COD payment."
          }
        });

        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            eventType: "COD_COLLECTION_REFUSED",
            idempotencyKey: `${order.id}:${keyValue}`,
            rawPayloadJson: {
              verificationSource: "SELLER_REPORTED",
              note: dto.note ?? null
            }
          }
        });

        await tx.order.update({
          where: { id: order.id },
          data: { codCollectionStatus: "FAILED_REFUSED" }
        });

        return {
          orderId: order.id,
          orderStatus: order.status,
          deliveryStatus: order.delivery?.deliveryStatus ?? null,
          codCollectionStatus: "FAILED_REFUSED",
          paymentStatus: "FAILED",
          verificationSource: "SELLER_REPORTED"
        };
      }
    });

    return { data: result, meta: { requestId } };
  }

  /**
   * PQ-14: Seller-reported manual offline payment confirmation for REMOTE service orders.
   * Never marks delivery submitted or customer accepted automatically.
   */
  async confirmManualPayment(
    userId: string,
    orderId: string,
    dto: ManualPaymentConfirmationRequest,
    idempotencyKey: string | undefined,
    requestId: string
  ) {
    const keyValue = this.idempotencyService.requireKey(idempotencyKey);
    const result = await this.idempotencyService.execute({
      userId,
      endpoint: `POST /api/v1/seller/orders/${orderId}/manual-payment-confirmation`,
      keyValue,
      payload: dto,
      statusCode: HttpStatus.OK,
      run: async (tx) => {
        const { store } = await this.sellerService.requireOwnStore(userId);
        const order = await tx.order.findFirst({
          where: { id: orderId, storeId: store.id },
          include: {
            ...ORDER_WITH_DETAILS_INCLUDE,
            payments: true
          }
        });

        if (!order || order.orderType !== "SERVICE") {
          throw new DomainException(
            "NOT_FOUND",
            HttpStatus.NOT_FOUND,
            "Service order not found."
          );
        }

        if (order.paymentMethod !== "MANUAL_OFFLINE") {
          throw new DomainException(
            "VALIDATION_ERROR",
            HttpStatus.BAD_REQUEST,
            "Manual offline payment confirmation is only permitted for REMOTE services."
          );
        }

        if (order.status === "CANCELLED") {
          throw new DomainException(
            "INVALID_STATE_TRANSITION",
            HttpStatus.CONFLICT,
            "Cancelled orders cannot confirm payment."
          );
        }

        this.assertPaymentNotAlreadyCollected(order);

        const expectedTotal = bigIntToSafeNumber(order.totalPaisa, "totalPaisa");
        if (
          dto.collectionStatus === "COLLECTED" &&
          dto.collectedAmountPaisa !== expectedTotal
        ) {
          throw new DomainException(
            "VALIDATION_ERROR",
            HttpStatus.BAD_REQUEST,
            "Collected amount must match service order total."
          );
        }

        const payment = order.payments[0];
        if (!payment) {
          throw new DomainException(
            "INTERNAL_SERVER_ERROR",
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Payment record missing for service order."
          );
        }

        const collectedAt = dto.collectedAt ? new Date(dto.collectedAt) : new Date();

        if (dto.collectionStatus === "COLLECTED") {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "COLLECTED",
              manualPaymentMethodDesc: dto.manualPaymentMethodDesc,
              confirmationNote: dto.note ?? null,
              confirmedById: userId,
              collectedAt
            }
          });

          await tx.paymentEvent.create({
            data: {
              paymentId: payment.id,
              eventType: "MANUAL_OFFLINE_CONFIRMED",
              idempotencyKey: `${order.id}:${keyValue}`,
              rawPayloadJson: {
                verificationSource: "SELLER_REPORTED",
                manualPaymentMethodDesc: dto.manualPaymentMethodDesc,
                collectedAmountPaisa: dto.collectedAmountPaisa
              }
            }
          });

          const canCompleteNow =
            order.status === "DELIVERY_SUBMITTED" &&
            order.serviceOrderDetails?.customerAcceptedAt !== null;

          const nextOrderStatus = canCompleteNow ? "COMPLETED" : order.status;

          await tx.order.update({
            where: { id: order.id },
            data: {
              codCollectionStatus: "COLLECTED",
              status: nextOrderStatus,
              ...(canCompleteNow ? { completedAt: collectedAt } : {})
            }
          });

          if (canCompleteNow) {
            await tx.orderStatusHistory.create({
              data: {
                orderId: order.id,
                fromStatus: order.status,
                toStatus: "COMPLETED",
                actorId: userId,
                actorRole: "SELLER",
                reason: "Customer accepted delivery and manual offline payment confirmed."
              }
            });

            await this.financeService.postCommissionAccrualIfEligible(
              {
                id: order.id,
                storeId: order.storeId,
                status: "COMPLETED",
                codCollectionStatus: "COLLECTED",
                subtotalPaisa: order.subtotalPaisa,
                discountPaisa: order.discountPaisa,
                totalPaisa: order.totalPaisa,
                commissionRuleId: order.commissionRuleId,
                commissionRateBps: order.commissionRateBps,
                commissionAmountPaisa: order.commissionAmountPaisa,
                sellerNetEntitlementPaisa: order.sellerNetEntitlementPaisa
              },
              userId,
              tx
            );
          }

          return {
            orderId: order.id,
            orderStatus: nextOrderStatus,
            codCollectionStatus: "COLLECTED",
            paymentMethod: "MANUAL_OFFLINE",
            paymentStatus: "COLLECTED",
            verificationSource: "SELLER_REPORTED"
          };
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            manualPaymentMethodDesc: dto.manualPaymentMethodDesc,
            confirmationNote: dto.note ?? null,
            confirmedById: userId
          }
        });

        await tx.order.update({
          where: { id: order.id },
          data: { codCollectionStatus: "FAILED_REFUSED" }
        });

        return {
          orderId: order.id,
          orderStatus: order.status,
          codCollectionStatus: "FAILED_REFUSED",
          paymentMethod: "MANUAL_OFFLINE",
          paymentStatus: "FAILED",
          verificationSource: "SELLER_REPORTED"
        };
      }
    });

    return { data: result, meta: { requestId } };
  }

  /**
   * PQ-09: Order-scoped text-only REST messaging. Strict ownership + audited staff access + terminal freeze.
   */
  async listOrderMessages(
    auth: AuthContext,
    orderId: string,
    client: ClientMetadata,
    requestId: string
  ): Promise<{ data: OrderMessageDto[]; meta: { requestId: string } }> {
    const access = await this.resolveOrderMessageAccess(auth, orderId);

    const messages = await this.prisma.orderMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" }
    });

    if (access.isStaffAccess) {
      await this.auditService.record({
        actorId: auth.userId,
        actorRole: access.actorRole,
        action: "ORDER_MESSAGES_VIEWED",
        targetType: "Order",
        targetId: orderId,
        ipAddress: client.ipAddress,
        userAgent: client.userAgent
      });
    }

    return {
      data: messages.map(toOrderMessageDto),
      meta: { requestId }
    };
  }

  async postOrderMessage(
    auth: AuthContext,
    orderId: string,
    dto: CreateOrderMessageRequest,
    client: ClientMetadata,
    requestId: string
  ): Promise<{ data: OrderMessageDto; meta: { requestId: string } }> {
    const access = await this.resolveOrderMessageAccess(auth, orderId);

    const isTerminal =
      access.orderStatus === "COMPLETED" || access.orderStatus === "CANCELLED";
    if (isTerminal && !access.isStaffAccess) {
      throw new DomainException(
        "INVALID_STATE_TRANSITION",
        HttpStatus.CONFLICT,
        "Order messaging is frozen after terminal completion or cancellation."
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.orderMessage.create({
        data: {
          orderId,
          senderId: auth.userId,
          senderRole: access.actorRole,
          body: dto.body
        }
      });

      if (access.isStaffAccess) {
        await this.auditService.record(
          {
            actorId: auth.userId,
            actorRole: access.actorRole,
            action: "ORDER_MESSAGE_POSTED",
            targetType: "Order",
            targetId: orderId,
            ipAddress: client.ipAddress,
            userAgent: client.userAgent
          },
          tx
        );
      }

      return msg;
    });

    return {
      data: toOrderMessageDto(created),
      meta: { requestId }
    };
  }

  private async resolveOrderMessageAccess(
    auth: AuthContext,
    orderId: string
  ): Promise<{
    actorRole: string;
    isStaffAccess: boolean;
    orderStatus: string;
  }> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
      include: {
        store: {
          include: {
            sellerProfile: true
          }
        }
      }
    });
    if (!order) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Order not found."
      );
    }

    if (order.customerId === auth.userId) {
      return {
        actorRole: "CUSTOMER",
        isStaffAccess: false,
        orderStatus: order.status
      };
    }

    if (order.store.sellerProfile.userId === auth.userId) {
      return {
        actorRole: "SELLER",
        isStaffAccess: false,
        orderStatus: order.status
      };
    }

    const staffRole = auth.roles.find((r) => STAFF_ROLE_SET.has(r));
    if (staffRole) {
      if (!auth.mfaVerified) {
        throw new DomainException(
          "MFA_REQUIRED",
          HttpStatus.FORBIDDEN,
          "Staff MFA verification is required to access order messages."
        );
      }
      return {
        actorRole: staffRole,
        isStaffAccess: true,
        orderStatus: order.status
      };
    }

    throw new DomainException(
      "FORBIDDEN",
      HttpStatus.FORBIDDEN,
      "You are not a party to this order."
    );
  }

  private async restorePhysicalStock(
    items: Array<{
      productId: string;
      productVariantId: string | null;
      quantity: number;
    }>,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    for (const item of items) {
      if (item.productVariantId) {
        await tx.productVariant.updateMany({
          where: { id: item.productVariantId },
          data: { stockQuantity: { increment: item.quantity } }
        });
      } else {
        await tx.product.updateMany({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } }
        });
      }
    }
  }

  private async evaluatePhysicalCart(
    userId: string,
    storeId: string,
    fulfilmentMode: "SELLER_DELIVERY" | "CUSTOMER_PICKUP",
    addressId: string | undefined,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? this.prisma;

    const cart = await db.cart.findFirst({
      where: { customerId: userId, storeId },
      include: {
        store: {
          include: {
            district: true,
            sellerProfile: true,
            serviceAreas: true
          }
        },
        items: {
          include: {
            product: true,
            productVariant: true
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Your cart for this store is empty."
      );
    }

    if (
      cart.store.status !== "ACTIVE" ||
      cart.store.deletedAt !== null ||
      cart.store.sellerProfile.verificationStatus !== "APPROVED"
    ) {
      throw new DomainException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "This store is currently unavailable for checkout."
      );
    }

    if (cart.store.sellerProfile.userId === userId) {
      throw new DomainException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Self-dealing is not allowed."
      );
    }

    let address:
      | Awaited<ReturnType<CustomerService["requireOwnedAddress"]>>
      | undefined;
    let deliveryFeePaisa = 0n;

    if (fulfilmentMode === "SELLER_DELIVERY") {
      if (!addressId) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          "addressId is required for SELLER_DELIVERY."
        );
      }
      address = await this.customerService.requireOwnedAddress(userId, addressId);
      const serviceArea = cart.store.serviceAreas.find(
        (sa) =>
          sa.areaZoneId === address!.areaZoneId && sa.deliverySupported === true
      );
      if (
        address.districtId !== cart.store.districtId ||
        !serviceArea
      ) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          "Selected address is outside this store's Mianwali delivery coverage."
        );
      }
      deliveryFeePaisa =
        serviceArea.deliveryFeeOverridePaisa ?? cart.store.defaultDeliveryFeePaisa;
    }

    let subtotalPaisa = 0n;
    let itemCount = 0;

    for (const item of cart.items) {
      if (item.product.status !== "ACTIVE" || item.product.deletedAt !== null) {
        throw new DomainException(
          "CONFLICT",
          HttpStatus.CONFLICT,
          `Product "${item.product.title}" is no longer available.`
        );
      }
      if (fulfilmentMode === "SELLER_DELIVERY" && !item.product.deliveryEnabled) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          `Product "${item.product.title}" does not support delivery.`
        );
      }
      if (fulfilmentMode === "CUSTOMER_PICKUP" && !item.product.pickupEnabled) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          `Product "${item.product.title}" does not support customer pickup.`
        );
      }
      const stock = item.productVariant
        ? item.productVariant.stockQuantity
        : item.product.stockQuantity;
      if (item.quantity > stock) {
        throw new DomainException(
          "CONFLICT",
          HttpStatus.CONFLICT,
          `Insufficient stock for "${item.product.title}".`
        );
      }

      const unitPrice = item.productVariant
        ? item.productVariant.pricePaisa
        : item.product.basePricePaisa;
      subtotalPaisa += unitPrice * BigInt(item.quantity);
      itemCount += item.quantity;
    }

    return {
      cart,
      store: cart.store,
      address,
      subtotalPaisa,
      deliveryFeePaisa,
      itemCount
    };
  }

  private assertPaymentNotAlreadyCollected(order: {
    codCollectionStatus: string;
    payments: Array<{ status: string }>;
  }): void {
    if (
      order.codCollectionStatus === "COLLECTED" ||
      order.payments.some((payment) => payment.status === "COLLECTED")
    ) {
      throw new DomainException(
        "INVALID_STATE_TRANSITION",
        HttpStatus.CONFLICT,
        "Payment has already been confirmed as collected for this order."
      );
    }
  }
}
