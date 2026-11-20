import { Module } from "@nestjs/common";
import { SellerModule } from "../seller/seller.module";
import { CatalogService } from "./catalog.service";
import { PublicCatalogController } from "./public-catalog.controller";
import { SellerCatalogController } from "./seller-catalog.controller";

@Module({
  imports: [SellerModule],
  controllers: [SellerCatalogController, PublicCatalogController],
  providers: [CatalogService],
  exports: [CatalogService]
})
export class CatalogModule {}
