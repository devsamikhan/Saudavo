import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { SellerModule } from "../seller/seller.module";
import { SubscriptionsController } from "./subscriptions.controller";
import { SubscriptionsService } from "./subscriptions.service";

@Module({
  imports: [SellerModule, NotificationsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService]
})
export class SubscriptionsModule {}
