import { roundCurrency } from "@/lib/banking/rules";

export type LoanAssessmentInput = {
  requestedAmount: number;
  termMonths: number;
  monthlyIncome: number;
  monthlyHousingPayment: number;
  existingCreditDebt: number;
  employmentStatus: string;
  activeLoanCount?: number;
  activeLoanOutstanding?: number;
};

export type LoanAssessment = {
  annualInterestRate: number;
  debtToIncomeRatio: number;
  estimatedMonthlyPayment: number;
  estimatedTotalInterest: number;
  estimatedTotalRepayment: number;
  recommendedDecision: "approve" | "review" | "decline";
  riskScore: number;
  riskSummary: string;
  riskTier: "good" | "review" | "bad";
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getEmploymentScore(employmentStatus: string) {
  switch (normalizeEmploymentStatus(employmentStatus)) {
    case "full_time":
      return 18;
    case "self_employed":
      return 12;
    case "contract":
      return 8;
    case "part_time":
      return 6;
    case "retired":
      return 8;
    case "student":
      return -6;
    case "unemployed":
      return -22;
    default:
      return 0;
  }
}

function getIncomeScore(monthlyIncome: number) {
  if (monthlyIncome >= 8000) return 18;
  if (monthlyIncome >= 6000) return 14;
  if (monthlyIncome >= 4500) return 10;
  if (monthlyIncome >= 3200) return 4;
  if (monthlyIncome >= 2200) return -4;
  return -12;
}

function getDebtToIncomeScore(dti: number) {
  if (dti <= 0.25) return 20;
  if (dti <= 0.35) return 12;
  if (dti <= 0.45) return 5;
  if (dti <= 0.55) return -8;
  return -20;
}

function getLoanToIncomeScore(requestedAmount: number, monthlyIncome: number) {
  const annualIncome = Math.max(monthlyIncome * 12, 1);
  const ratio = requestedAmount / annualIncome;

  if (ratio <= 0.25) return 12;
  if (ratio <= 0.45) return 7;
  if (ratio <= 0.65) return 0;
  if (ratio <= 0.85) return -8;
  return -15;
}

function getExistingDebtScore(existingCreditDebt: number, monthlyIncome: number) {
  const ratio = existingCreditDebt / Math.max(monthlyIncome, 1);

  if (ratio <= 0.08) return 10;
  if (ratio <= 0.18) return 5;
  if (ratio <= 0.3) return 0;
  if (ratio <= 0.45) return -7;
  return -14;
}

function getExistingLoanPenalty(activeLoanCount: number, activeLoanOutstanding: number, monthlyIncome: number) {
  let penalty = activeLoanCount * -8;
  const annualIncome = Math.max(monthlyIncome * 12, 1);
  const outstandingRatio = activeLoanOutstanding / annualIncome;

  if (outstandingRatio > 0.6) penalty -= 12;
  else if (outstandingRatio > 0.35) penalty -= 7;
  else if (outstandingRatio > 0.15) penalty -= 3;

  return penalty;
}

function getBaseInterestRateForScore(score: number) {
  if (score >= 85) return 6.99;
  if (score >= 75) return 8.49;
  if (score >= 65) return 10.99;
  if (score >= 55) return 13.99;
  return 18.49;
}

function getTermInterestPremium(termMonths: number) {
  if (termMonths <= 12) return 0.5;
  if (termMonths <= 24) return 1.25;
  if (termMonths <= 36) return 2.25;
  if (termMonths <= 48) return 3.75;
  if (termMonths <= 60) return 5.25;
  return 6.75;
}

export function getInterestRateForQuote(score: number, termMonths: number) {
  return roundCurrency(
    clamp(
      getBaseInterestRateForScore(score) + getTermInterestPremium(termMonths),
      6.99,
      24.99
    )
  );
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(Number(amount || 0));
}

export function normalizeEmploymentStatus(value: string | null | undefined) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  switch (normalized) {
    case "full_time":
    case "part_time":
    case "self_employed":
    case "contract":
    case "student":
    case "retired":
    case "unemployed":
      return normalized;
    default:
      return "full_time";
  }
}

export function getEmploymentStatusLabel(value: string | null | undefined) {
  switch (normalizeEmploymentStatus(value)) {
    case "full_time":
      return "Full-time";
    case "part_time":
      return "Part-time";
    case "self_employed":
      return "Self-employed";
    case "contract":
      return "Contract";
    case "student":
      return "Student";
    case "retired":
      return "Retired";
    case "unemployed":
      return "Unemployed";
    default:
      return "Full-time";
  }
}

export function computeLoanMonthlyPayment(
  principalAmount: number,
  annualInterestRate: number,
  termMonths: number
) {
  const principal = Number(principalAmount || 0);
  const months = Math.max(Number(termMonths || 0), 1);
  const monthlyRate = Number(annualInterestRate || 0) / 100 / 12;

  if (monthlyRate <= 0) {
    return roundCurrency(principal / months);
  }

  const denominator = 1 - Math.pow(1 + monthlyRate, -months);
  if (denominator <= 0) {
    return roundCurrency(principal / months);
  }

  return roundCurrency((principal * monthlyRate) / denominator);
}

export function computeLoanTotalRepayment(
  principalAmount: number,
  annualInterestRate: number,
  termMonths: number
) {
  const monthlyPayment = computeLoanMonthlyPayment(
    principalAmount,
    annualInterestRate,
    termMonths
  );

  return roundCurrency(monthlyPayment * Math.max(Number(termMonths || 0), 1));
}

export function computeLoanTotalInterest(
  principalAmount: number,
  annualInterestRate: number,
  termMonths: number
) {
  return roundCurrency(
    computeLoanTotalRepayment(principalAmount, annualInterestRate, termMonths) -
      Number(principalAmount || 0)
  );
}

export function computeLoanAssessment(input: LoanAssessmentInput): LoanAssessment {
  const requestedAmount = Number(input.requestedAmount || 0);
  const termMonths = Math.max(Number(input.termMonths || 0), 1);
  const monthlyIncome = Number(input.monthlyIncome || 0);
  const monthlyHousingPayment = Number(input.monthlyHousingPayment || 0);
  const existingCreditDebt = Number(input.existingCreditDebt || 0);
  const activeLoanCount = Number(input.activeLoanCount || 0);
  const activeLoanOutstanding = Number(input.activeLoanOutstanding || 0);
  const employmentStatus = normalizeEmploymentStatus(input.employmentStatus);

  const baselineRate = 11.99;
  const baselinePayment = computeLoanMonthlyPayment(
    requestedAmount,
    baselineRate,
    termMonths
  );

  const baseDti =
    monthlyIncome > 0
      ? (monthlyHousingPayment + existingCreditDebt + baselinePayment) / monthlyIncome
      : 1;

  const rawScore =
    52 +
    getEmploymentScore(employmentStatus) +
    getIncomeScore(monthlyIncome) +
    getDebtToIncomeScore(baseDti) +
    getLoanToIncomeScore(requestedAmount, monthlyIncome) +
    getExistingDebtScore(existingCreditDebt, monthlyIncome) +
    getExistingLoanPenalty(activeLoanCount, activeLoanOutstanding, monthlyIncome);

  const riskScore = clamp(Math.round(rawScore), 0, 100);
  const annualInterestRate = getInterestRateForQuote(riskScore, termMonths);
  const estimatedMonthlyPayment = computeLoanMonthlyPayment(
    requestedAmount,
    annualInterestRate,
    termMonths
  );
  const estimatedTotalRepayment = computeLoanTotalRepayment(
    requestedAmount,
    annualInterestRate,
    termMonths
  );
  const estimatedTotalInterest = computeLoanTotalInterest(
    requestedAmount,
    annualInterestRate,
    termMonths
  );
  const debtToIncomeRatio =
    monthlyIncome > 0
      ? roundCurrency(
          (monthlyHousingPayment + existingCreditDebt + estimatedMonthlyPayment) /
            monthlyIncome
        )
      : 1;

  const riskTier: LoanAssessment["riskTier"] =
    riskScore >= 72 ? "good" : riskScore >= 52 ? "review" : "bad";
  const recommendedDecision: LoanAssessment["recommendedDecision"] =
    riskScore >= 72 ? "approve" : riskScore >= 52 ? "review" : "decline";

  const riskSummary =
    riskTier === "good"
      ? `Good profile. Estimated payment ${formatCurrency(
          estimatedMonthlyPayment
        )}/mo at ${annualInterestRate.toFixed(2)}% APR. Estimated interest is ${formatCurrency(
          estimatedTotalInterest
        )} and total repayment is ${formatCurrency(
          estimatedTotalRepayment
        )} with projected DTI ${formatPercent(debtToIncomeRatio)}.`
      : riskTier === "review"
      ? `Borderline profile. Estimated payment ${formatCurrency(
          estimatedMonthlyPayment
        )}/mo at ${annualInterestRate.toFixed(2)}% APR. Estimated interest is ${formatCurrency(
          estimatedTotalInterest
        )}, total repayment is ${formatCurrency(
          estimatedTotalRepayment
        )}, and projected DTI is ${formatPercent(debtToIncomeRatio)}.`
      : `Higher-risk profile. Estimated payment ${formatCurrency(
          estimatedMonthlyPayment
        )}/mo at ${annualInterestRate.toFixed(2)}% APR. Estimated interest is ${formatCurrency(
          estimatedTotalInterest
        )}, total repayment is ${formatCurrency(
          estimatedTotalRepayment
        )}, and projected DTI is ${formatPercent(
          debtToIncomeRatio
        )}. This application should be reviewed carefully before approval.`;

  return {
    annualInterestRate,
    debtToIncomeRatio,
    estimatedMonthlyPayment,
    estimatedTotalInterest,
    estimatedTotalRepayment,
    recommendedDecision,
    riskScore,
    riskSummary,
    riskTier,
  };
}

export function computeLoanOutstandingAmount(loan: {
  accrued_interest?: number | null;
  outstanding_principal?: number | null;
}) {
  return roundCurrency(
    Number(loan.outstanding_principal || 0) + Number(loan.accrued_interest || 0)
  );
}
