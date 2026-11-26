import { Body, Controller, Get, Param, Patch, Req } from "@nestjs/common";
import { UpdateFeatureFlagRequestSchema } from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser, Public, Roles } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { HttpStatus } from "@nestjs/common";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { FeatureFlagsService } from "./feature-flags.service";

@Controller()
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Public()
  @Get("features")
  getPublicFeatures(@Req() req: AppRequest) {
    return this.featureFlagsService.getPublicMap(getRequestId(req));
  }

  @Roles("ADMIN", "SUPER_ADMIN")
  @Get("admin/features")
  listAdminFeatures(@Req() req: AppRequest) {
    return this.featureFlagsService.listAdminFlags(getRequestId(req));
  }

  @Roles("ADMIN", "SUPER_ADMIN")
  @Patch("admin/features/:key")
  updateFeatureFlag(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("key") key: string,
    @Body(new ZodValidationPipe(UpdateFeatureFlagRequestSchema))
    body: ReturnType<typeof UpdateFeatureFlagRequestSchema.parse>,
    @Req() req: AppRequest
  ) {
    if (!auth) {
      throw new DomainException("UNAUTHORIZED", HttpStatus.UNAUTHORIZED, "Authentication required.");
    }
    return this.featureFlagsService.updateFlag(
      auth,
      key,
      body,
      {
        ipAddress: req.ip ?? null,
        userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null
      },
      getRequestId(req)
    );
  }
}
