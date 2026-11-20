import { Injectable } from "@nestjs/common";
import { HealthResponse, HealthResponseSchema } from "@saudavo/contracts";
import { randomUUID } from "node:crypto";

/**
 * Provides basic service liveness metadata for scaffold verification.
 */
@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return HealthResponseSchema.parse({
      data: {
        status: "ok",
        service: "saudavo-api",
        environment: process.env.NODE_ENV ?? "development",
        timestamp: new Date().toISOString()
      },
      meta: {
        requestId: `req_${randomUUID()}`
      }
    });
  }
}
