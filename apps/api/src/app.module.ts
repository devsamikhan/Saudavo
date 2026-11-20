import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CsrfGuard } from "./common/auth/guards/csrf.guard";
import { MfaGuard } from "./common/auth/guards/mfa.guard";
import { RolesGuard } from "./common/auth/guards/roles.guard";
import { SessionAuthGuard } from "./common/auth/guards/session-auth.guard";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { IdempotencyModule } from "./common/idempotency/idempotency.module";
import { RequestIdInterceptor } from "./common/interceptors/request-id.interceptor";
import { PrismaModule } from "./common/prisma/prisma.module";
import { RateLimitGuard } from "./common/rate-limit/rate-limit.guard";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CartModule } from "./modules/cart/cart.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { CustomerModule } from "./modules/customer/customer.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { LocationsModule } from "./modules/locations/locations.module";
import { MediaModule } from "./modules/media/media.module";
import { ModerationModule } from "./modules/moderation/moderation.module";
import { OpenApiModule } from "./modules/openapi/openapi.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { OutboxModule } from "./modules/outbox/outbox.module";
import { SellerModule } from "./modules/seller/seller.module";
import { TrustModule } from "./modules/trust/trust.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    PrismaModule,
    IdempotencyModule,
    AuditModule,
    OutboxModule,
    LocationsModule,
    UsersModule,
    AuthModule,
    CustomerModule,
    SellerModule,
    CatalogModule,
    MediaModule,
    CartModule,
    FinanceModule,
    OrdersModule,
    TrustModule,
    ModerationModule,
    OpenApiModule
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    RateLimitGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestIdInterceptor
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter
    },
    {
      provide: APP_GUARD,
      useExisting: RateLimitGuard
    },
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    },
    {
      provide: APP_GUARD,
      useClass: MfaGuard
    }
  ]
})
export class AppModule {}
