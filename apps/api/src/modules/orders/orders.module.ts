import { Module } from "@nestjs/common";
import { CustomerModule } from "../customer/customer.module";
import { DealsModule } from "../deals/deals.module";
import { FinanceModule } from "../finance/finance.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SellerModule } from "../seller/seller.module";
import { AdminOrdersController } from "./admin-orders.controller";
import { CustomerOrdersController } from "./customer-orders.controller";
import { OrdersSchedulerService } from "./orders-scheduler.service";
import { OrdersService } from "./orders.service";
import { SellerOrdersController } from "./seller-orders.controller";

@Module({
  imports: [CustomerModule, SellerModule, FinanceModule, NotificationsModule, DealsModule],
  controllers: [
    CustomerOrdersController,
    SellerOrdersController,
    AdminOrdersController
  ],
  providers: [OrdersService, OrdersSchedulerService],
  exports: [OrdersService]
})
export class OrdersModule {}
