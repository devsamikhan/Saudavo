import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module";
import { SellerModule } from "../seller/seller.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { CatalogService } from "./catalog.service";
import { PublicCatalogController } from "./public-catalog.controller";
import { SellerCatalogController } from "./seller-catalog.controller";

@Module({
  imports: [SellerModule, MediaModule, SubscriptionsModule],
  controllers: [SellerCatalogController, PublicCatalogController],
  providers: [CatalogService],
  exports: [CatalogService]
})
export class CatalogModule {}
