import { z } from "zod";

export const AreaZoneDtoSchema = z.object({
  id: z.string().uuid(),
  nameEn: z.string(),
  nameUr: z.string(),
  slug: z.string(),
  zoneType: z.enum(["TEHSIL", "TOWN", "LOCALITY"])
});
export type AreaZoneDto = z.infer<typeof AreaZoneDtoSchema>;

export const DistrictDtoSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  nameEn: z.string(),
  nameUr: z.string(),
  slug: z.string(),
  province: z.string(),
  countryCode: z.string().length(2),
  areaZones: z.array(AreaZoneDtoSchema)
});
export type DistrictDto = z.infer<typeof DistrictDtoSchema>;

export const DistrictsResponseSchema = z.object({
  data: z.array(DistrictDtoSchema),
  meta: z.object({
    requestId: z.string().min(1)
  })
});
export type DistrictsResponse = z.infer<typeof DistrictsResponseSchema>;
