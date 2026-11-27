import { HttpStatus } from "@nestjs/common";
import { DomainException } from "../src/common/errors/domain.exception";
import { HealthController } from "../src/health/health.controller";
import { HealthService } from "../src/health/health.service";
import { S3PresignerService } from "../src/modules/media/s3-presigner.service";

describe("Vercel Blob driver & Maintenance Cron security", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("activates Vercel Blob driver in non-test mode when BLOB_READ_WRITE_TOKEN is configured", () => {
    const presigner = new S3PresignerService();
    process.env.NODE_ENV = "production";
    delete process.env.STORAGE_DRIVER;
    delete process.env.S3_ENDPOINT;
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_token";

    expect(presigner.isVercelBlobDriver()).toBe(true);
    expect(presigner.isLocalDriver()).toBe(true);

    process.env.STORAGE_DRIVER = "local";
    expect(presigner.isVercelBlobDriver()).toBe(false);
    expect(presigner.isLocalDriver()).toBe(true);
  });

  it("rejects unauthorized cron requests and runs sweeps with matching CRON_SECRET", async () => {
    process.env.NODE_ENV = "production";
    process.env.CRON_SECRET = "cron_secret_test_value_32_chars";

    const outboxMock = {
      processDueEvents: jest.fn().mockResolvedValue({ processedCount: 2, failedCount: 0 })
    };
    const ordersMock = {
      runScheduledSweep: jest.fn().mockResolvedValue(undefined)
    };
    const retentionMock = {
      runRetentionSweep: jest.fn().mockResolvedValue({
        deletedChatAssets: 1,
        deletedPendingAssets: 0,
        prunedSessions: 3,
        prunedOutboxEvents: 0,
        prunedNotifications: 0
      })
    };

    const controller = new HealthController(
      new HealthService(),
      outboxMock as never,
      ordersMock as never,
      retentionMock as never
    );

    await expect(controller.runMaintenanceCron("Bearer wrong-secret")).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED
    });

    const result = await controller.runMaintenanceCron(
      "Bearer cron_secret_test_value_32_chars"
    );
    expect(result.data.ok).toBe(true);
    expect(result.data.outbox).toEqual({ processedCount: 2, failedCount: 0 });
    expect(outboxMock.processDueEvents).toHaveBeenCalledTimes(1);
    expect(ordersMock.runScheduledSweep).toHaveBeenCalledTimes(1);
    expect(retentionMock.runRetentionSweep).toHaveBeenCalledTimes(1);
  });

  it("requires CRON_SECRET in production when DomainException is thrown", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.CRON_SECRET;

    const controller = new HealthController(new HealthService());
    await expect(controller.runMaintenanceCron(undefined)).rejects.toBeInstanceOf(
      DomainException
    );
  });
});
