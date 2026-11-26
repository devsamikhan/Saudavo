import { z } from "zod";

export const PromoDiscountTypeSchema = z.enum(["PERCENT_BPS", "FLAT_PAISA"]);
export type PromoDiscountType = z.infer<typeof PromoDiscountTypeSchema>;

export const CreatePromoDealRequestSchema = z
  .object({
    title: z.string().trim().min(3).max(140),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,24}$/, "Promo code must be 3-24 uppercase letters/numbers.")
      .nullable()
      .optional(),
    discountType: PromoDiscountTypeSchema,
    discountValue: z.number().int().positive(),
    minOrderPaisa: z.number().int().nonnegative().default(0),
    isFlashDeal: z.boolean().default(true),
    durationHours: z.number().int().min(1).max(720).default(24)
  })
  .refine(
    (d) =>
      d.discountType !== "PERCENT_BPS" || (d.discountValue >= 100 && d.discountValue <= 8000),
    "Percentage discount must be between 1% (100 bps) and 80% (8000 bps)."
  );
export type CreatePromoDealRequest = z.infer<typeof CreatePromoDealRequestSchema>;

export const PromoDealDtoSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  storeSlug: z.string().optional(),
  storeDisplayName: z.string().optional(),
  code: z.string().nullable(),
  title: z.string(),
  discountType: PromoDiscountTypeSchema,
  discountValue: z.number().int().positive(),
  minOrderPaisa: z.number().int().nonnegative(),
  isFlashDeal: z.boolean(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isActive: z.boolean(),
  createdAt: z.string().datetime()
});
export type PromoDealDto = z.infer<typeof PromoDealDtoSchema>;

export const TogglePromoDealRequestSchema = z.object({
  isActive: z.boolean()
});
export type TogglePromoDealRequest = z.infer<typeof TogglePromoDealRequestSchema>;
