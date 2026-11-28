export type ContactLeakKind =
  | "PHONE"
  | "EMAIL"
  | "EXTERNAL_LINK"
  | "BANK_IBAN";

export interface ContactLeakDetection {
  kind: ContactLeakKind;
  matchedText: string;
}

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PAK_IBAN_PATTERN = /\bPK[\s-]?\d{2}[\s-]?[A-Z]{4}(?:[\s-]?\d){12,18}\b/i;
const EXTERNAL_CHAT_APP_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|telegram\.me|bit\.ly|tinyurl\.com)\/\S*|whatsapp:\/\/\S+/i;
const GENERIC_URL_PATTERN = /(?:https?:\/\/|www\.)[^\s]+/i;
const ALLOWED_URL_HOST_PATTERN =
  /^https?:\/\/(?:www\.)?(?:saudavo-web\.vercel\.app|saudavo\.pk)(?:\/|$)/i;
const PAK_MOBILE_PATTERN = /(?:\+?92|0092|0)[\s.\-()]*3(?:[\s.\-()]*\d){9}/;
const FORMATTED_PHONE_CANDIDATE_PATTERN =
  /(?<![\d.])(?:\+?\d{1,4}[\s.\-()]+){2,}\d{2,5}(?![\d.])/;

/**
 * Detects personal contact details (phone numbers, emails, IBANs, external WhatsApp/chat URLs)
 * so buyers and sellers stay protected inside Saudavo without leaking off-platform contacts.
 */
export function detectContactLeak(text: string): ContactLeakDetection | null {
  const value = text.trim();
  if (!value) {
    return null;
  }

  const emailMatch = EMAIL_PATTERN.exec(value);
  if (emailMatch) {
    return { kind: "EMAIL", matchedText: emailMatch[0] };
  }

  const ibanMatch = PAK_IBAN_PATTERN.exec(value);
  if (ibanMatch) {
    return { kind: "BANK_IBAN", matchedText: ibanMatch[0] };
  }

  const chatAppMatch = EXTERNAL_CHAT_APP_PATTERN.exec(value);
  if (chatAppMatch) {
    return { kind: "EXTERNAL_LINK", matchedText: chatAppMatch[0] };
  }

  const urlMatch = GENERIC_URL_PATTERN.exec(value);
  if (urlMatch) {
    const candidateUrl = urlMatch[0].startsWith("http")
      ? urlMatch[0]
      : `https://${urlMatch[0]}`;
    if (!ALLOWED_URL_HOST_PATTERN.test(candidateUrl)) {
      return { kind: "EXTERNAL_LINK", matchedText: urlMatch[0] };
    }
  }

  const pakPhoneMatch = PAK_MOBILE_PATTERN.exec(value);
  if (pakPhoneMatch) {
    return { kind: "PHONE", matchedText: pakPhoneMatch[0] };
  }

  const formattedPhoneMatch = FORMATTED_PHONE_CANDIDATE_PATTERN.exec(value);
  if (formattedPhoneMatch) {
    const digitsOnly = formattedPhoneMatch[0].replace(/\D/g, "");
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return { kind: "PHONE", matchedText: formattedPhoneMatch[0] };
    }
  }

  return null;
}

export function formatContactLeakMessage(kind: ContactLeakKind): string {
  switch (kind) {
    case "PHONE":
      return "Phone numbers cannot be shared publicly or in chat. Please communicate safely inside Saudavo Messenger.";
    case "EMAIL":
      return "Email addresses cannot be shared in chat or listings. Keep all conversations inside Saudavo.";
    case "EXTERNAL_LINK":
      return "External links (such as WhatsApp, Telegram, or off-platform URLs) are not allowed. Use Saudavo Messenger instead.";
    case "BANK_IBAN":
      return "Personal bank or IBAN details cannot be shared in chat or listings.";
  }
}
