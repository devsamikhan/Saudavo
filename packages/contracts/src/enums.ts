import { z } from "zod";

export const CurrencyCodeSchema = z.enum(["PKR"]);
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

export const LocaleCodeSchema = z.enum(["en", "ur"]);
export type LocaleCode = z.infer<typeof LocaleCodeSchema>;

export const RoleCodeSchema = z.enum([
  "CUSTOMER",
  "SELLER",
  "MODERATOR",
  "SUPPORT",
  "ADMIN",
  "SUPER_ADMIN"
]);
export type RoleCode = z.infer<typeof RoleCodeSchema>;

export const STAFF_ROLES: readonly RoleCode[] = [
  "MODERATOR",
  "SUPPORT",
  "ADMIN",
  "SUPER_ADMIN"
];

export const OrderTypeSchema = z.enum(["PHYSICAL", "SERVICE"]);
export type OrderType = z.infer<typeof OrderTypeSchema>;

export const ServiceModeSchema = z.enum(["ON_SITE", "REMOTE", "HYBRID"]);
export type ServiceMode = z.infer<typeof ServiceModeSchema>;

export const PaymentMethodSchema = z.enum(["COD", "MANUAL_OFFLINE"]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const CodCollectionStatusSchema = z.enum([
  "PENDING_COLLECTION",
  "COLLECTED",
  "FAILED_REFUSED",
  "REFUNDED"
]);
export type CodCollectionStatus = z.infer<typeof CodCollectionStatusSchema>;

export const FulfilmentModeSchema = z.enum([
  "SELLER_DELIVERY",
  "CUSTOMER_PICKUP",
  "COURIER"
]);
export type FulfilmentMode = z.infer<typeof FulfilmentModeSchema>;

export const DeliveryStatusSchema = z.enum([
  "NOT_STARTED",
  "PREPARING",
  "READY_FOR_HANDOFF",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED"
]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;

export const PhysicalOrderStatusSchema = z.enum([
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_DISPATCH",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "DELIVERY_FAILED",
  "CANCELLED",
  "RETURN_REFUND_REVIEW",
  "DISPUTED"
]);
export type PhysicalOrderStatus = z.infer<typeof PhysicalOrderStatusSchema>;

export const ServiceOrderStatusSchema = z.enum([
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "IN_PROGRESS",
  "DELIVERY_SUBMITTED",
  "REVISION_REQUESTED",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED"
]);
export type ServiceOrderStatus = z.infer<typeof ServiceOrderStatusSchema>;

export const ApiErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "PRIVACY_CONTACT_SHIELD",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "CSRF_INVALID",
  "MFA_REQUIRED",
  "NOT_FOUND",
  "CONFLICT",
  "DUPLICATE_IDENTITY",
  "INVALID_CREDENTIALS",
  "ACCOUNT_SUSPENDED",
  "INVALID_OR_EXPIRED_TOKEN",
  "RATE_LIMIT_EXCEEDED",
  "ORDER_SINGLE_SELLER_VIOLATION",
  "INVALID_STATE_TRANSITION",
  "PLAN_LIMIT_REACHED",
  "FEATURE_DISABLED",
  "INTERNAL_SERVER_ERROR"
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const SellerTypeSchema = z.enum([
  "LOCAL_SHOP",
  "INDIVIDUAL_SELLER",
  "HOME_MAKER",
  "SERVICE_PROVIDER"
]);
export type SellerType = z.infer<typeof SellerTypeSchema>;

export const SellerVerificationStatusSchema = z.enum([
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED"
]);
export type SellerVerificationStatus = z.infer<
  typeof SellerVerificationStatusSchema
>;

export const StoreStatusSchema = z.enum([
  "DRAFT",
  "PENDING_REVIEW",
  "ACTIVE",
  "REJECTED",
  "SUSPENDED"
]);
export type StoreStatus = z.infer<typeof StoreStatusSchema>;

export const CategoryApplicableToSchema = z.enum([
  "PRODUCT",
  "SERVICE",
  "BOTH"
]);
export type CategoryApplicableTo = z.infer<typeof CategoryApplicableToSchema>;

export const ListingStatusSchema = z.enum([
  "DRAFT",
  "PENDING_REVIEW",
  "ACTIVE",
  "REJECTED",
  "ARCHIVED"
]);
export type ListingStatus = z.infer<typeof ListingStatusSchema>;
