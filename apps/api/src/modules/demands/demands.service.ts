import { HttpStatus, Injectable } from "@nestjs/common";
import {
  BuyerRequestDto,
  BuyerRequestDtoSchema,
  ConversationSummaryDto,
  CreateBuyerRequest,
  RespondBuyerRequest
} from "@saudavo/contracts";
import { DomainException } from "../../common/errors/domain.exception";
import { bigIntToSafeNumber } from "../../common/money.util";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FeatureFlagsService } from "../features/feature-flags.service";
import { MessengerService } from "../messenger/messenger.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SellerService } from "../seller/seller.service";

@Injectable()
export class DemandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly sellerService: SellerService,
    private readonly messengerService: MessengerService,
    private readonly notificationsService: NotificationsService
  ) {}

  async listPublicDemands(
    query: { districtId?: string; areaZoneId?: string; status?: string },
    requestId: string
  ): Promise<{ data: BuyerRequestDto[]; meta: { requestId: string } }> {
    await this.featureFlags.assertEnabled(
      "buyer_requests_board_enabled",
      "Mujhy Chahiye Demand Board"
    );

    const rows = await this.prisma.buyerRequest.findMany({
      where: {
        ...(query.districtId ? { districtId: query.districtId } : {}),
        ...(query.areaZoneId ? { areaZoneId: query.areaZoneId } : {}),
        status: query.status ?? "OPEN"
      },
      include: {
        buyer: { select: { displayName: true } },
        district: { select: { nameEn: true } },
        areaZone: { select: { nameEn: true } },
        category: { select: { nameEn: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 40
    });

    return {
      data: rows.map((r) => this.toDto(r)),
      meta: { requestId }
    };
  }

  async createDemand(
    userId: string,
    dto: CreateBuyerRequest,
    requestId: string
  ): Promise<{ data: BuyerRequestDto; meta: { requestId: string } }> {
    await this.featureFlags.assertEnabled(
      "buyer_requests_board_enabled",
      "Mujhy Chahiye Demand Board"
    );

    const district = await this.prisma.district.findFirst({
      where: { id: dto.districtId, isActive: true }
    });
    if (!district) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Selected district is invalid or inactive."
      );
    }

    if (dto.areaZoneId) {
      const zone = await this.prisma.areaZone.findFirst({
        where: { id: dto.areaZoneId, districtId: dto.districtId, isActive: true }
      });
      if (!zone) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          "Selected area zone does not belong to the chosen district."
        );
      }
    }

    const created = await this.prisma.buyerRequest.create({
      data: {
        buyerId: userId,
        districtId: dto.districtId,
        areaZoneId: dto.areaZoneId ?? null,
        categoryId: dto.categoryId ?? null,
        title: dto.title,
        description: dto.description,
        budgetMaxPaisa: BigInt(dto.budgetMaxPaisa),
        status: "OPEN"
      },
      include: {
        buyer: { select: { displayName: true } },
        district: { select: { nameEn: true } },
        areaZone: { select: { nameEn: true } },
        category: { select: { nameEn: true } }
      }
    });

    return {
      data: this.toDto(created),
      meta: { requestId }
    };
  }

  async respondToDemand(
    sellerUserId: string,
    demandId: string,
    dto: RespondBuyerRequest,
    requestId: string
  ): Promise<{
    data: { conversation: ConversationSummaryDto; demand: BuyerRequestDto };
    meta: { requestId: string };
  }> {
    await this.featureFlags.assertEnabled(
      "buyer_requests_board_enabled",
      "Mujhy Chahiye Demand Board"
    );
    await this.featureFlags.assertEnabled(
      "shopping_messenger_enabled",
      "Saudavo Shopping Messenger"
    );

    const { store, verificationStatus } =
      await this.sellerService.requireOwnStore(sellerUserId);
    if (verificationStatus !== "APPROVED" || store.status !== "ACTIVE") {
      throw new DomainException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Only verified active stores can respond to local buyer demands."
      );
    }

    const demand = await this.prisma.buyerRequest.findUnique({
      where: { id: demandId },
      include: {
        buyer: { select: { displayName: true } },
        district: { select: { nameEn: true } },
        areaZone: { select: { nameEn: true } },
        category: { select: { nameEn: true } }
      }
    });
    if (!demand) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Buyer demand post not found."
      );
    }
    if (demand.status !== "OPEN") {
      throw new DomainException(
        "CONFLICT",
        HttpStatus.CONFLICT,
        "This buyer demand is no longer open."
      );
    }
    if (demand.buyerId === sellerUserId) {
      throw new DomainException(
        "CONFLICT",
        HttpStatus.CONFLICT,
        "You cannot respond to your own buyer demand."
      );
    }

    const introText = `[Demand Reply: ${demand.title}]\n${dto.message}`;
    const convResult =
      await this.messengerService.startSellerInitiatedConversation(
        sellerUserId,
        demand.buyerId,
        store.id,
        introText,
        {
          productId: dto.productId,
          serviceListingId: dto.serviceListingId
        },
        requestId
      );

    const updated = await this.prisma.buyerRequest.update({
      where: { id: demand.id },
      data: { responsesCount: { increment: 1 } },
      include: {
        buyer: { select: { displayName: true } },
        district: { select: { nameEn: true } },
        areaZone: { select: { nameEn: true } },
        category: { select: { nameEn: true } }
      }
    });

    await this.notificationsService.notify({
      userId: demand.buyerId,
      eventType: "DEMAND_RESPONSE",
      titleKey: "notification.demandResponse",
      payloadJson: {
        demandId: demand.id,
        storeName: store.displayName,
        conversationId: convResult.id
      }
    });

    return {
      data: {
        conversation: convResult,
        demand: this.toDto(updated)
      },
      meta: { requestId }
    };
  }

  async closeDemand(
    userId: string,
    demandId: string,
    status: "FULFILLED" | "CLOSED",
    requestId: string
  ): Promise<{ data: BuyerRequestDto; meta: { requestId: string } }> {
    await this.featureFlags.assertEnabled(
      "buyer_requests_board_enabled",
      "Mujhy Chahiye Demand Board"
    );

    const existing = await this.prisma.buyerRequest.findUnique({
      where: { id: demandId }
    });
    if (!existing) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Buyer demand post not found."
      );
    }
    if (existing.buyerId !== userId) {
      throw new DomainException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Only the buyer who posted this demand can close it."
      );
    }

    const updated = await this.prisma.buyerRequest.update({
      where: { id: demandId },
      data: { status },
      include: {
        buyer: { select: { displayName: true } },
        district: { select: { nameEn: true } },
        areaZone: { select: { nameEn: true } },
        category: { select: { nameEn: true } }
      }
    });

    return {
      data: this.toDto(updated),
      meta: { requestId }
    };
  }

  private toDto(row: {
    id: string;
    buyerId: string;
    districtId: string;
    areaZoneId: string | null;
    categoryId: string | null;
    title: string;
    description: string;
    budgetMaxPaisa: bigint;
    status: string;
    responsesCount: number;
    createdAt: Date;
    updatedAt: Date;
    buyer: { displayName: string };
    district: { nameEn: string };
    areaZone: { nameEn: string } | null;
    category: { nameEn: string } | null;
  }): BuyerRequestDto {
    return BuyerRequestDtoSchema.parse({
      id: row.id,
      buyerId: row.buyerId,
      buyerDisplayName: row.buyer.displayName,
      districtId: row.districtId,
      districtNameEn: row.district.nameEn,
      areaZoneId: row.areaZoneId,
      areaZoneNameEn: row.areaZone?.nameEn ?? null,
      categoryId: row.categoryId,
      categoryNameEn: row.category?.nameEn ?? null,
      title: row.title,
      description: row.description,
      budgetMaxPaisa: bigIntToSafeNumber(row.budgetMaxPaisa, "budgetMaxPaisa"),
      status: row.status,
      responsesCount: row.responsesCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    });
  }
}
