import { PrismaService } from "../src/common/prisma/prisma.service";
import { OutboxProcessorService } from "../src/modules/outbox/outbox-processor.service";

describe("OutboxProcessorService", () => {
  it("marks due PENDING outbox events as PROCESSED", async () => {
    const updateManyMock = jest.fn().mockResolvedValue({ count: 1 });
    const findManyMock = jest.fn().mockResolvedValue([
      {
        id: "evt-1",
        eventType: "ORDER_CREATED",
        attempts: 0
      },
      {
        id: "evt-2",
        eventType: "SELLER_APPROVED",
        attempts: 1
      }
    ]);

    const mockPrisma = {
      outboxEvent: {
        findMany: findManyMock,
        updateMany: updateManyMock
      }
    } as unknown as PrismaService;

    const processor = new OutboxProcessorService(mockPrisma);
    const result = await processor.processDueEvents(10);

    expect(result).toEqual({ processedCount: 2, failedCount: 0 });
    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(updateManyMock).toHaveBeenCalledTimes(2);
    expect(updateManyMock).toHaveBeenNthCalledWith(1, {
      where: { id: "evt-1", status: "PENDING" },
      data: expect.objectContaining({
        status: "PROCESSED",
        attempts: 1
      })
    });
  });

  it("retries failed event updates with backoff and marks terminal failures", async () => {
    let callCount = 0;
    const updateManyMock = jest.fn().mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) {
        throw new Error("Transient DB error");
      }
      return { count: 1 };
    });

    const mockPrisma = {
      outboxEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "evt-fail",
            eventType: "ORDER_CREATED",
            attempts: 4
          }
        ]),
        updateMany: updateManyMock
      }
    } as unknown as PrismaService;

    const processor = new OutboxProcessorService(mockPrisma);
    const result = await processor.processDueEvents();

    expect(result).toEqual({ processedCount: 0, failedCount: 1 });
    expect(updateManyMock).toHaveBeenLastCalledWith({
      where: { id: "evt-fail", status: "PENDING" },
      data: expect.objectContaining({
        status: "FAILED",
        attempts: 5
      })
    });
  });
});
