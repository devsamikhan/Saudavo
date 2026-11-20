import { Controller, Get, Query, Req } from "@nestjs/common";
import { Roles } from "../../common/auth/decorators";
import { PrismaService } from "../../common/prisma/prisma.service";
import { type AppRequest, getRequestId } from "../../common/request-context";

@Controller("audit")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Roles("ADMIN", "SUPER_ADMIN")
  @Get("logs")
  async listLogs(
    @Req() req: AppRequest,
    @Query("limit") limitRaw?: string
  ): Promise<{
    data: Array<{
      id: string;
      actorId: string;
      actorRole: string;
      action: string;
      targetType: string;
      targetId: string;
      reason: string | null;
      createdAt: string;
    }>;
    meta: { requestId: string };
  }> {
    const parsedLimit = Number(limitRaw ?? "25");
    const take =
      Number.isFinite(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 100
        ? Math.floor(parsedLimit)
        : 25;

    const logs = await this.prisma.adminAuditLog.findMany({
      take,
      orderBy: { createdAt: "desc" }
    });

    return {
      data: logs.map((entry) => ({
        id: entry.id,
        actorId: entry.actorId,
        actorRole: entry.actorRole,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        reason: entry.reason,
        createdAt: entry.createdAt.toISOString()
      })),
      meta: { requestId: getRequestId(req) }
    };
  }
}
