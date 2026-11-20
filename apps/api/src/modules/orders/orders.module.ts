import { Module } from "@nestjs/common";
import { CustomerModule } from "../customer/customer.module";
import { FinanceModule } from "../finance/finance.module";
import { SellerModule } from "../seller/seller.module";
import { CustomerOrdersController } from "./customer-orders.controller";
import { OrdersService } from "./orders.service";
import { SellerOrdersController } from "./seller-orders.controller";

@Module({
  imports: [CustomerModule, SellerModule, FinanceModule],
  controllers: [CustomerOrdersController, SellerOrdersController],
  providers: [OrdersService],
  exports: [OrdersService]
})
export class OrdersModule {}
