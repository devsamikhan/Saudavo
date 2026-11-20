import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { sha256Hex } from "../auth/crypto.util";
import { DomainException } from "../errors/domain.exception";
import { PrismaService } from "../prisma/prisma.service";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`
  );
  return `{${entries.join(",")}}`;
}

export interface IdempotentExecutionInput<T> {
  userId: string;
  endpoint: string;
  keyValue: string | undefined;
  payload: unknown;
  statusCode?: number;
  run: (tx: Prisma.TransactionClient) => Promise<T>;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  requireKey(rawHeader: string | undefined): string {
    const trimmed = rawHeader?.trim();
    if (!trimmed || trimmed.length < 8 || trimmed.length > 128) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "A valid Idempotency-Key header (8-128 characters) is required."
      );
    }
    return trimmed;
  }

  async execute<T extends Prisma.InputJsonValue>(
    input: IdempotentExecutionInput<T>
  ): Promise<T> {
    const keyValue = this.requireKey(input.keyValue);
    const requestHash = sha256Hex(stableStringify(input.payload));
    const now = new Date();

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: {
        userId_endpoint_keyValue: {
          userId: input.userId,
          endpoint: input.endpoint,
          keyValue
        }
      }
    });

    if (existing && existing.expiresAt.getTime() > now.getTime()) {
      if (existing.requestHash !== requestHash) {
        throw new DomainException(
          "CONFLICT",
          HttpStatus.CONFLICT,
          "Idempotency-Key was already used with a different request payload."
        );
      }
      if (existing.responseBodyJson !== null) {
        return existing.responseBodyJson as T;
      }
    }

    const statusCode = input.statusCode ?? HttpStatus.OK;
    const expiresAt = new Date(now.getTime() + IDEMPOTENCY_TTL_MS);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const result = await input.run(tx);

        await tx.idempotencyKey.upsert({
          where: {
            userId_endpoint_keyValue: {
              userId: input.userId,
              endpoint: input.endpoint,
              keyValue
            }
          },
          update: {
            requestHash,
            responseStatus: statusCode,
            responseBodyJson: result,
            expiresAt
          },
          create: {
            userId: input.userId,
            endpoint: input.endpoint,
            keyValue,
            requestHash,
            responseStatus: statusCode,
            responseBodyJson: result,
            expiresAt
          }
        });

        return result;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const raceWinner = await this.prisma.idempotencyKey.findUnique({
          where: {
            userId_endpoint_keyValue: {
              userId: input.userId,
              endpoint: input.endpoint,
              keyValue
            }
          }
        });
        if (raceWinner && raceWinner.requestHash === requestHash && raceWinner.responseBodyJson !== null) {
          return raceWinner.responseBodyJson as T;
        }
        throw new DomainException(
          "CONFLICT",
          HttpStatus.CONFLICT,
          "Concurrent duplicate Idempotency-Key detected."
        );
      }
      throw error;
    }
  }
}
