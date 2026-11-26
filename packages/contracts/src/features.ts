import { z } from "zod";

export const FeatureFlagKeySchema = z.enum([
  "shopping_messenger_enabled",
  "seller_subscriptions_enabled",
  "buyer_requests_board_enabled",
  "messenger_voice_notes_enabled",
  "handover_pin_enabled",
  "flash_deals_coupons_enabled",
  "cod_refusal_shield_enabled"
]);
export type FeatureFlagKey = z.infer<typeof FeatureFlagKeySchema>;

export const FeatureFlagCategorySchema = z.enum([
  "CORE",
  "MONETIZATION",
  "GROWTH",
  "COMMUNICATION",
  "TRUST"
]);
export type FeatureFlagCategory = z.infer<typeof FeatureFlagCategorySchema>;

export const FeatureFlagDtoSchema = z.object({
  key: FeatureFlagKeySchema,
  nameEn: z.string(),
  nameUr: z.string(),
  descriptionEn: z.string(),
  descriptionUr: z.string(),
  category: FeatureFlagCategorySchema,
  isEnabled: z.boolean(),
  sortOrder: z.number().int(),
  updatedAt: z.string().datetime()
});
export type FeatureFlagDto = z.infer<typeof FeatureFlagDtoSchema>;

export const FeatureFlagsMapSchema = z.object({
  shopping_messenger_enabled: z.boolean(),
  seller_subscriptions_enabled: z.boolean(),
  buyer_requests_board_enabled: z.boolean(),
  messenger_voice_notes_enabled: z.boolean(),
  handover_pin_enabled: z.boolean(),
  flash_deals_coupons_enabled: z.boolean(),
  cod_refusal_shield_enabled: z.boolean()
});
export type FeatureFlagsMap = z.infer<typeof FeatureFlagsMapSchema>;

export const UpdateFeatureFlagRequestSchema = z.object({
  isEnabled: z.boolean(),
  reason: z.string().trim().max(300).optional()
});
export type UpdateFeatureFlagRequest = z.infer<
  typeof UpdateFeatureFlagRequestSchema
>;

export const DEFAULT_FEATURE_FLAGS_MAP: FeatureFlagsMap = {
  shopping_messenger_enabled: true,
  seller_subscriptions_enabled: false,
  buyer_requests_board_enabled: false,
  messenger_voice_notes_enabled: false,
  handover_pin_enabled: false,
  flash_deals_coupons_enabled: false,
  cod_refusal_shield_enabled: false
};
