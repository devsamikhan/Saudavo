import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  type NotificationDto,
  type NotificationsResponse,
  NotificationsResponseSchema
} from "@saudavo/contracts";
import { DomainException } from "../../common/errors/domain.exception";
import { PrismaService } from "../../common/prisma/prisma.service";

export interface CreateNotificationInput {
  userId: string;
  eventType: string;
  titleKey: string;
  payloadJson: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists an in-app notification safely inside an ongoing DB transaction or standalone.
   */
  async notify(
    input: CreateNotificationInput,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string }> {
    const db = tx ?? this.prisma;
    return db.notification.create({
      data: {
        userId: input.userId,
        eventType: input.eventType,
        titleKey: input.titleKey,
        payloadJson: input.payloadJson
      },
      select: { id: true }
    });
  }

  async listForUser(
    userId: string,
    requestId: string
  ): Promise<NotificationsResponse> {
    const [records, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30
      }),
      this.prisma.notification.count({
        where: { userId, readAt: null }
      })
    ]);

    return NotificationsResponseSchema.parse({
      data: records.map((n) => this.toDto(n)),
      meta: { requestId, unreadCount }
    });
  }

  async markRead(
    userId: string,
    notificationId: string,
    requestId: string
  ): Promise<{ data: NotificationDto; meta: { requestId: string } }> {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId }
    });

    if (!existing) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Notification not found."
      );
    }

    const updated = existing.readAt
      ? existing
      : await this.prisma.notification.update({
          where: { id: existing.id },
          data: { readAt: new Date() }
        });

    return {
      data: this.toDto(updated),
      meta: { requestId }
    };
  }

  async markAllRead(
    userId: string,
    requestId: string
  ): Promise<{ data: { markedCount: number }; meta: { requestId: string } }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() }
    });

    return {
      data: { markedCount: result.count },
      meta: { requestId }
    };
  }

  private toDto(record: {
    id: string;
    eventType: string;
    titleKey: string;
    payloadJson: Prisma.JsonValue;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationDto {
    const payload =
      record.payloadJson &&
      typeof record.payloadJson === "object" &&
      !Array.isArray(record.payloadJson)
        ? (record.payloadJson as Record<string, unknown>)
        : {};

    return {
      id: record.id,
      eventType: record.eventType,
      titleKey: record.titleKey,
      payloadJson: payload,
      readAt: record.readAt ? record.readAt.toISOString() : null,
      createdAt: record.createdAt.toISOString()
    };
  }
}
