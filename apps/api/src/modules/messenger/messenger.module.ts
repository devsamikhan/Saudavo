import { Module } from "@nestjs/common";
import { CustomerModule } from "../customer/customer.module";
import { FinanceModule } from "../finance/finance.module";
import { MediaModule } from "../media/media.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { MessengerController } from "./messenger.controller";
import { MessengerService } from "./messenger.service";

@Module({
  imports: [
    CustomerModule,
    FinanceModule,
    MediaModule,
    NotificationsModule,
    SubscriptionsModule
  ],
  controllers: [MessengerController],
  providers: [MessengerService],
  exports: [MessengerService]
})
export class MessengerModule {}
