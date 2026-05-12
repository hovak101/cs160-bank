export const MAX_EMAIL_LENGTH = 254;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailValidationResult =
  | {
      ok: true;
      value: string;
    }
  | {
      ok: false;
      error: string;
    };

export function validateEmailAddress(rawValue: unknown): EmailValidationResult {
  const value = String(rawValue ?? "").trim();

  if (!value) {
    return {
      ok: false,
      error: "Email is required.",
    };
  }

  if (value.length > MAX_EMAIL_LENGTH) {
    return {
      ok: false,
      error: "Please enter a valid email address.",
    };
  }

  if (!EMAIL_PATTERN.test(value)) {
    return {
      ok: false,
      error: "Please enter a valid email address.",
    };
  }

  return {
    ok: true,
    value,
  };
}
