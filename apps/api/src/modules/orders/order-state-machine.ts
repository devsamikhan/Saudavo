import { HttpStatus } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { DomainException } from "../../common/errors/domain.exception";

const PHYSICAL_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "READY_FOR_DISPATCH", "CANCELLED"],
  PREPARING: ["READY_FOR_DISPATCH", "CANCELLED"],
  READY_FOR_DISPATCH: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "DELIVERY_FAILED"],
  DELIVERY_FAILED: ["OUT_FOR_DELIVERY", "CANCELLED"]
};

const SERVICE_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["DELIVERY_SUBMITTED"],
  REVISION_REQUESTED: ["IN_PROGRESS", "DELIVERY_SUBMITTED"]
};

export function assertPhysicalSellerTransition(
  fromStatus: string,
  toStatus: string,
  fulfilmentMode: string
): void {
  const allowed = PHYSICAL_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) {
    throw new DomainException(
      "INVALID_STATE_TRANSITION",
      HttpStatus.CONFLICT,
      `Cannot transition physical order from ${fromStatus} to ${toStatus}.`
    );
  }
  if (toStatus === "OUT_FOR_DELIVERY" && fulfilmentMode === "CUSTOMER_PICKUP") {
    throw new DomainException(
      "INVALID_STATE_TRANSITION",
      HttpStatus.CONFLICT,
      "Customer pickup orders transition directly from READY_FOR_DISPATCH to DELIVERED."
    );
  }
}

export function assertServiceSellerTransition(
  fromStatus: string,
  toStatus: string
): void {
  const allowed = SERVICE_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) {
    throw new DomainException(
      "INVALID_STATE_TRANSITION",
      HttpStatus.CONFLICT,
      `Cannot transition service order from ${fromStatus} to ${toStatus}.`
    );
  }
}

export function generateOrderNumber(districtCode = "MWL"): string {
  const prefix = districtCode.slice(0, 3).toUpperCase();
  const now = new Date();
  const datePart = `${String(now.getUTCFullYear())}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${datePart}-${suffix}`;
}
