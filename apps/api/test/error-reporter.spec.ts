import {
  ErrorReporterService,
  parseSentryDsn,
  redactSensitiveText
} from "../src/common/monitoring/error-reporter.service";

describe("Error monitoring & PII/secret redaction", () => {
  const originalFetch = global.fetch;
  const originalDsn = process.env.SENTRY_DSN;
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.SENTRY_DSN = originalDsn;
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  it("redacts emails, Pakistani phone numbers, Postgres DSNs, and token/password pairs", () => {
    const raw =
      "Failed for ali@saudavo.pk phone +923001234567 (0312-9876543) token=abc123xyz password:mySecret!9 postgresql://postgres:secret@db.internal:5432/saudavo";

    const clean = redactSensitiveText(raw);

    expect(clean).not.toContain("ali@saudavo.pk");
    expect(clean).not.toContain("3001234567");
    expect(clean).not.toContain("9876543");
    expect(clean).not.toContain("abc123xyz");
    expect(clean).not.toContain("mySecret!9");
    expect(clean).not.toContain("postgres:secret@db.internal");
    expect(clean).toContain("[REDACTED_EMAIL]");
    expect(clean).toContain("[REDACTED_PHONE]");
    expect(clean).toContain("[REDACTED_SECRET]");
    expect(clean).toContain("postgresql://[REDACTED_DSN]");
  });

  it("parses valid Sentry DSNs and fails safe on malformed values", () => {
    expect(parseSentryDsn(undefined)).toBeNull();
    expect(parseSentryDsn("")).toBeNull();
    expect(parseSentryDsn("not-a-url")).toBeNull();

    const parsed = parseSentryDsn("https://pub123@o456.ingest.sentry.io/7890");
    expect(parsed).toEqual({
      envelopeUrl: "https://o456.ingest.sentry.io/api/7890/envelope/",
      publicKey: "pub123",
      projectId: "7890",
      rawDsn: "https://pub123@o456.ingest.sentry.io/7890"
    });
  });

  it("dispatches scrubbed exception envelopes when SENTRY_DSN is set outside NODE_ENV=test", async () => {
    process.env.SENTRY_DSN = "https://pub123@o456.ingest.sentry.io/7890";
    process.env.NODE_ENV = "production";

    const calls: Array<{ url: string; body: string }> = [];
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: typeof input === "string" ? input : input.toString(),
        body: String(init?.body ?? "")
      });
      return new Response(JSON.stringify({ id: "evt_1" }), { status: 200 });
    }) as typeof fetch;

    const reporter = new ErrorReporterService();
    reporter.reportUnhandledException({
      requestId: "req_mon_1",
      method: "POST",
      url: "/api/v1/orders?token=secret999",
      error: new Error("Failure for seller@saudavo.pk phone 03001234567")
    });

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://o456.ingest.sentry.io/api/7890/envelope/");
    expect(calls[0]?.body).not.toContain("seller@saudavo.pk");
    expect(calls[0]?.body).not.toContain("03001234567");
    expect(calls[0]?.body).not.toContain("secret999");
    expect(calls[0]?.body).toContain("req_mon_1");
  });
});
