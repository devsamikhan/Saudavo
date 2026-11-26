import { Module } from "@nestjs/common";
import { MessengerModule } from "../messenger/messenger.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SellerModule } from "../seller/seller.module";
import { DemandsController } from "./demands.controller";
import { DemandsService } from "./demands.service";

@Module({
  imports: [SellerModule, MessengerModule, NotificationsModule],
  controllers: [DemandsController],
  providers: [DemandsService],
  exports: [DemandsService]
})
export class DemandsModule {}
