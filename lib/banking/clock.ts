// Single source of truth for "what day is it" across client, server, and cron.
// All bill-pay / scheduling date math is anchored to the bank's business timezone
// so a customer in any zone agrees with the server on which calendar day it is.

export const BANK_TIMEZONE = process.env.NEXT_PUBLIC_BANK_TIMEZONE || "America/Los_Angeles";

// Returns today's date in the bank's timezone as a YYYY-MM-DD string.
// 'en-CA' is used because it formats as ISO-style YYYY-MM-DD.
export function todayInBankTz(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BANK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
