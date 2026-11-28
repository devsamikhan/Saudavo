import type { PrismaService } from "../prisma/prisma.service";

export interface StoreTrustMetrics {
  completedOrdersCount: number;
  avgResponseMinutes: number | null;
  responseRatePercent: number | null;
  followerCount: number;
}

/**
 * Computes real marketplace trust & responsiveness signals for a verified store
 * from completed orders, follower counts, and Messenger buyer->seller reply latency.
 */
export async function loadStoreTrustMetrics(
  prisma: PrismaService,
  storeId: string
): Promise<StoreTrustMetrics> {
  const [completedOrdersCount, followerCount, conversations] = await Promise.all([
    prisma.order.count({
      where: { storeId, status: "COMPLETED" }
    }),
    prisma.storeFollower.count({
      where: { storeId }
    }),
    prisma.conversation.findMany({
      where: { storeId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 25
        }
      },
      orderBy: { lastMessageAt: "desc" },
      take: 30
    })
  ]);

  let buyerInquiries = 0;
  let repliedInquiries = 0;
  let totalReplyMinutes = 0;

  for (const conv of conversations) {
    const msgs = [...conv.messages].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const firstBuyerMsg = msgs.find((m) => m.senderRole === "BUYER");
    if (!firstBuyerMsg) continue;
    buyerInquiries += 1;

    const firstSellerReply = msgs.find(
      (m) =>
        m.senderRole === "SELLER" &&
        m.createdAt.getTime() >= firstBuyerMsg.createdAt.getTime()
    );
    if (firstSellerReply) {
      repliedInquiries += 1;
      const diffMinutes = Math.max(
        1,
        Math.round(
          (firstSellerReply.createdAt.getTime() -
            firstBuyerMsg.createdAt.getTime()) /
            60_000
        )
      );
      totalReplyMinutes += diffMinutes;
    }
  }

  return {
    completedOrdersCount,
    followerCount,
    avgResponseMinutes:
      repliedInquiries > 0
        ? Math.round(totalReplyMinutes / repliedInquiries)
        : null,
    responseRatePercent:
      buyerInquiries > 0
        ? Math.round((repliedInquiries / buyerInquiries) * 100)
        : null
  };
}
