import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Shared Prisma ORM database client managed by NestJS lifecycle hooks.
 * Connects lazily in tests so offline unit/health specs do not require a live DB.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV !== "test" && process.env.DATABASE_URL) {
      await this.$connect();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (process.env.NODE_ENV !== "test") {
      await this.$disconnect();
    }
  }
}
