import { Module } from "@nestjs/common";
import { SellerModule } from "../seller/seller.module";
import { MediaController } from "./media.controller";
import { MediaRetentionService } from "./media-retention.service";
import { MediaService } from "./media.service";
import { S3PresignerService } from "./s3-presigner.service";

@Module({
  imports: [SellerModule],
  controllers: [MediaController],
  providers: [MediaService, S3PresignerService, MediaRetentionService],
  exports: [MediaService, S3PresignerService, MediaRetentionService]
})
export class MediaModule {}
