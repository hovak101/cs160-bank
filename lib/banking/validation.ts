export function validateMoneyAmount(amount: number, max = 10_000): string | null {
  if (!Number.isFinite(amount)) return "Amount must be a valid number";
  if (amount <= 0) return "Amount must be greater than zero";
  if (amount > max) return `Amount exceeds maximum of $${max.toLocaleString()}`;
  if (!Number.isSafeInteger(Math.round(amount * 100))) return "Amount precision invalid";
  return null;
}

// Compares two YYYY-MM-DD strings as plain calendar days. Caller supplies "today"
// in the bank's timezone (see lib/banking/clock.ts) so client/server/cron agree.
export function validateNotPastDate(
  dateString: string | undefined | null,
  todayYmd: string,
  label = "Date",
): string | null {
  if (!dateString) return `${label} is required`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return `${label} is invalid`;
  if (dateString < todayYmd) return `${label} cannot be in the past`;
  return null;
}
