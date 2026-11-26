import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  AcceptCustomOfferRequest,
  ChatMessageDto,
  ChatMessageDtoSchema,
  ConversationSummaryDto,
  ConversationSummaryDtoSchema,
  OrderCreatedSummary,
  OrderCreatedSummarySchema,
  SendChatMessageRequest,
  SendCustomOfferRequest,
  StartConversationRequest
} from "@saudavo/contracts";
import { DomainException } from "../../common/errors/domain.exception";
import { IdempotencyService } from "../../common/idempotency/idempotency.service";
import { bigIntToSafeNumber } from "../../common/money.util";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CustomerService } from "../customer/customer.service";
import { FeatureFlagsService } from "../features/feature-flags.service";
import { FinanceService } from "../finance/finance.service";
import { S3PresignerService } from "../media/s3-presigner.service";
import { NotificationsService } from "../notifications/notifications.service";
import { generateOrderNumber } from "../orders/order-state-machine";
import { OutboxService } from "../outbox/outbox.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";

const OFFER_EXPIRY_MS = 24 * 60 * 60 * 1000;
const CHAT_IMAGE_URL_TTL_SECONDS = 600;

@Injectable()
export class MessengerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotencyService: IdempotencyService,
    private readonly customerService: CustomerService,
    private readonly financeService: FinanceService,
    private readonly s3Presigner: S3PresignerService,
    private readonly notificationsService: NotificationsService,
    private readonly outboxService: OutboxService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly featureFlags: FeatureFlagsService
  ) {}

  async startConversation(
    userId: string,
    dto: StartConversationRequest,
    requestId: string
  ): Promise<{ data: ConversationSummaryDto; meta: { requestId: string } }> {
    await this.featureFlags.assertEnabled(
      "shopping_messenger_enabled",
      "Saudavo Shopping Messenger"
    );
    const store = await this.prisma.store.findFirst({
      where: {
        id: dto.storeId,
        status: "ACTIVE",
        deletedAt: null,
        sellerProfile: { verificationStatus: "APPROVED" }
      },
      include: {
        district: true,
        sellerProfile: true
      }
    });
    if (!store) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Active verified store not found."
      );
    }

    if (store.sellerProfile.userId === userId) {
      throw new DomainException(
        "CONFLICT",
        HttpStatus.CONFLICT,
        "Sellers cannot start a buyer chat with their own store."
      );
    }

    let validProductTitle: string | null = null;
    let validServiceTitle: string | null = null;

    if (dto.productId) {
      const product = await this.prisma.product.findFirst({
        where: {
          id: dto.productId,
          storeId: store.id,
          status: "ACTIVE",
          deletedAt: null
        }
      });
      if (!product) {
        throw new DomainException(
          "NOT_FOUND",
          HttpStatus.NOT_FOUND,
          "Active product not found in this store."
        );
      }
      validProductTitle = product.title;
    }

    if (dto.serviceListingId) {
      const svc = await this.prisma.serviceListing.findFirst({
        where: {
          id: dto.serviceListingId,
          storeId: store.id,
          status: "ACTIVE",
          deletedAt: null
        }
      });
      if (!svc) {
        throw new DomainException(
          "NOT_FOUND",
          HttpStatus.NOT_FOUND,
          "Active service listing not found in this store."
        );
      }
      validServiceTitle = svc.title;
    }

    const now = new Date();
    const conv = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.conversation.findUnique({
        where: {
          buyerId_storeId: {
            buyerId: userId,
            storeId: store.id
          }
        }
      });

      const conversation = existing
        ? await tx.conversation.update({
            where: { id: existing.id },
            data: {
              ...(dto.productId ? { productId: dto.productId } : {}),
              ...(dto.serviceListingId
                ? { serviceListingId: dto.serviceListingId }
                : {}),
              buyerLastReadAt: now,
              ...(dto.initialMessage || dto.productId || dto.serviceListingId
                ? { lastMessageAt: now }
                : {})
            }
          })
        : await tx.conversation.create({
            data: {
              buyerId: userId,
              storeId: store.id,
              productId: dto.productId ?? null,
              serviceListingId: dto.serviceListingId ?? null,
              status: "OPEN",
              lastMessageAt: now,
              buyerLastReadAt: now
            }
          });

      const defaultInquiry = validProductTitle
        ? `Interested in product: ${validProductTitle}`
        : validServiceTitle
          ? `Interested in service: ${validServiceTitle}`
          : null;
      const bodyToSave = dto.initialMessage?.trim() || defaultInquiry;

      if (bodyToSave) {
        await tx.chatMessage.create({
          data: {
            conversationId: conversation.id,
            senderId: userId,
            senderRole: "BUYER",
            messageType:
              dto.productId || dto.serviceListingId ? "PRODUCT_INQUIRY" : "TEXT",
            body: bodyToSave,
            productId: dto.productId ?? null,
            serviceListingId: dto.serviceListingId ?? null
          }
        });

        await this.notificationsService.notify(
          {
            userId: store.sellerProfile.userId,
            eventType: "CHAT_MESSAGE_RECEIVED",
            titleKey: "notification.chatMessage",
            payloadJson: {
              conversationId: conversation.id,
              storeName: store.displayName
            }
          },
          tx
        );
      }

      return conversation;
    });

    const summary = await this.buildConversationSummary(conv.id, userId);
    return { data: summary, meta: { requestId } };
  }

  async listConversations(
    userId: string,
    requestId: string
  ): Promise<{ data: ConversationSummaryDto[]; meta: { requestId: string } }> {
    const rows = await this.prisma.conversation.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { store: { sellerProfile: { userId } } }
        ]
      },
      include: {
        buyer: {
          select: { id: true, displayName: true }
        },
        store: {
          include: {
            district: true,
            sellerProfile: { select: { userId: true } }
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { lastMessageAt: "desc" },
      take: 60
    });

    const summaries: ConversationSummaryDto[] = [];
    for (const row of rows) {
      const roleView = row.buyerId === userId ? "BUYER" : "SELLER";
      const lastReadAt =
        roleView === "BUYER" ? row.buyerLastReadAt : row.sellerLastReadAt;

      const unreadCount = await this.prisma.chatMessage.count({
        where: {
          conversationId: row.id,
          senderId: { not: userId },
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {})
        }
      });

      const storeVerifiedPro = await this.subscriptionsService.isStoreProVerified(
        row.storeId
      );
      const buyerCodStats =
        roleView === "SELLER"
          ? await this.loadSingleBuyerCodStats(row.buyerId)
          : null;

      const lastMsg = row.messages[0];
      const lastMessagePreview = lastMsg
        ? lastMsg.messageType === "CUSTOM_OFFER"
          ? `Offer: ${lastMsg.offerTitle ?? "Custom Deal"}`
          : lastMsg.messageType === "IMAGE" && !lastMsg.body.trim()
            ? "Photo attachment"
            : lastMsg.body.slice(0, 120)
        : "Conversation started";

      summaries.push(
        ConversationSummaryDtoSchema.parse({
          id: row.id,
          roleView,
          buyerId: row.buyer.id,
          buyerDisplayName: row.buyer.displayName,
          buyerCodStats,
          storeId: row.store.id,
          storeSlug: row.store.slug,
          storeDisplayName: row.store.displayName,
          storeDistrictNameEn: row.store.district.nameEn,
          storeVerifiedPro,
          status: row.status,
          unreadCount,
          lastMessagePreview,
          lastMessageAt: row.lastMessageAt.toISOString(),
          createdAt: row.createdAt.toISOString()
        })
      );
    }

    return { data: summaries, meta: { requestId } };
  }

  async getUnreadCount(
    userId: string,
    requestId: string
  ): Promise<{ data: { unreadCount: number }; meta: { requestId: string } }> {
    if (!(await this.featureFlags.isEnabled("shopping_messenger_enabled"))) {
      return { data: { unreadCount: 0 }, meta: { requestId } };
    }
    const convs = await this.prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: userId }, { store: { sellerProfile: { userId } } }]
      },
      select: {
        id: true,
        buyerId: true,
        buyerLastReadAt: true,
        sellerLastReadAt: true
      }
    });

    let total = 0;
    for (const c of convs) {
      const lastReadAt = c.buyerId === userId ? c.buyerLastReadAt : c.sellerLastReadAt;
      total += await this.prisma.chatMessage.count({
        where: {
          conversationId: c.id,
          senderId: { not: userId },
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {})
        }
      });
    }

    return { data: { unreadCount: total }, meta: { requestId } };
  }

  async listMessages(
    userId: string,
    conversationId: string,
    requestId: string
  ): Promise<{ data: ChatMessageDto[]; meta: { requestId: string } }> {
    const access = await this.requireParticipantAccess(userId, conversationId);
    const now = new Date();

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data:
        access.role === "BUYER"
          ? { buyerLastReadAt: now }
          : { sellerLastReadAt: now }
    });

    const rows = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      include: {
        product: true,
        serviceListing: true,
        mediaAsset: true
      },
      orderBy: { createdAt: "asc" },
      take: 200
    });

    return {
      data: rows.map((row) => this.toMessageDto(row)),
      meta: { requestId }
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    dto: SendChatMessageRequest,
    requestId: string
  ): Promise<{ data: ChatMessageDto; meta: { requestId: string } }> {
    await this.featureFlags.assertEnabled(
      "shopping_messenger_enabled",
      "Saudavo Shopping Messenger"
    );
    const access = await this.requireParticipantAccess(userId, conversationId);

    let attachedMimeType: string | null = null;
    if (dto.mediaAssetId) {
      const asset = await this.prisma.mediaAsset.findFirst({
        where: {
          id: dto.mediaAssetId,
          ownerUserId: userId,
          status: "READY",
          exifStripped: true
        }
      });
      if (!asset) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          "Chat attachment must be a READY media asset you uploaded."
        );
      }
      attachedMimeType = asset.mimeType;
      if (asset.mimeType.startsWith("audio/")) {
        await this.featureFlags.assertEnabled(
          "messenger_voice_notes_enabled",
          "Urdu Voice Notes in Messenger"
        );
      }
    }

    if (dto.productId) {
      const product = await this.prisma.product.findFirst({
        where: {
          id: dto.productId,
          storeId: access.conversation.storeId,
          status: "ACTIVE",
          deletedAt: null
        }
      });
      if (!product) {
        throw new DomainException(
          "NOT_FOUND",
          HttpStatus.NOT_FOUND,
          "Active product not found in this store."
        );
      }
    }

    if (dto.serviceListingId) {
      const svc = await this.prisma.serviceListing.findFirst({
        where: {
          id: dto.serviceListingId,
          storeId: access.conversation.storeId,
          status: "ACTIVE",
          deletedAt: null
        }
      });
      if (!svc) {
        throw new DomainException(
          "NOT_FOUND",
          HttpStatus.NOT_FOUND,
          "Active service listing not found in this store."
        );
      }
    }

    const isVoiceNote =
      Boolean(attachedMimeType?.startsWith("audio/")) ||
      dto.voiceDurationSec !== undefined;
    const messageType = isVoiceNote
      ? "VOICE_NOTE"
      : dto.mediaAssetId
        ? "IMAGE"
        : dto.productId || dto.serviceListingId
          ? "PRODUCT_INQUIRY"
          : "TEXT";
    const now = new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.chatMessage.create({
        data: {
          conversationId,
          senderId: userId,
          senderRole: access.role,
          messageType,
          body: dto.body.trim() || (isVoiceNote ? "Voice note" : ""),
          productId: dto.productId ?? null,
          serviceListingId: dto.serviceListingId ?? null,
          mediaAssetId: dto.mediaAssetId ?? null,
          voiceDurationSec: isVoiceNote ? (dto.voiceDurationSec ?? 1) : null
        },
        include: {
          product: true,
          serviceListing: true,
          mediaAsset: true
        }
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: now,
          ...(access.role === "BUYER"
            ? { buyerLastReadAt: now }
            : { sellerLastReadAt: now })
        }
      });

      await this.notificationsService.notify(
        {
          userId: access.recipientUserId,
          eventType: "CHAT_MESSAGE_RECEIVED",
          titleKey: "notification.chatMessage",
          payloadJson: {
            conversationId,
            storeName: access.conversation.store.displayName
          }
        },
        tx
      );

      return msg;
    });

    return {
      data: this.toMessageDto(created),
      meta: { requestId }
    };
  }

  async sendCustomOffer(
    userId: string,
    conversationId: string,
    dto: SendCustomOfferRequest,
    requestId: string
  ): Promise<{ data: ChatMessageDto; meta: { requestId: string } }> {
    const access = await this.requireParticipantAccess(userId, conversationId);
    if (access.role !== "SELLER") {
      throw new DomainException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Only the store seller can send custom price offers."
      );
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        storeId: access.conversation.storeId,
        status: "ACTIVE",
        deletedAt: null
      }
    });
    if (!product) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Active product not found in your store."
      );
    }
    if (product.stockQuantity < dto.quantity) {
      throw new DomainException(
        "CONFLICT",
        HttpStatus.CONFLICT,
        `Insufficient stock (${String(product.stockQuantity)} left) for this offer.`
      );
    }
    if (dto.fulfilmentMode === "SELLER_DELIVERY" && !product.deliveryEnabled) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "This product does not support seller delivery."
      );
    }
    if (dto.fulfilmentMode === "CUSTOMER_PICKUP" && !product.pickupEnabled) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "This product does not support customer pickup."
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + OFFER_EXPIRY_MS);
    const created = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.chatMessage.create({
        data: {
          conversationId,
          senderId: userId,
          senderRole: "SELLER",
          messageType: "CUSTOM_OFFER",
          body: dto.note?.trim() || `Custom COD deal for ${product.title}`,
          productId: product.id,
          offerTitle: product.title,
          offerQuantity: dto.quantity,
          offerUnitPricePaisa: BigInt(dto.unitPricePaisa),
          offerDeliveryFeePaisa: BigInt(dto.deliveryFeePaisa),
          offerFulfilmentMode: dto.fulfilmentMode,
          offerStatus: "PENDING",
          offerExpiresAt: expiresAt
        },
        include: {
          product: true,
          serviceListing: true,
          mediaAsset: true
        }
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: now,
          sellerLastReadAt: now
        }
      });

      await this.notificationsService.notify(
        {
          userId: access.recipientUserId,
          eventType: "CHAT_OFFER_RECEIVED",
          titleKey: "notification.chatOffer",
          payloadJson: {
            conversationId,
            storeName: access.conversation.store.displayName,
            offerTitle: product.title
          }
        },
        tx
      );

      return msg;
    });

    return {
      data: this.toMessageDto(created),
      meta: { requestId }
    };
  }

  async acceptCustomOffer(
    userId: string,
    conversationId: string,
    messageId: string,
    dto: AcceptCustomOfferRequest,
    idempotencyKey: string | undefined,
    requestId: string
  ): Promise<{ data: OrderCreatedSummary; meta: { requestId: string } }> {
    await this.featureFlags.assertEnabled(
      "shopping_messenger_enabled",
      "Saudavo Shopping Messenger"
    );
    const summary = await this.idempotencyService.execute<OrderCreatedSummary>({
      userId,
      endpoint: `POST /api/v1/messenger/conversations/${conversationId}/offers/${messageId}/accept`,
      keyValue: idempotencyKey,
      payload: dto,
      statusCode: HttpStatus.CREATED,
      run: async (tx) => {
        const access = await this.requireParticipantAccess(
          userId,
          conversationId,
          tx
        );
        if (access.role !== "BUYER") {
          throw new DomainException(
            "FORBIDDEN",
            HttpStatus.FORBIDDEN,
            "Only the buyer can accept a custom offer."
          );
        }

        const offerMsg = await tx.chatMessage.findFirst({
          where: {
            id: messageId,
            conversationId,
            messageType: "CUSTOM_OFFER"
          }
        });
        if (
          !offerMsg ||
          !offerMsg.productId ||
          offerMsg.offerQuantity === null ||
          offerMsg.offerUnitPricePaisa === null ||
          offerMsg.offerDeliveryFeePaisa === null ||
          !offerMsg.offerFulfilmentMode
        ) {
          throw new DomainException(
            "NOT_FOUND",
            HttpStatus.NOT_FOUND,
            "Custom offer message not found."
          );
        }

        if (offerMsg.offerStatus !== "PENDING") {
          throw new DomainException(
            "CONFLICT",
            HttpStatus.CONFLICT,
            `This offer is already ${String(offerMsg.offerStatus)}.`
          );
        }

        const now = new Date();
        if (
          offerMsg.offerExpiresAt &&
          offerMsg.offerExpiresAt.getTime() <= now.getTime()
        ) {
          await tx.chatMessage.update({
            where: { id: offerMsg.id },
            data: { offerStatus: "EXPIRED" }
          });
          throw new DomainException(
            "CONFLICT",
            HttpStatus.CONFLICT,
            "This custom offer has expired."
          );
        }

        const store = access.conversation.store;
        if (
          store.status !== "ACTIVE" ||
          store.deletedAt !== null ||
          store.sellerProfile.verificationStatus !== "APPROVED"
        ) {
          throw new DomainException(
            "FORBIDDEN",
            HttpStatus.FORBIDDEN,
            "This store is currently unavailable for orders."
          );
        }

        let address:
          | Awaited<ReturnType<CustomerService["requireOwnedAddress"]>>
          | undefined;
        if (offerMsg.offerFulfilmentMode === "SELLER_DELIVERY") {
          if (!dto.addressId) {
            throw new DomainException(
              "VALIDATION_ERROR",
              HttpStatus.BAD_REQUEST,
              "Select a Mianwali delivery address to accept a delivery offer."
            );
          }
          address = await this.customerService.requireOwnedAddress(
            userId,
            dto.addressId
          );
          const serviceArea = store.serviceAreas.find(
            (sa) =>
              sa.areaZoneId === address!.areaZoneId &&
              sa.deliverySupported === true
          );
          if (address.districtId !== store.districtId || !serviceArea) {
            throw new DomainException(
              "VALIDATION_ERROR",
              HttpStatus.BAD_REQUEST,
              "Selected address is outside this store's Mianwali delivery coverage."
            );
          }
        }

        const dec = await tx.product.updateMany({
          where: {
            id: offerMsg.productId,
            deletedAt: null,
            status: "ACTIVE",
            stockQuantity: { gte: offerMsg.offerQuantity }
          },
          data: {
            stockQuantity: { decrement: offerMsg.offerQuantity }
          }
        });
        if (dec.count === 0) {
          throw new DomainException(
            "CONFLICT",
            HttpStatus.CONFLICT,
            "Insufficient stock to fulfill this custom offer."
          );
        }

        const unitPrice = offerMsg.offerUnitPricePaisa;
        const subtotalPaisa = unitPrice * BigInt(offerMsg.offerQuantity);
        const deliveryFeePaisa = offerMsg.offerDeliveryFeePaisa;

        const rule = await this.financeService.resolveApplicableRule(
          "PHYSICAL",
          tx
        );
        const financials = this.financeService.calculateOrderFinancials({
          subtotalPaisa,
          deliveryFeePaisa,
          discountPaisa: 0n,
          commissionRuleId: rule.id,
          rateBps: rule.rateBps
        });

        const orderNumber = generateOrderNumber(store.district.code);
        const order = await tx.order.create({
          data: {
            orderNumber,
            customerId: userId,
            storeId: store.id,
            districtId: store.districtId,
            orderType: "PHYSICAL",
            status: "CONFIRMED",
            paymentMethod: "COD",
            codCollectionStatus: "PENDING_COLLECTION",
            currency: "PKR",
            subtotalPaisa,
            deliveryFeePaisa,
            discountPaisa: 0n,
            totalPaisa: financials.totalPaisa,
            commissionRuleId: financials.commissionRuleId,
            commissionRateBps: financials.commissionRateBps,
            commissionAmountPaisa: financials.commissionAmountPaisa,
            sellerNetEntitlementPaisa: financials.sellerNetEntitlementPaisa,
            customerNote: dto.customerNote?.trim() || null
          }
        });

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: offerMsg.productId,
            productVariantId: null,
            titleSnapshot: offerMsg.offerTitle ?? "Custom Offer Item",
            variantTitleSnapshot: "Agreed Messenger Deal",
            skuSnapshot: null,
            unitPricePaisa: unitPrice,
            quantity: offerMsg.offerQuantity,
            lineTotalPaisa: subtotalPaisa,
            currency: "PKR"
          }
        });

        await tx.delivery.create({
          data: {
            orderId: order.id,
            fulfilmentMode: offerMsg.offerFulfilmentMode,
            deliveryStatus: "NOT_STARTED",
            areaZoneId: address?.areaZoneId ?? null,
            ...(address
              ? {
                  shippingAddressSnapshotJson: {
                    recipientName: address.recipientName,
                    recipientPhone: address.recipientPhone,
                    streetAddress: address.streetAddress,
                    landmark: address.landmark,
                    districtName: address.district.nameEn,
                    areaZoneName: address.areaZone?.nameEn ?? null
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

        await tx.orderStatusHistory.createMany({
          data: [
            {
              orderId: order.id,
              fromStatus: null,
              toStatus: "PENDING_CONFIRMATION",
              actorId: userId,
              actorRole: "CUSTOMER",
              reason: "Buyer accepted seller custom offer inside Saudavo Messenger."
            },
            {
              orderId: order.id,
              fromStatus: "PENDING_CONFIRMATION",
              toStatus: "CONFIRMED",
              actorId: store.sellerProfile.userId,
              actorRole: "SELLER",
              reason: "Pre-confirmed via seller custom offer in Saudavo Messenger."
            }
          ]
        });

        const offerClaimed = await tx.chatMessage.updateMany({
          where: { id: offerMsg.id, offerStatus: "PENDING" },
          data: {
            offerStatus: "ACCEPTED",
            offerOrderId: order.id
          }
        });
        if (offerClaimed.count !== 1) {
          throw new DomainException(
            "CONFLICT",
            HttpStatus.CONFLICT,
            "Offer was already accepted or declined."
          );
        }

        await tx.chatMessage.create({
          data: {
            conversationId,
            senderId: userId,
            senderRole: "BUYER",
            messageType: "SYSTEM",
            body: `COD Order #${order.orderNumber} placed via custom offer.`,
            offerOrderId: order.id
          }
        });

        await tx.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: now,
            buyerLastReadAt: now
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
              orderType: "PHYSICAL"
            }
          },
          tx
        );

        await this.notificationsService.notify(
          {
            userId: store.sellerProfile.userId,
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

  async declineCustomOffer(
    userId: string,
    conversationId: string,
    messageId: string,
    requestId: string
  ): Promise<{ data: ChatMessageDto; meta: { requestId: string } }> {
    await this.requireParticipantAccess(userId, conversationId);

    const existing = await this.prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        conversationId,
        messageType: "CUSTOM_OFFER"
      }
    });
    if (!existing) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Custom offer not found."
      );
    }
    if (existing.offerStatus !== "PENDING") {
      throw new DomainException(
        "CONFLICT",
        HttpStatus.CONFLICT,
        `Cannot decline offer in ${String(existing.offerStatus)} state.`
      );
    }

    const updated = await this.prisma.chatMessage.update({
      where: { id: existing.id },
      data: { offerStatus: "DECLINED" },
      include: {
        product: true,
        serviceListing: true,
        mediaAsset: true
      }
    });

    return {
      data: this.toMessageDto(updated),
      meta: { requestId }
    };
  }

  private async buildConversationSummary(
    conversationId: string,
    viewerUserId: string
  ): Promise<ConversationSummaryDto> {
    const row = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        buyer: { select: { id: true, displayName: true } },
        store: {
          include: {
            district: true,
            sellerProfile: { select: { userId: true } }
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });
    if (!row) {
      throw new DomainException("NOT_FOUND", HttpStatus.NOT_FOUND, "Conversation not found.");
    }

    const roleView = row.buyerId === viewerUserId ? "BUYER" : "SELLER";
    const lastReadAt =
      roleView === "BUYER" ? row.buyerLastReadAt : row.sellerLastReadAt;
    const unreadCount = await this.prisma.chatMessage.count({
      where: {
        conversationId: row.id,
        senderId: { not: viewerUserId },
        ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {})
      }
    });

    const storeVerifiedPro = await this.subscriptionsService.isStoreProVerified(
      row.storeId
    );
    const buyerCodStats =
      roleView === "SELLER" ? await this.loadSingleBuyerCodStats(row.buyerId) : null;
    const lastMsg = row.messages[0];

    return ConversationSummaryDtoSchema.parse({
      id: row.id,
      roleView,
      buyerId: row.buyer.id,
      buyerDisplayName: row.buyer.displayName,
      buyerCodStats,
      storeId: row.store.id,
      storeSlug: row.store.slug,
      storeDisplayName: row.store.displayName,
      storeDistrictNameEn: row.store.district.nameEn,
      storeVerifiedPro,
      status: row.status,
      unreadCount,
      lastMessagePreview: lastMsg
        ? lastMsg.body.slice(0, 120)
        : "Conversation started",
      lastMessageAt: row.lastMessageAt.toISOString(),
      createdAt: row.createdAt.toISOString()
    });
  }

  private async requireParticipantAccess(
    userId: string,
    conversationId: string,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx ?? this.prisma;
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        store: {
          include: {
            district: true,
            sellerProfile: true,
            serviceAreas: true
          }
        }
      }
    });
    if (!conversation) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Conversation not found."
      );
    }

    if (conversation.buyerId === userId) {
      return {
        role: "BUYER" as const,
        recipientUserId: conversation.store.sellerProfile.userId,
        conversation
      };
    }

    if (conversation.store.sellerProfile.userId === userId) {
      return {
        role: "SELLER" as const,
        recipientUserId: conversation.buyerId,
        conversation
      };
    }

    throw new DomainException(
      "FORBIDDEN",
      HttpStatus.FORBIDDEN,
      "You are not a participant in this conversation."
    );
  }

  private async loadSingleBuyerCodStats(
    buyerId: string
  ): Promise<{ completedCodCount: number; refusedCodCount: number }> {
    const grouped = await this.prisma.order.groupBy({
      by: ["codCollectionStatus"],
      where: {
        customerId: { in: [buyerId] },
        paymentMethod: "COD"
      },
      _count: { _all: true }
    });
    let completedCodCount = 0;
    let refusedCodCount = 0;
    for (const row of grouped) {
      if (row.codCollectionStatus === "COLLECTED") {
        completedCodCount += row._count._all;
      } else if (row.codCollectionStatus === "FAILED_REFUSED") {
        refusedCodCount += row._count._all;
      }
    }
    return { completedCodCount, refusedCodCount };
  }

  private toMessageDto(msg: {
    id: string;
    conversationId: string;
    senderId: string;
    senderRole: string;
    messageType: string;
    body: string;
    mediaAssetId: string | null;
    offerTitle: string | null;
    offerQuantity: number | null;
    offerUnitPricePaisa: bigint | null;
    offerDeliveryFeePaisa: bigint | null;
    offerFulfilmentMode: string | null;
    offerStatus: string | null;
    offerOrderId: string | null;
    offerExpiresAt: Date | null;
    voiceDurationSec?: number | null;
    createdAt: Date;
    product: {
      id: string;
      slug: string;
      title: string;
      basePricePaisa: bigint;
      currency: string;
      stockQuantity: number;
    } | null;
    serviceListing: {
      id: string;
      slug: string;
      title: string;
      serviceMode: string;
    } | null;
    mediaAsset: {
      id: string;
      objectKey: string;
      status: string;
    } | null;
  }): ChatMessageDto {
    const unitNum =
      msg.offerUnitPricePaisa !== null
        ? bigIntToSafeNumber(msg.offerUnitPricePaisa, "offerUnitPricePaisa")
        : null;
    const deliveryNum =
      msg.offerDeliveryFeePaisa !== null
        ? bigIntToSafeNumber(msg.offerDeliveryFeePaisa, "offerDeliveryFeePaisa")
        : null;
    const offerTotalPaisa =
      unitNum !== null && msg.offerQuantity !== null && deliveryNum !== null
        ? unitNum * msg.offerQuantity + deliveryNum
        : null;

    const signedMediaUrl =
      msg.mediaAsset && msg.mediaAsset.status === "READY"
        ? this.s3Presigner.createPresignedUrl({
            method: "GET",
            objectKey: msg.mediaAsset.objectKey,
            expiresInSeconds: CHAT_IMAGE_URL_TTL_SECONDS
          })
        : null;
    const isVoiceNote = msg.messageType === "VOICE_NOTE";

    return ChatMessageDtoSchema.parse({
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderRole: msg.senderRole,
      messageType: msg.messageType,
      body: msg.body,
      productSummary: msg.product
        ? {
            id: msg.product.id,
            slug: msg.product.slug,
            title: msg.product.title,
            basePricePaisa: bigIntToSafeNumber(
              msg.product.basePricePaisa,
              "basePricePaisa"
            ),
            currency: msg.product.currency,
            stockQuantity: msg.product.stockQuantity
          }
        : null,
      serviceSummary: msg.serviceListing
        ? {
            id: msg.serviceListing.id,
            slug: msg.serviceListing.slug,
            title: msg.serviceListing.title,
            serviceMode: msg.serviceListing.serviceMode
          }
        : null,
      mediaAssetId: msg.mediaAssetId,
      imageReadUrl: isVoiceNote ? null : signedMediaUrl,
      voiceDurationSec: msg.voiceDurationSec ?? null,
      voiceReadUrl: isVoiceNote ? signedMediaUrl : null,
      offerTitle: msg.offerTitle,
      offerQuantity: msg.offerQuantity,
      offerUnitPricePaisa: unitNum,
      offerDeliveryFeePaisa: deliveryNum,
      offerTotalPaisa,
      offerFulfilmentMode: msg.offerFulfilmentMode,
      offerStatus: msg.offerStatus,
      offerOrderId: msg.offerOrderId,
      offerExpiresAt: msg.offerExpiresAt ? msg.offerExpiresAt.toISOString() : null,
      createdAt: msg.createdAt.toISOString()
    });
  }

  /**
   * Opens or reuses a buyer-store conversation when a verified seller replies to a local BuyerRequest.
   */
  async startSellerInitiatedConversation(
    sellerUserId: string,
    buyerId: string,
    storeId: string,
    initialBody: string,
    refs: { productId?: string; serviceListingId?: string },
    _requestId: string
  ): Promise<ConversationSummaryDto> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { district: true }
    });
    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { id: true, displayName: true }
    });
    if (!store || !buyer) {
      throw new DomainException("NOT_FOUND", HttpStatus.NOT_FOUND, "Store or buyer not found.");
    }

    const now = new Date();
    const conv = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.conversation.findUnique({
        where: { buyerId_storeId: { buyerId, storeId } }
      });

      const conversation = existing
        ? await tx.conversation.update({
            where: { id: existing.id },
            data: { lastMessageAt: now, sellerLastReadAt: now }
          })
        : await tx.conversation.create({
            data: {
              buyerId,
              storeId,
              productId: refs.productId ?? null,
              serviceListingId: refs.serviceListingId ?? null,
              status: "OPEN",
              lastMessageAt: now,
              sellerLastReadAt: now
            }
          });

      await tx.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: sellerUserId,
          senderRole: "SELLER",
          messageType: refs.productId || refs.serviceListingId ? "PRODUCT_INQUIRY" : "TEXT",
          body: initialBody,
          productId: refs.productId ?? null,
          serviceListingId: refs.serviceListingId ?? null
        }
      });

      return conversation;
    });

    const storeVerifiedPro = await this.subscriptionsService.isStoreProVerified(store.id);
    return ConversationSummaryDtoSchema.parse({
      id: conv.id,
      roleView: "SELLER",
      buyerId: buyer.id,
      buyerDisplayName: buyer.displayName,
      storeId: store.id,
      storeSlug: store.slug,
      storeDisplayName: store.displayName,
      storeDistrictNameEn: store.district.nameEn,
      storeVerifiedPro,
      status: conv.status,
      unreadCount: 0,
      lastMessagePreview: initialBody,
      lastMessageAt: conv.lastMessageAt.toISOString(),
      createdAt: conv.createdAt.toISOString()
    });
  }
}
