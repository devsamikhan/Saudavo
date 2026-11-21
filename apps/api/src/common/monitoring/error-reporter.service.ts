import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";

export interface ParsedSentryDsn {
  envelopeUrl: string;
  publicKey: string;
  projectId: string;
  rawDsn: string;
}

/**
 * Redacts credentials, cookies, CSRF/reset tokens, database DSNs, emails, and Pakistani phone numbers
 * before logs or error payloads leave the API boundary.
 */
export function redactSensitiveText(raw: string): string {
  return raw
    .replace(/(postgres(?:ql)?:\/\/)[^\s"']+/gi, "$1[REDACTED_DSN]")
    .replace(
      /((?:password|secret|token|csrf|saudavo_sid|cookie|authorization|api[_-]?key)\s*[:=]\s*)([^\s,;'"&]+)/gi,
      "$1[REDACTED_SECRET]"
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/(?:\+?92|0)3\d{2}[\s-]?\d{7}\b/g, "[REDACTED_PHONE]");
}

/**
 * Parses a Sentry DSN into its Envelope API URL while failing safe on empty or invalid strings.
 */
export function parseSentryDsn(rawDsn: string | undefined): ParsedSentryDsn | null {
  const trimmed = rawDsn?.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    const publicKey = parsed.username;
    const segments = parsed.pathname.split("/").filter(Boolean);
    const projectId = segments.pop();
    if (!publicKey || !projectId) {
      return null;
    }
    const basePrefix = segments.length > 0 ? `/${segments.join("/")}` : "";
    const envelopeUrl = `${parsed.protocol}//${parsed.host}${basePrefix}/api/${projectId}/envelope/`;
    return {
      envelopeUrl,
      publicKey,
      projectId,
      rawDsn: trimmed
    };
  } catch {
    return null;
  }
}

@Injectable()
export class ErrorReporterService {
  private readonly logger = new Logger(ErrorReporterService.name);

  reportUnhandledException(input: {
    requestId: string;
    method: string;
    url: string;
    error: unknown;
  }): void {
    const rawMsg =
      input.error instanceof Error ? input.error.message : "Unknown non-Error exception";
    const safeMsg = redactSensitiveText(rawMsg);
    const safePath = redactSensitiveText(input.url.split("?")[0] ?? input.url);

    this.logger.error(
      `[${input.requestId}] Unhandled error on ${input.method} ${safePath}: ${safeMsg}`
    );

    const parsedDsn = parseSentryDsn(process.env.SENTRY_DSN);
    if (!parsedDsn || process.env.NODE_ENV === "test") {
      return;
    }

    void this.dispatchSentryEnvelope(parsedDsn, {
      requestId: input.requestId,
      method: input.method,
      path: safePath,
      errorType: input.error instanceof Error ? input.error.name : "Error",
      message: safeMsg
    }).catch(() => {
      // Never allow monitoring transport errors to crash exception responses
    });
  }

  async dispatchSentryEnvelope(
    dsn: ParsedSentryDsn,
    details: {
      requestId: string;
      method: string;
      path: string;
      errorType: string;
      message: string;
    }
  ): Promise<void> {
    const eventId = randomUUID().replace(/-/g, "");
    const sentAt = new Date().toISOString();
    const header = JSON.stringify({
      event_id: eventId,
      sent_at: sentAt,
      dsn: dsn.rawDsn
    });
    const itemHeader = JSON.stringify({ type: "event" });
    const eventBody = JSON.stringify({
      event_id: eventId,
      timestamp: sentAt,
      level: "error",
      platform: "node",
      environment: process.env.NODE_ENV ?? "development",
      tags: {
        request_id: details.requestId,
        http_method: details.method
      },
      request: {
        method: details.method,
        url: details.path
      },
      exception: {
        values: [
          {
            type: details.errorType,
            value: details.message
          }
        ]
      }
    });

    const envelope = `${header}\n${itemHeader}\n${eventBody}\n`;
    await fetch(dsn.envelopeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=saudavo-api/0.1.0`
      },
      body: envelope
    });
  }
}
