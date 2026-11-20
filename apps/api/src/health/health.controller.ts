import { Controller, Get } from "@nestjs/common";
import { HealthResponse } from "@saudavo/contracts";
import { Public } from "../common/auth/decorators";
import { HealthService } from "./health.service";

/**
 * Health endpoint exposed under /api/v1/health.
 */
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  getHealth(): HealthResponse {
    return this.healthService.getHealth();
  }
}
