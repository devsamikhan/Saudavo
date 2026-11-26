import { z } from "zod";
import {
  CodCollectionStatusSchema,
  CurrencyCodeSchema,
  DeliveryStatusSchema,
  FulfilmentModeSchema,
  OrderTypeSchema,
  PaymentMethodSchema,
  ServiceModeSchema
} from "./enums";

export const AddCartItemRequestSchema = z.object({
  productId: z.string().uuid(),
  productVariantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1).max(100)
});
export type AddCartItemRequest = z.infer<typeof AddCartItemRequestSchema>;

export const UpdateCartItemRequestSchema = z.object({
  quantity: z.number().int().min(1).max(100)
});
export type UpdateCartItemRequest = z.infer<typeof UpdateCartItemRequestSchema>;

export const CartItemDtoSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productVariantId: z.string().uuid().nullable(),
  productTitle: z.string(),
  productSlug: z.string(),
  variantTitle: z.string().nullable(),
  unitPricePaisa: z.number().int().positive(),
  lineTotalPaisa: z.number().int().positive(),
  quantity: z.number().int().min(1),
  availableStock: z.number().int().nonnegative()
});
export type CartItemDto = z.infer<typeof CartItemDtoSchema>;

export const StoreCartDtoSchema = z.object({
  cartId: z.string().uuid(),
  storeId: z.string().uuid(),
  storeSlug: z.string(),
  storeDisplayName: z.string(),
  currency: CurrencyCodeSchema,
  subtotalPaisa: z.number().int().nonnegative(),
  items: z.array(CartItemDtoSchema)
});
export type StoreCartDto = z.infer<typeof StoreCartDtoSchema>;

export const CartsResponseSchema = z.object({
  data: z.array(StoreCartDtoSchema),
  meta: z.object({
    requestId: z.string().min(1)
  })
});
export type CartsResponse = z.infer<typeof CartsResponseSchema>;

export const CheckoutQuoteRequestSchema = z.object({
  storeId: z.string().uuid(),
  fulfilmentMode: z.enum(["SELLER_DELIVERY", "CUSTOMER_PICKUP"]),
  addressId: z.string().uuid().optional(),
  couponCode: z.string().trim().toUpperCase().max(40).optional()
});
export type CheckoutQuoteRequest = z.infer<typeof CheckoutQuoteRequestSchema>;

export const CheckoutQuoteDtoSchema = z.object({
  storeId: z.string().uuid(),
  currency: CurrencyCodeSchema,
  fulfilmentMode: z.enum(["SELLER_DELIVERY", "CUSTOMER_PICKUP"]),
  subtotalPaisa: z.number().int().nonnegative(),
  deliveryFeePaisa: z.number().int().nonnegative(),
  discountPaisa: z.number().int().nonnegative(),
  appliedPromoCode: z.string().nullable().optional(),
  totalPaisa: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative()
});
export type CheckoutQuoteDto = z.infer<typeof CheckoutQuoteDtoSchema>;

export const CreatePhysicalOrderRequestSchema = z.object({
  storeId: z.string().uuid(),
  fulfilmentMode: z.enum(["SELLER_DELIVERY", "CUSTOMER_PICKUP"]),
  addressId: z.string().uuid().optional(),
  paymentMethod: z.literal("COD").default("COD"),
  couponCode: z.string().trim().toUpperCase().max(40).optional(),
  customerNote: z.string().trim().max(1000).optional()
});
export type CreatePhysicalOrderRequest = z.infer<
  typeof CreatePhysicalOrderRequestSchema
>;

export const CreateServiceOrderRequestSchema = z.object({
  serviceListingId: z.string().uuid(),
  servicePackageId: z.string().uuid(),
  addressId: z.string().uuid().optional(),
  customerRequirements: z.string().trim().min(5).max(3000),
  customerNote: z.string().trim().max(1000).optional()
});
export type CreateServiceOrderRequest = z.infer<
  typeof CreateServiceOrderRequestSchema
>;

export const OrderCreatedSummarySchema = z.object({
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  orderType: OrderTypeSchema,
  storeId: z.string().uuid(),
  status: z.string(),
  paymentMethod: PaymentMethodSchema,
  codCollectionStatus: CodCollectionStatusSchema,
  currency: CurrencyCodeSchema,
  subtotalPaisa: z.number().int().nonnegative(),
  deliveryFeePaisa: z.number().int().nonnegative(),
  totalPaisa: z.number().int().nonnegative()
});
export type OrderCreatedSummary = z.infer<typeof OrderCreatedSummarySchema>;

export const OrderItemDtoSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productVariantId: z.string().uuid().nullable(),
  titleSnapshot: z.string(),
  variantTitleSnapshot: z.string().nullable(),
  skuSnapshot: z.string().nullable(),
  unitPricePaisa: z.number().int().positive(),
  quantity: z.number().int().min(1),
  lineTotalPaisa: z.number().int().positive(),
  currency: CurrencyCodeSchema
});
export type OrderItemDto = z.infer<typeof OrderItemDtoSchema>;

export const ServiceOrderDetailsDtoSchema = z.object({
  id: z.string().uuid(),
  serviceListingId: z.string().uuid(),
  servicePackageId: z.string().uuid(),
  serviceModeSnapshot: ServiceModeSchema,
  serviceTitleSnapshot: z.string(),
  packageNameSnapshot: z.string(),
  packagePricePaisa: z.number().int().positive(),
  deliveryEstimateDaysSnapshot: z.number().int().min(1),
  maxRevisionsSnapshot: z.number().int().nonnegative(),
  revisionsUsed: z.number().int().nonnegative(),
  customerRequirements: z.string(),
  deliverySummary: z.string().nullable(),
  deliverySubmittedAt: z.string().datetime().nullable(),
  customerAcceptedAt: z.string().datetime().nullable()
});
export type ServiceOrderDetailsDto = z.infer<typeof ServiceOrderDetailsDtoSchema>;

export const DeliveryDtoSchema = z.object({
  id: z.string().uuid(),
  fulfilmentMode: FulfilmentModeSchema,
  deliveryStatus: DeliveryStatusSchema,
  pickupInstructions: z.string().nullable(),
  trackingNote: z.string().nullable(),
  handoverPin: z.string().nullable().optional(),
  handoverPinVerifiedAt: z.string().datetime().nullable().optional(),
  dispatchedAt: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable(),
  failedReason: z.string().nullable()
});
export type DeliveryDto = z.infer<typeof DeliveryDtoSchema>;

export const OrderStatusHistoryDtoSchema = z.object({
  id: z.string().uuid(),
  fromStatus: z.string().nullable(),
  toStatus: z.string(),
  actorRole: z.string(),
  reason: z.string().nullable(),
  createdAt: z.string().datetime()
});
export type OrderStatusHistoryDto = z.infer<typeof OrderStatusHistoryDtoSchema>;

export const BuyerCodStatsDtoSchema = z.object({
  completedCodCount: z.number().int().nonnegative(),
  refusedCodCount: z.number().int().nonnegative()
});
export type BuyerCodStatsDto = z.infer<typeof BuyerCodStatsDtoSchema>;

export const OrderDetailDtoSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  customerId: z.string().uuid(),
  storeId: z.string().uuid(),
  districtId: z.string().uuid(),
  orderType: OrderTypeSchema,
  status: z.string(),
  paymentMethod: PaymentMethodSchema,
  codCollectionStatus: CodCollectionStatusSchema,
  currency: CurrencyCodeSchema,
  subtotalPaisa: z.number().int().nonnegative(),
  deliveryFeePaisa: z.number().int().nonnegative(),
  discountPaisa: z.number().int().nonnegative(),
  totalPaisa: z.number().int().nonnegative(),
  commissionRateBps: z.number().int().nonnegative(),
  commissionAmountPaisa: z.number().int().nonnegative(),
  sellerNetEntitlementPaisa: z.number().int().nonnegative(),
  customerNote: z.string().nullable(),
  cancelledReason: z.string().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z.array(OrderItemDtoSchema),
  serviceOrderDetails: ServiceOrderDetailsDtoSchema.nullable(),
  delivery: DeliveryDtoSchema.nullable(),
  statusHistory: z.array(OrderStatusHistoryDtoSchema),
  buyerCodStats: BuyerCodStatsDtoSchema.nullable().optional()
});
export type OrderDetailDto = z.infer<typeof OrderDetailDtoSchema>;

export const CancelOrderRequestSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional()
});
export type CancelOrderRequest = z.infer<typeof CancelOrderRequestSchema>;

export const RejectOrderRequestSchema = z.object({
  reason: z.string().trim().min(5).max(500)
});
export type RejectOrderRequest = z.infer<typeof RejectOrderRequestSchema>;

export const UpdateSellerOrderStatusRequestSchema = z.object({
  toStatus: z.enum([
    "PREPARING",
    "READY_FOR_DISPATCH",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "DELIVERY_FAILED",
    "CANCELLED",
    "IN_PROGRESS",
    "DELIVERY_SUBMITTED"
  ]),
  trackingNote: z.string().trim().max(500).optional(),
  pickupInstructions: z.string().trim().max(500).optional(),
  handoverPin: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Handover PIN must be 4 digits.")
    .optional(),
  failedReason: z.string().trim().max(500).optional(),
  deliverySummary: z.string().trim().max(3000).optional(),
  reason: z.string().trim().max(500).optional()
});
export type UpdateSellerOrderStatusRequest = z.infer<
  typeof UpdateSellerOrderStatusRequestSchema
>;

export const RequestServiceRevisionRequestSchema = z.object({
  reason: z.string().trim().min(5).max(1000)
});
export type RequestServiceRevisionRequest = z.infer<
  typeof RequestServiceRevisionRequestSchema
>;

export const CodCollectionRequestSchema = z.object({
  collectionStatus: z.enum(["COLLECTED", "FAILED_REFUSED"]),
  collectedAmountPaisa: z.number().int().nonnegative(),
  collectedAt: z.string().datetime().optional(),
  note: z.string().trim().max(500).optional()
});
export type CodCollectionRequest = z.infer<typeof CodCollectionRequestSchema>;

export const ManualPaymentConfirmationRequestSchema = z.object({
  collectionStatus: z.enum(["COLLECTED", "FAILED_REFUSED"]),
  collectedAmountPaisa: z.number().int().nonnegative(),
  collectedAt: z.string().datetime().optional(),
  manualPaymentMethodDesc: z.string().trim().min(3).max(100),
  note: z.string().trim().max(500).optional()
});
export type ManualPaymentConfirmationRequest = z.infer<
  typeof ManualPaymentConfirmationRequestSchema
>;

export const CreateOrderMessageRequestSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must not exceed 2000 characters")
});
export type CreateOrderMessageRequest = z.infer<
  typeof CreateOrderMessageRequestSchema
>;

export const OrderMessageDtoSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  senderId: z.string().uuid(),
  senderRole: z.string(),
  body: z.string(),
  createdAt: z.string().datetime()
});
export type OrderMessageDto = z.infer<typeof OrderMessageDtoSchema>;
