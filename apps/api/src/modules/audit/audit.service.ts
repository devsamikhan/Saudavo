import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { RoleCode } from "@saudavo/contracts";
import { PrismaService } from "../../common/prisma/prisma.service";

export interface RecordAuditLogInput {
  actorId: string;
  actorRole: RoleCode | string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  beforeJson?: Prisma.InputJsonValue;
  afterJson?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    input: RecordAuditLogInput,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const db = tx ?? this.prisma;
    await db.adminAuditLog.create({
      data: {
        actorId: input.actorId,
        actorRole: input.actorRole,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason ?? null,
        ...(input.beforeJson !== undefined ? { beforeJson: input.beforeJson } : {}),
        ...(input.afterJson !== undefined ? { afterJson: input.afterJson } : {}),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null
      }
    });
  }
}
