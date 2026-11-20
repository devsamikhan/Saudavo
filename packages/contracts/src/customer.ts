import { z } from "zod";
import { PhoneInputSchema } from "./auth";
import { LocaleCodeSchema } from "./enums";

export const CustomerProfileDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  preferredLocale: LocaleCodeSchema,
  defaultDistrictId: z.string().uuid().nullable(),
  defaultAreaZoneId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type CustomerProfileDto = z.infer<typeof CustomerProfileDtoSchema>;

export const UpdateCustomerProfileRequestSchema = z.object({
  preferredLocale: LocaleCodeSchema.optional(),
  defaultDistrictId: z.string().uuid().nullable().optional(),
  defaultAreaZoneId: z.string().uuid().nullable().optional()
});
export type UpdateCustomerProfileRequest = z.infer<
  typeof UpdateCustomerProfileRequestSchema
>;

export const CreateAddressRequestSchema = z.object({
  label: z.string().trim().min(1).max(60).optional(),
  districtId: z.string().uuid(),
  areaZoneId: z.string().uuid(),
  recipientName: z.string().trim().min(2).max(120),
  recipientPhone: PhoneInputSchema,
  streetAddress: z.string().trim().min(5).max(500),
  landmark: z.string().trim().max(200).optional(),
  isDefault: z.boolean().default(false)
});
export type CreateAddressRequest = z.infer<typeof CreateAddressRequestSchema>;

export const UpdateAddressRequestSchema = z.object({
  label: z.string().trim().min(1).max(60).nullable().optional(),
  districtId: z.string().uuid().optional(),
  areaZoneId: z.string().uuid().optional(),
  recipientName: z.string().trim().min(2).max(120).optional(),
  recipientPhone: PhoneInputSchema.optional(),
  streetAddress: z.string().trim().min(5).max(500).optional(),
  landmark: z.string().trim().max(200).nullable().optional(),
  isDefault: z.boolean().optional()
});
export type UpdateAddressRequest = z.infer<typeof UpdateAddressRequestSchema>;

export const AddressDtoSchema = z.object({
  id: z.string().uuid(),
  label: z.string().nullable(),
  districtId: z.string().uuid(),
  districtName: z.string(),
  areaZoneId: z.string().uuid().nullable(),
  areaZoneName: z.string().nullable(),
  recipientName: z.string(),
  recipientPhone: z.string(),
  streetAddress: z.string(),
  landmark: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type AddressDto = z.infer<typeof AddressDtoSchema>;
