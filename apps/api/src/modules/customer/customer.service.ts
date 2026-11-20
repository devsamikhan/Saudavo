import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  AddressDto,
  AddressDtoSchema,
  CreateAddressRequest,
  CustomerProfileDto,
  CustomerProfileDtoSchema,
  UpdateAddressRequest,
  UpdateCustomerProfileRequest
} from "@saudavo/contracts";
import { DomainException } from "../../common/errors/domain.exception";
import { PrismaService } from "../../common/prisma/prisma.service";

export const ADDRESS_WITH_LOCATION_INCLUDE = {
  district: true,
  areaZone: true
} satisfies Prisma.AddressInclude;

export type AddressWithLocation = Prisma.AddressGetPayload<{
  include: typeof ADDRESS_WITH_LOCATION_INCLUDE;
}>;

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(
    userId: string,
    requestId: string
  ): Promise<{ data: CustomerProfileDto; meta: { requestId: string } }> {
    const profile = await this.prisma.customerProfile.upsert({
      where: { userId },
      update: {},
      create: { userId, preferredLocale: "en" }
    });

    return {
      data: CustomerProfileDtoSchema.parse({
        id: profile.id,
        userId: profile.userId,
        preferredLocale: profile.preferredLocale,
        defaultDistrictId: profile.defaultDistrictId,
        defaultAreaZoneId: profile.defaultAreaZoneId,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString()
      }),
      meta: { requestId }
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateCustomerProfileRequest,
    requestId: string
  ): Promise<{ data: CustomerProfileDto; meta: { requestId: string } }> {
    const current = await this.prisma.customerProfile.upsert({
      where: { userId },
      update: {},
      create: { userId, preferredLocale: "en" }
    });

    const targetDistrictId =
      dto.defaultDistrictId !== undefined
        ? dto.defaultDistrictId
        : current.defaultDistrictId;

    if (dto.defaultDistrictId) {
      const district = await this.prisma.district.findFirst({
        where: { id: dto.defaultDistrictId, isActive: true }
      });
      if (!district) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          "Selected district is invalid or inactive."
        );
      }
    }

    if (dto.defaultAreaZoneId) {
      const zone = await this.prisma.areaZone.findFirst({
        where: {
          id: dto.defaultAreaZoneId,
          isActive: true,
          ...(targetDistrictId ? { districtId: targetDistrictId } : {})
        }
      });
      if (!zone) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          "Selected area zone does not belong to the chosen district."
        );
      }
    }

    const updated = await this.prisma.customerProfile.update({
      where: { id: current.id },
      data: {
        ...(dto.preferredLocale !== undefined
          ? { preferredLocale: dto.preferredLocale }
          : {}),
        ...(dto.defaultDistrictId !== undefined
          ? { defaultDistrictId: dto.defaultDistrictId }
          : {}),
        ...(dto.defaultAreaZoneId !== undefined
          ? { defaultAreaZoneId: dto.defaultAreaZoneId }
          : {})
      }
    });

    return {
      data: CustomerProfileDtoSchema.parse({
        id: updated.id,
        userId: updated.userId,
        preferredLocale: updated.preferredLocale,
        defaultDistrictId: updated.defaultDistrictId,
        defaultAreaZoneId: updated.defaultAreaZoneId,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString()
      }),
      meta: { requestId }
    };
  }

  async listAddresses(
    userId: string,
    requestId: string
  ): Promise<{ data: AddressDto[]; meta: { requestId: string } }> {
    const rows = await this.prisma.address.findMany({
      where: { userId, deletedAt: null },
      include: ADDRESS_WITH_LOCATION_INCLUDE,
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
    });

    return {
      data: rows.map((row) => this.toAddressDto(row)),
      meta: { requestId }
    };
  }

  async createAddress(
    userId: string,
    dto: CreateAddressRequest,
    requestId: string
  ): Promise<{ data: AddressDto; meta: { requestId: string } }> {
    await this.validateDistrictAndZone(dto.districtId, dto.areaZoneId);

    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true, deletedAt: null },
          data: { isDefault: false }
        });
      }

      return tx.address.create({
        data: {
          userId,
          districtId: dto.districtId,
          areaZoneId: dto.areaZoneId,
          label: dto.label ?? null,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          streetAddress: dto.streetAddress,
          landmark: dto.landmark ?? null,
          isDefault: dto.isDefault
        },
        include: ADDRESS_WITH_LOCATION_INCLUDE
      });
    });

    return {
      data: this.toAddressDto(created),
      meta: { requestId }
    };
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressRequest,
    requestId: string
  ): Promise<{ data: AddressDto; meta: { requestId: string } }> {
    const existing = await this.requireOwnedAddress(userId, addressId);
    const nextDistrictId = dto.districtId ?? existing.districtId;
    const nextAreaZoneId = dto.areaZoneId ?? existing.areaZoneId;

    if (dto.districtId !== undefined || dto.areaZoneId !== undefined) {
      if (!nextAreaZoneId) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          "Area zone is required."
        );
      }
      await this.validateDistrictAndZone(nextDistrictId, nextAreaZoneId);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true, deletedAt: null },
          data: { isDefault: false }
        });
      }

      return tx.address.update({
        where: { id: existing.id },
        data: {
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.districtId !== undefined ? { districtId: dto.districtId } : {}),
          ...(dto.areaZoneId !== undefined ? { areaZoneId: dto.areaZoneId } : {}),
          ...(dto.recipientName !== undefined
            ? { recipientName: dto.recipientName }
            : {}),
          ...(dto.recipientPhone !== undefined
            ? { recipientPhone: dto.recipientPhone }
            : {}),
          ...(dto.streetAddress !== undefined
            ? { streetAddress: dto.streetAddress }
            : {}),
          ...(dto.landmark !== undefined ? { landmark: dto.landmark } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {})
        },
        include: ADDRESS_WITH_LOCATION_INCLUDE
      });
    });

    return {
      data: this.toAddressDto(updated),
      meta: { requestId }
    };
  }

  async deleteAddress(
    userId: string,
    addressId: string,
    requestId: string
  ): Promise<{ data: { deleted: true; id: string }; meta: { requestId: string } }> {
    const existing = await this.requireOwnedAddress(userId, addressId);
    await this.prisma.address.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        isDefault: false
      }
    });

    return {
      data: { deleted: true, id: existing.id },
      meta: { requestId }
    };
  }

  async requireOwnedAddress(
    userId: string,
    addressId: string
  ): Promise<AddressWithLocation> {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId, deletedAt: null },
      include: ADDRESS_WITH_LOCATION_INCLUDE
    });
    if (!address) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Delivery address not found."
      );
    }
    return address;
  }

  private async validateDistrictAndZone(
    districtId: string,
    areaZoneId: string
  ): Promise<void> {
    const district = await this.prisma.district.findFirst({
      where: { id: districtId, isActive: true }
    });
    if (!district) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Selected district is invalid or inactive."
      );
    }

    const zone = await this.prisma.areaZone.findFirst({
      where: { id: areaZoneId, districtId: district.id, isActive: true }
    });
    if (!zone) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Selected area zone does not belong to the active district."
      );
    }
  }

  private toAddressDto(row: AddressWithLocation): AddressDto {
    return AddressDtoSchema.parse({
      id: row.id,
      label: row.label,
      districtId: row.districtId,
      districtName: row.district.nameEn,
      areaZoneId: row.areaZoneId,
      areaZoneName: row.areaZone?.nameEn ?? null,
      recipientName: row.recipientName,
      recipientPhone: row.recipientPhone,
      streetAddress: row.streetAddress,
      landmark: row.landmark,
      isDefault: row.isDefault,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    });
  }
}
