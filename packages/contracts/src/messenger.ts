import { z } from "zod";
import { CurrencyCodeSchema, ServiceModeSchema } from "./enums";
import { BuyerCodStatsDtoSchema } from "./orders";

export const ChatMessageTypeSchema = z.enum([
  "TEXT",
  "PRODUCT_INQUIRY",
  "CUSTOM_OFFER",
  "IMAGE",
  "VOICE_NOTE",
  "SYSTEM"
]);
export type ChatMessageType = z.infer<typeof ChatMessageTypeSchema>;

export const ChatOfferStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED"
]);
export type ChatOfferStatus = z.infer<typeof ChatOfferStatusSchema>;

export const StartConversationRequestSchema = z
  .object({
    storeId: z.string().uuid(),
    productId: z.string().uuid().optional(),
    serviceListingId: z.string().uuid().optional(),
    initialMessage: z.string().trim().min(1).max(2000).optional()
  })
  .refine(
    (data) => !(data.productId && data.serviceListingId),
    "Provide either productId or serviceListingId, not both."
  );
export type StartConversationRequest = z.infer<
  typeof StartConversationRequestSchema
>;

export const SendChatMessageRequestSchema = z
  .object({
    body: z.string().trim().max(2000).default(""),
    mediaAssetId: z.string().uuid().optional(),
    voiceDurationSec: z.number().int().min(1).max(120).optional(),
    productId: z.string().uuid().optional(),
    serviceListingId: z.string().uuid().optional()
  })
  .refine(
    (data) =>
      data.body.trim().length > 0 ||
      Boolean(data.mediaAssetId) ||
      Boolean(data.productId) ||
      Boolean(data.serviceListingId),
    "Message text, attachment, or listing reference is required."
  );
export type SendChatMessageRequest = z.infer<typeof SendChatMessageRequestSchema>;

export const SendCustomOfferRequestSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
  unitPricePaisa: z.number().int().positive(),
  deliveryFeePaisa: z.number().int().nonnegative().default(0),
  fulfilmentMode: z.enum(["SELLER_DELIVERY", "CUSTOMER_PICKUP"]),
  note: z.string().trim().max(1000).optional()
});
export type SendCustomOfferRequest = z.infer<typeof SendCustomOfferRequestSchema>;

export const AcceptCustomOfferRequestSchema = z.object({
  addressId: z.string().uuid().optional(),
  customerNote: z.string().trim().max(1000).optional()
});
export type AcceptCustomOfferRequest = z.infer<
  typeof AcceptCustomOfferRequestSchema
>;

export const ChatProductSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  basePricePaisa: z.number().int().positive(),
  currency: CurrencyCodeSchema,
  stockQuantity: z.number().int().nonnegative()
});
export type ChatProductSummary = z.infer<typeof ChatProductSummarySchema>;

export const ChatServiceSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  serviceMode: ServiceModeSchema
});
export type ChatServiceSummary = z.infer<typeof ChatServiceSummarySchema>;

export const ChatMessageDtoSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  senderRole: z.string(),
  messageType: ChatMessageTypeSchema,
  body: z.string(),
  productSummary: ChatProductSummarySchema.nullable(),
  serviceSummary: ChatServiceSummarySchema.nullable(),
  mediaAssetId: z.string().uuid().nullable(),
  imageReadUrl: z.string().nullable(),
  voiceDurationSec: z.number().int().nullable().optional(),
  voiceReadUrl: z.string().nullable().optional(),
  offerTitle: z.string().nullable(),
  offerQuantity: z.number().int().nullable(),
  offerUnitPricePaisa: z.number().int().nullable(),
  offerDeliveryFeePaisa: z.number().int().nullable(),
  offerTotalPaisa: z.number().int().nullable(),
  offerFulfilmentMode: z.enum(["SELLER_DELIVERY", "CUSTOMER_PICKUP"]).nullable(),
  offerStatus: ChatOfferStatusSchema.nullable(),
  offerOrderId: z.string().uuid().nullable(),
  offerExpiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime()
});
export type ChatMessageDto = z.infer<typeof ChatMessageDtoSchema>;

export const ConversationSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  roleView: z.enum(["BUYER", "SELLER"]),
  buyerId: z.string().uuid(),
  buyerDisplayName: z.string(),
  buyerCodStats: BuyerCodStatsDtoSchema.nullable().optional(),
  storeId: z.string().uuid(),
  storeSlug: z.string(),
  storeDisplayName: z.string(),
  storeDistrictNameEn: z.string(),
  storeVerifiedPro: z.boolean(),
  status: z.string(),
  unreadCount: z.number().int().nonnegative(),
  lastMessagePreview: z.string(),
  lastMessageAt: z.string().datetime(),
  createdAt: z.string().datetime()
});
export type ConversationSummaryDto = z.infer<
  typeof ConversationSummaryDtoSchema
>;
