import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, confirmPasswordReset, requestPasswordReset } from "../src/lib/api-client";

describe("apiRequest network failure handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("wraps fetch network failures as typed 503 API_UNREACHABLE errors", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      requestPasswordReset({ identifier: "samikhanniazi285@gmail.com" })
    ).rejects.toMatchObject({
      name: "ApiClientError",
      status: 503,
      code: "API_UNREACHABLE"
    });

    try {
      await confirmPasswordReset({
        token: "sample_valid_length_token_123456",
        newPassword: "StrongPassword123!"
      });
      expect.unreachable("Expected confirmPasswordReset to reject");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiClientError);
      if (err instanceof ApiClientError) {
        expect(err.code).toBe("API_UNREACHABLE");
        expect(err.status).toBe(503);
      }
    }
  });
});
