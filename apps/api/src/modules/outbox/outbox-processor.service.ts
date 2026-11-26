import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

const MAX_OUTBOX_ATTEMPTS = 5;
const OUTBOX_POLL_INTERVAL_MS = 60_000;

/**
 * Lightweight DB-backed OutboxEvent dispatcher (no Redis/BullMQ in MVP per D-001/architecture).
 * Polls due PENDING events in production/development while staying inert during automated tests.
 */
@Injectable()
export class OutboxProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    if (
      process.env.NODE_ENV !== "test" &&
      process.env.ENABLE_BACKGROUND_WORKERS !== "false" &&
      process.env.DATABASE_URL
    ) {
      this.intervalHandle = setInterval(() => {
        void this.processDueEvents().catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Outbox background sweep skipped: ${message}`);
        });
      }, OUTBOX_POLL_INTERVAL_MS);
      this.intervalHandle.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Processes due PENDING OutboxEvent rows with bounded retry and exponential backoff.
   */
  async processDueEvents(limit = 25): Promise<{
    processedCount: number;
    failedCount: number;
  }> {
    if (this.isProcessing) {
      return { processedCount: 0, failedCount: 0 };
    }
    this.isProcessing = true;
    let processedCount = 0;
    let failedCount = 0;

    try {
      const now = new Date();
      const dueEvents = await this.prisma.outboxEvent.findMany({
        where: {
          status: "PENDING",
          nextAttemptAt: { lte: now },
          attempts: { lt: MAX_OUTBOX_ATTEMPTS }
        },
        orderBy: { createdAt: "asc" },
        take: limit
      });

      for (const evt of dueEvents) {
        try {
          // Events requiring immediate transactional email (password resets) are already
          // dispatched at request time; mark domain audit/notification bus entries processed.
          const updated = await this.prisma.outboxEvent.updateMany({
            where: { id: evt.id, status: "PENDING" },
            data: {
              status: "PROCESSED",
              processedAt: new Date(),
              attempts: evt.attempts + 1
            }
          });
          if (updated.count === 1) {
            processedCount += 1;
          }
        } catch {
          const nextAttempts = evt.attempts + 1;
          const terminal = nextAttempts >= MAX_OUTBOX_ATTEMPTS;
          const backoffMs = 60_000 * 2 ** Math.min(nextAttempts, 5);
          await this.prisma.outboxEvent.updateMany({
            where: { id: evt.id, status: "PENDING" },
            data: {
              status: terminal ? "FAILED" : "PENDING",
              attempts: nextAttempts,
              nextAttemptAt: new Date(Date.now() + backoffMs)
            }
          });
          if (terminal) {
            failedCount += 1;
          }
        }
      }

      return { processedCount, failedCount };
    } finally {
      this.isProcessing = false;
    }
  }
}
