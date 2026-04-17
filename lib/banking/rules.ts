import type { Database } from "@/lib/supabase/database.types";

export type AccountType = Database["public"]["Enums"]["account_type"];

export const SAVINGS_APY = 0.04;
export const SAVINGS_MONTHLY_WITHDRAWAL_CAP_RATE = 0.1;

export const CREDIT_DEFAULT_LIMIT = 5000;
export const CREDIT_PURCHASE_APR = 24.99;
export const CREDIT_CASH_ADVANCE_APR = 29.99;
export const CREDIT_CASH_ADVANCE_FEE_RATE = 0.05;
export const CREDIT_CASH_ADVANCE_MIN_FEE = 10;
export const CREDIT_CASH_ADVANCE_LIMIT_RATE = 0.3;
export const CREDIT_LATE_FEE = 35;
export const CREDIT_MINIMUM_PAYMENT_RATE = 0.02;
export const CREDIT_MINIMUM_PAYMENT_FLOOR = 25;
export const CREDIT_REWARDS_RATE = 0.015;

export function roundCurrency(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function getMonthlySavingsRate(apy = SAVINGS_APY) {
  return Math.pow(1 + apy, 1 / 12) - 1;
}

export function computeSavingsInterest(balance: number, apy = SAVINGS_APY) {
  return roundCurrency(Number(balance || 0) * getMonthlySavingsRate(apy));
}

export function computeSavingsWithdrawalCap(openingBalance: number) {
  return roundCurrency(
    Number(openingBalance || 0) * SAVINGS_MONTHLY_WITHDRAWAL_CAP_RATE
  );
}

export function computeCreditCashAdvanceLimit(creditLimit: number) {
  return roundCurrency(Number(creditLimit || 0) * CREDIT_CASH_ADVANCE_LIMIT_RATE);
}

export function computeCreditCashAdvanceFee(amount: number) {
  return roundCurrency(
    Math.max(
      Number(amount || 0) * CREDIT_CASH_ADVANCE_FEE_RATE,
      CREDIT_CASH_ADVANCE_MIN_FEE
    )
  );
}

export function computeCreditMinimumPayment(currentBalance: number) {
  const balance = Number(currentBalance || 0);
  if (balance <= 0) return 0;

  return roundCurrency(
    Math.min(balance, Math.max(balance * CREDIT_MINIMUM_PAYMENT_RATE, CREDIT_MINIMUM_PAYMENT_FLOOR))
  );
}

export function getNextStatementDate(from = new Date()) {
  const next = new Date(from);
  next.setMonth(next.getMonth() + 1, 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function getNextPaymentDueDate(statementDate: Date) {
  const due = new Date(statementDate);
  due.setDate(due.getDate() + 25);
  return due;
}

export function getDefaultCreditTerms() {
  const nextStatementAt = getNextStatementDate();
  const paymentDueAt = getNextPaymentDueDate(nextStatementAt);

  return {
    credit_limit: CREDIT_DEFAULT_LIMIT,
    purchase_apr: CREDIT_PURCHASE_APR,
    cash_advance_apr: CREDIT_CASH_ADVANCE_APR,
    cash_advance_limit: computeCreditCashAdvanceLimit(CREDIT_DEFAULT_LIMIT),
    cash_advance_balance: 0,
    statement_balance: 0,
    minimum_payment_due: 0,
    late_fee_amount: CREDIT_LATE_FEE,
    rewards_points: 0,
    next_statement_at: nextStatementAt.toISOString(),
    payment_due_at: paymentDueAt.toISOString(),
  };
}

export function isDepositEligible(accountType: string | null | undefined) {
  return accountType === "checking" || accountType === "saving";
}

export function isSavingsAccount(accountType: string | null | undefined) {
  return accountType === "saving";
}

export function isCheckingAccount(accountType: string | null | undefined) {
  return accountType === "checking";
}

export function isCreditAccount(accountType: string | null | undefined) {
  return accountType === "credit";
}

export function getAccountTypeLabel(accountType: string | null | undefined) {
  if (accountType === "checking") return "Checking";
  if (accountType === "saving") return "Savings";
  if (accountType === "credit") return "Credit Card";
  return "Account";
}

export function getMonthKey(date = new Date()) {
  const monthKey = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return monthKey.toISOString().slice(0, 10);
}

export function maskAccountNumber(accountNumber: string | null | undefined) {
  if (!accountNumber) return "****";
  return `****${accountNumber.slice(-4)}`;
}
