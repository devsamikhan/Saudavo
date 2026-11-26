import { Global, Module } from "@nestjs/common";
import { OutboxProcessorService } from "./outbox-processor.service";
import { OutboxService } from "./outbox.service";

@Global()
@Module({
  providers: [OutboxService, OutboxProcessorService],
  exports: [OutboxService, OutboxProcessorService]
})
export class OutboxModule {}
