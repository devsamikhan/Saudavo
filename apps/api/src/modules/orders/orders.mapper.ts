import { Prisma } from "@prisma/client";
import {
  BuyerCodStatsDto,
  OrderDetailDto,
  OrderDetailDtoSchema,
  OrderMessageDto,
  OrderMessageDtoSchema
} from "@saudavo/contracts";
import { bigIntToSafeNumber } from "../../common/money.util";

export const ORDER_WITH_DETAILS_INCLUDE = {
  items: true,
  serviceOrderDetails: true,
  delivery: true,
  statusHistory: {
    orderBy: { createdAt: "asc" }
  }
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: typeof ORDER_WITH_DETAILS_INCLUDE;
}>;

export function toOrderDetailDto(
  order: OrderWithDetails,
  options: {
    revealPickupInstructions: boolean;
    buyerCodStats?: BuyerCodStatsDto | null;
  }
): OrderDetailDto {
  const showPickup =
    options.revealPickupInstructions &&
    order.status !== "PENDING_CONFIRMATION" &&
    order.status !== "CANCELLED";

  return OrderDetailDtoSchema.parse({
    id: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    storeId: order.storeId,
    districtId: order.districtId,
    orderType: order.orderType,
    status: order.status,
    paymentMethod: order.paymentMethod,
    codCollectionStatus: order.codCollectionStatus,
    currency: order.currency,
    subtotalPaisa: bigIntToSafeNumber(order.subtotalPaisa, "subtotalPaisa"),
    deliveryFeePaisa: bigIntToSafeNumber(
      order.deliveryFeePaisa,
      "deliveryFeePaisa"
    ),
    discountPaisa: bigIntToSafeNumber(order.discountPaisa, "discountPaisa"),
    totalPaisa: bigIntToSafeNumber(order.totalPaisa, "totalPaisa"),
    commissionRateBps: order.commissionRateBps,
    commissionAmountPaisa: bigIntToSafeNumber(
      order.commissionAmountPaisa,
      "commissionAmountPaisa"
    ),
    sellerNetEntitlementPaisa: bigIntToSafeNumber(
      order.sellerNetEntitlementPaisa,
      "sellerNetEntitlementPaisa"
    ),
    customerNote: order.customerNote,
    cancelledReason: order.cancelledReason,
    completedAt: order.completedAt ? order.completedAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productVariantId: item.productVariantId,
      titleSnapshot: item.titleSnapshot,
      variantTitleSnapshot: item.variantTitleSnapshot,
      skuSnapshot: item.skuSnapshot,
      unitPricePaisa: bigIntToSafeNumber(item.unitPricePaisa, "unitPricePaisa"),
      quantity: item.quantity,
      lineTotalPaisa: bigIntToSafeNumber(item.lineTotalPaisa, "lineTotalPaisa"),
      currency: item.currency
    })),
    serviceOrderDetails: order.serviceOrderDetails
      ? {
          id: order.serviceOrderDetails.id,
          serviceListingId: order.serviceOrderDetails.serviceListingId,
          servicePackageId: order.serviceOrderDetails.servicePackageId,
          serviceModeSnapshot: order.serviceOrderDetails.serviceModeSnapshot,
          serviceTitleSnapshot: order.serviceOrderDetails.serviceTitleSnapshot,
          packageNameSnapshot: order.serviceOrderDetails.packageNameSnapshot,
          packagePricePaisa: bigIntToSafeNumber(
            order.serviceOrderDetails.packagePricePaisa,
            "packagePricePaisa"
          ),
          deliveryEstimateDaysSnapshot:
            order.serviceOrderDetails.deliveryEstimateDaysSnapshot,
          maxRevisionsSnapshot: order.serviceOrderDetails.maxRevisionsSnapshot,
          revisionsUsed: order.serviceOrderDetails.revisionsUsed,
          customerRequirements: order.serviceOrderDetails.customerRequirements,
          deliverySummary: order.serviceOrderDetails.deliverySummary,
          deliverySubmittedAt: order.serviceOrderDetails.deliverySubmittedAt
            ? order.serviceOrderDetails.deliverySubmittedAt.toISOString()
            : null,
          customerAcceptedAt: order.serviceOrderDetails.customerAcceptedAt
            ? order.serviceOrderDetails.customerAcceptedAt.toISOString()
            : null
        }
      : null,
    delivery: order.delivery
      ? {
          id: order.delivery.id,
          fulfilmentMode: order.delivery.fulfilmentMode,
          deliveryStatus: order.delivery.deliveryStatus,
          pickupInstructions: showPickup
            ? order.delivery.pickupInstructions
            : null,
          trackingNote: order.delivery.trackingNote,
          dispatchedAt: order.delivery.dispatchedAt
            ? order.delivery.dispatchedAt.toISOString()
            : null,
          deliveredAt: order.delivery.deliveredAt
            ? order.delivery.deliveredAt.toISOString()
            : null,
          failedReason: order.delivery.failedReason
        }
      : null,
    statusHistory: order.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      actorRole: h.actorRole,
      reason: h.reason,
      createdAt: h.createdAt.toISOString()
    })),
    ...(options.buyerCodStats !== undefined
      ? { buyerCodStats: options.buyerCodStats }
      : {})
  });
}

export function toOrderMessageDto(msg: {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: string;
  body: string;
  createdAt: Date;
}): OrderMessageDto {
  return OrderMessageDtoSchema.parse({
    id: msg.id,
    orderId: msg.orderId,
    senderId: msg.senderId,
    senderRole: msg.senderRole,
    body: msg.body,
    createdAt: msg.createdAt.toISOString()
  });
}
