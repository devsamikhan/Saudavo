import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

export interface EnqueueOutboxEventInput {
  eventType: string;
  aggregateType?: string | null;
  aggregateId?: string | null;
  payloadJson: Prisma.InputJsonValue;
  nextAttemptAt?: Date;
}

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(
    input: EnqueueOutboxEventInput,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string }> {
    const db = tx ?? this.prisma;
    const created = await db.outboxEvent.create({
      data: {
        eventType: input.eventType,
        aggregateType: input.aggregateType ?? null,
        aggregateId: input.aggregateId ?? null,
        payloadJson: input.payloadJson,
        status: "PENDING",
        ...(input.nextAttemptAt ? { nextAttemptAt: input.nextAttemptAt } : {})
      },
      select: { id: true }
    });
    return created;
  }
}
