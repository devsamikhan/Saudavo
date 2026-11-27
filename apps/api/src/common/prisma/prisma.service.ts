import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const MAX_DB_CONNECT_ATTEMPTS = 5;
const DB_RETRY_BASE_DELAY_MS = 1500;

/**
 * Shared Prisma ORM database client managed by NestJS lifecycle hooks.
 * Connects lazily in tests so offline unit/health specs do not require a live DB,
 * and retries transient pooler cold-start errors (e.g. P1001) on boot.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    if (
      process.env.NODE_ENV !== "test" &&
      process.env.VERCEL !== "1" &&
      process.env.DATABASE_URL
    ) {
      await this.connectWithRetry();
    }
  }

  private async connectWithRetry(): Promise<void> {
    for (let attempt = 1; attempt <= MAX_DB_CONNECT_ATTEMPTS; attempt += 1) {
      try {
        await this.$connect();
        return;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt >= MAX_DB_CONNECT_ATTEMPTS) {
          this.logger.error(
            `Database connection failed after ${MAX_DB_CONNECT_ATTEMPTS} attempts: ${message}`
          );
          throw error;
        }
        const delayMs = DB_RETRY_BASE_DELAY_MS * attempt;
        this.logger.warn(
          `Database connection attempt ${attempt}/${MAX_DB_CONNECT_ATTEMPTS} failed (${message}); retrying in ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (process.env.NODE_ENV !== "test") {
      await this.$disconnect();
    }
  }
}
