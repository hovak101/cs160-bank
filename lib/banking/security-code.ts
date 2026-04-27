export const CREDIT_CARD_SECURITY_CODE_LENGTH = 3;

export function normalizeSecurityCode(value: unknown) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, CREDIT_CARD_SECURITY_CODE_LENGTH);
}

export function isValidSecurityCodeFormat(value: string) {
  return new RegExp(`^\\d{${CREDIT_CARD_SECURITY_CODE_LENGTH}}$`).test(value);
}

export function getLegacyDemoSecurityCodeHint(cardLast4: string | null | undefined) {
  const last4 = String(cardLast4 ?? "").replace(/\D/g, "").slice(-4);

  if (last4.length !== 4) {
    return null;
  }

  return last4.slice(-3);
}
