export function validateMoneyAmount(amount: number, max = 10_000): string | null {
  if (!Number.isFinite(amount)) return "Amount must be a valid number";
  if (amount <= 0) return "Amount must be greater than zero";
  if (amount > max) return `Amount exceeds maximum of $${max.toLocaleString()}`;
  if (!Number.isSafeInteger(Math.round(amount * 100))) return "Amount precision invalid";
  return null;
}
