import { Injectable } from "@nestjs/common";
import { type DistrictsResponse, DistrictsResponseSchema } from "@saudavo/contracts";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveDistricts(requestId: string): Promise<DistrictsResponse> {
    const districts = await this.prisma.district.findMany({
      where: { isActive: true },
      orderBy: { nameEn: "asc" },
      include: {
        areaZones: {
          where: { isActive: true },
          orderBy: { nameEn: "asc" }
        }
      }
    });

    return DistrictsResponseSchema.parse({
      data: districts.map((district) => ({
        id: district.id,
        code: district.code,
        nameEn: district.nameEn,
        nameUr: district.nameUr,
        slug: district.slug,
        province: district.province,
        countryCode: district.countryCode,
        areaZones: district.areaZones.map((zone) => ({
          id: zone.id,
          nameEn: zone.nameEn,
          nameUr: zone.nameUr,
          slug: zone.slug,
          zoneType: zone.zoneType
        }))
      })),
      meta: { requestId }
    });
  }
}
