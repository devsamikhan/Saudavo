import { HttpStatus } from "@nestjs/common";
import {
  detectContactLeak,
  formatContactLeakMessage
} from "@saudavo/contracts";
import { DomainException } from "../errors/domain.exception";

/**
 * Enforces Saudavo's zero-leak privacy shield on user-authored text fields
 * (chat messages, listing descriptions, store profiles, and buyer demand posts).
 */
export function assertFieldsHaveNoContactLeak(
  entries: Array<{ label: string; value?: string | null }>
): void {
  for (const entry of entries) {
    const raw = entry.value?.trim();
    if (!raw) continue;
    const leak = detectContactLeak(raw);
    if (leak) {
      throw new DomainException(
        "PRIVACY_CONTACT_SHIELD",
        HttpStatus.BAD_REQUEST,
        `${entry.label}: ${formatContactLeakMessage(leak.kind)}`
      );
    }
  }
}
