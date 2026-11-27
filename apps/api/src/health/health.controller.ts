import { Controller, Get, Headers, HttpStatus, Optional } from "@nestjs/common";
import type { HealthResponse } from "@saudavo/contracts";
import { timingSafeEqual } from "node:crypto";
import { Public } from "../common/auth/decorators";
import { DomainException } from "../common/errors/domain.exception";
import { MediaRetentionService } from "../modules/media/media-retention.service";
import { OrdersSchedulerService } from "../modules/orders/orders-scheduler.service";
import { OutboxProcessorService } from "../modules/outbox/outbox-processor.service";
import { HealthService } from "./health.service";

function tokensMatch(expected: string, actual: string): boolean {
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(actual, "utf8");
  if (expectedBuf.length === 0 || expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Health and scheduled maintenance endpoints exposed under /api/v1/health.
 */
@Controller("health")
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    @Optional() private readonly outboxProcessor?: OutboxProcessorService,
    @Optional() private readonly ordersScheduler?: OrdersSchedulerService,
    @Optional() private readonly mediaRetention?: MediaRetentionService
  ) {}

  @Public()
  @Get()
  getHealth(): HealthResponse {
    return this.healthService.getHealth();
  }

  /**
   * Vercel Cron maintenance endpoint for outbox delivery, service order auto-completion, and media retention.
   */
  @Public()
  @Get("cron")
  async runMaintenanceCron(
    @Headers("authorization") authorization?: string
  ) {
    const cronSecret = process.env.CRON_SECRET?.trim();
    if (cronSecret) {
      const provided = authorization?.replace(/^Bearer\s+/i, "").trim() ?? "";
      if (!tokensMatch(cronSecret, provided)) {
        throw new DomainException(
          "UNAUTHORIZED",
          HttpStatus.UNAUTHORIZED,
          "Invalid maintenance cron authorization token."
        );
      }
    } else if (process.env.NODE_ENV === "production") {
      throw new DomainException(
        "UNAUTHORIZED",
        HttpStatus.UNAUTHORIZED,
        "CRON_SECRET is required in production."
      );
    }

    const outbox = this.outboxProcessor
      ? await this.outboxProcessor.processDueEvents()
      : { processedCount: 0, failedCount: 0 };
    if (this.ordersScheduler) {
      await this.ordersScheduler.runScheduledSweep();
    }
    const retention = this.mediaRetention
      ? await this.mediaRetention.runRetentionSweep()
      : null;

    return {
      data: {
        ok: true,
        outbox,
        retention
      },
      meta: {
        executedAt: new Date().toISOString()
      }
    };
  }
}
