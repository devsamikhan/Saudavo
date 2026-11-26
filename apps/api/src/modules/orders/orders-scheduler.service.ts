import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { OrdersService } from "./orders.service";

const AUTO_COMPLETE_SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Periodic 6-hour background scheduler running PQ-10 (D-036) 7-day service auto-completion.
 * Kept inert in automated test environments to avoid open timer handles.
 */
@Injectable()
export class OrdersSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersSchedulerService.name);
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(private readonly ordersService: OrdersService) {}

  onModuleInit(): void {
    if (
      process.env.NODE_ENV !== "test" &&
      process.env.ENABLE_BACKGROUND_WORKERS !== "false" &&
      process.env.DATABASE_URL
    ) {
      this.intervalHandle = setInterval(() => {
        void this.runScheduledSweep();
      }, AUTO_COMPLETE_SWEEP_INTERVAL_MS);
      this.intervalHandle.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async runScheduledSweep(): Promise<void> {
    try {
      const result = await this.ordersService.autoCompleteExpiredServiceOrders({
        actorRole: "SYSTEM"
      });
      if (result.completedOrderIds.length > 0) {
        this.logger.log(
          `Scheduled PQ-10 sweep completed ${result.completedOrderIds.length} expired service order(s).`
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Scheduled PQ-10 sweep failed cleanly: ${message}`);
    }
  }
}
