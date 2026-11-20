import { Module } from "@nestjs/common";
import { FinanceModule } from "../finance/finance.module";
import { TrustController } from "./trust.controller";
import { TrustService } from "./trust.service";

@Module({
  imports: [FinanceModule],
  controllers: [TrustController],
  providers: [TrustService],
  exports: [TrustService]
})
export class TrustModule {}
