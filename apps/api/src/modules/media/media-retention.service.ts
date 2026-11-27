import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { S3PresignerService } from "./s3-presigner.service";

const CLEANUP_SWEEP_INTERVAL_MS = 12 * 60 * 60 * 1000;
const CHAT_MEDIA_RETENTION_DAYS = 30;
const PENDING_UPLOAD_TTL_HOURS = 24;
const SESSION_RETENTION_DAYS = 7;
const PROCESSED_OUTBOX_RETENTION_DAYS = 14;
const READ_NOTIFICATION_RETENTION_DAYS = 60;

export interface RetentionSweepSummary {
  deletedChatAssets: number;
  deletedPendingAssets: number;
  prunedSessions: number;
  prunedOutboxEvents: number;
  prunedNotifications: number;
}

/**
 * Automated retention and DB-bloat pruning worker.
 * Keeps PostgreSQL (Supabase free tier) lean by expiring 30-day chat photos/voices,
 * abandoned uploads, expired sessions, processed outbox events, and old read notifications.
 */
@Injectable()
export class MediaRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaRetentionService.name);
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Presigner: S3PresignerService
  ) {}

  onModuleInit(): void {
    if (
      process.env.NODE_ENV !== "test" &&
      process.env.VERCEL !== "1" &&
      process.env.ENABLE_BACKGROUND_WORKERS !== "false" &&
      process.env.DATABASE_URL
    ) {
      this.intervalHandle = setInterval(() => {
        void this.runScheduledSweep();
      }, CLEANUP_SWEEP_INTERVAL_MS);
      this.intervalHandle.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private async runScheduledSweep(): Promise<void> {
    try {
      const res = await this.runRetentionSweep();
      const total =
        res.deletedChatAssets +
        res.deletedPendingAssets +
        res.prunedSessions +
        res.prunedOutboxEvents +
        res.prunedNotifications;
      if (total > 0) {
        this.logger.log(
          `Retention sweep cleaned ${res.deletedChatAssets} chat media, ${res.deletedPendingAssets} pending uploads, ${res.prunedSessions} sessions, ${res.prunedOutboxEvents} outbox events, ${res.prunedNotifications} notifications.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Scheduled media/DB retention sweep skipped: ${msg}`);
    }
  }

  async runRetentionSweep(now: Date = new Date()): Promise<RetentionSweepSummary> {
    const chatCutoff = new Date(
      now.getTime() - CHAT_MEDIA_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );
    const pendingCutoff = new Date(
      now.getTime() - PENDING_UPLOAD_TTL_HOURS * 60 * 60 * 1000
    );
    const sessionCutoff = new Date(
      now.getTime() - SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );
    const outboxCutoff = new Date(
      now.getTime() - PROCESSED_OUTBOX_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );
    const notifCutoff = new Date(
      now.getTime() - READ_NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );

    // 1. Prune 30+ day old Messenger chat photos & voice notes (never touches stores/* product media)
    const oldChatAssets = await this.prisma.mediaAsset.findMany({
      where: {
        storeId: null,
        createdAt: { lt: chatCutoff },
        OR: [
          { objectKey: { startsWith: "chat/" } },
          { objectKey: { startsWith: "voice/" } }
        ]
      },
      take: 100
    });

    let deletedChatAssets = 0;
    for (const asset of oldChatAssets) {
      await this.s3Presigner.deleteObject(asset.objectKey).catch(() => undefined);
      await this.prisma.chatMessage.updateMany({
        where: { mediaAssetId: asset.id },
        data: { mediaAssetId: null }
      });
      await this.prisma.mediaAsset.deleteMany({
        where: { id: asset.id }
      });
      deletedChatAssets += 1;
    }

    // 2. Clean abandoned PENDING_UPLOAD rows (>24h)
    const abandoned = await this.prisma.mediaAsset.findMany({
      where: {
        status: "PENDING_UPLOAD",
        createdAt: { lt: pendingCutoff }
      },
      take: 100
    });
    let deletedPendingAssets = 0;
    for (const asset of abandoned) {
      await this.s3Presigner.deleteObject(asset.objectKey).catch(() => undefined);
      await this.prisma.mediaAsset.deleteMany({
        where: { id: asset.id }
      });
      deletedPendingAssets += 1;
    }

    // 3. Prune expired/revoked sessions, old processed outbox rows, and old read notifications
    const prunedSessionsRes = await this.prisma.userSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: sessionCutoff } },
          { revokedAt: { lt: sessionCutoff } }
        ]
      }
    });

    const prunedOutboxRes = await this.prisma.outboxEvent.deleteMany({
      where: {
        status: "PROCESSED",
        processedAt: { lt: outboxCutoff }
      }
    });

    const prunedNotifRes = await this.prisma.notification.deleteMany({
      where: {
        readAt: { not: null, lt: notifCutoff }
      }
    });

    return {
      deletedChatAssets,
      deletedPendingAssets,
      prunedSessions: prunedSessionsRes.count,
      prunedOutboxEvents: prunedOutboxRes.count,
      prunedNotifications: prunedNotifRes.count
    };
  }
}
