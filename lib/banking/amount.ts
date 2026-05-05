import { roundCurrency } from "@/lib/banking/rules";

type ParseCurrencyOptions = {
  fieldLabel?: string;
  min?: number;
  max?: number;
  maxErrorMessage?: string;
};

type ParseCurrencyResult =
  | {
      ok: true;
      cents: number;
      value: number;
    }
  | {
      ok: false;
      error: string;
    };

const CURRENCY_INPUT_PATTERN = /^\d+(\.\d{1,2})?$/;
export const MAX_ACCOUNT_BALANCE = 999999999999.99;
export const MANUAL_DEPOSIT_LIMIT_USD = 100000;
export const LARGE_DEPOSIT_SUPPORT_MESSAGE =
  "Please contact support to deposit this large amount.";

export function parseCurrencyInput(
  rawValue: unknown,
  options: ParseCurrencyOptions = {}
): ParseCurrencyResult {
  const fieldLabel = options.fieldLabel ?? "Amount";
  const min = options.min ?? 0.01;

  if (rawValue === null || rawValue === undefined) {
    return {
      ok: false,
      error: `${fieldLabel} is required.`,
    };
  }

  const value =
    typeof rawValue === "number" ? String(rawValue) : String(rawValue).trim();

  if (!value) {
    return {
      ok: false,
      error: `${fieldLabel} is required.`,
    };
  }

  if (!CURRENCY_INPUT_PATTERN.test(value)) {
    return {
      ok: false,
      error: `${fieldLabel} must be a positive amount with up to 2 decimal places.`,
    };
  }

  const cents = currencyStringToCents(value);
  const parsed = cents / 100;

  if (!Number.isFinite(parsed)) {
    return {
      ok: false,
      error: `${fieldLabel} must be a valid amount.`,
    };
  }

  const normalized = roundCurrency(parsed);

  if (normalized < min) {
    return {
      ok: false,
      error: `${fieldLabel} must be at least ${formatUsd(min)}.`,
    };
  }

  if (typeof options.max === "number" && normalized > options.max) {
    return {
      ok: false,
      error:
        options.maxErrorMessage ||
        `${fieldLabel} cannot exceed ${formatUsd(options.max)}.`,
    };
  }

  return {
    ok: true,
    cents,
    value: normalized,
  };
}

export function willExceedMaxAccountBalance(
  currentBalance: number,
  incomingAmount: number,
  maxBalance = MAX_ACCOUNT_BALANCE
) {
  return roundCurrency(Number(currentBalance || 0) + Number(incomingAmount || 0)) > maxBalance;
}

function currencyStringToCents(value: string) {
  const [dollarsPart, centsPart = ""] = value.split(".");
  const dollars = Number(dollarsPart);
  const cents = Number(`${centsPart}00`.slice(0, 2));

  return dollars * 100 + cents;
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundCurrency(value));
}
