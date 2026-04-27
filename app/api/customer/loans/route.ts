import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { computeLoanAssessment } from "@/lib/banking/loans";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const MAX_LOAN_AMOUNT = 1_000_000;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (userData?.role !== "customer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const checkingAccountId = String(body.checking_account_id || "").trim();
    const principalAmount = Number(body.principal_amount || 0);
    const termMonths = Number(body.term_months || 0);
    const monthlyIncome = Number(body.monthly_income || 0);
    const monthlyHousingPayment = Number(body.monthly_housing_payment || 0);
    const employmentStatus = String(body.employment_status || "").trim();
    const purpose = String(body.purpose || "").trim();
    const otherFinancialNotes = String(body.other_financial_notes || "").trim();

    if (!checkingAccountId) {
      return NextResponse.json(
        { error: "A checking account is required for loan disbursement." },
        { status: 400 }
      );
    }

    if (!principalAmount || principalAmount < 500) {
      return NextResponse.json(
        { error: "Loan amount must be at least $500." },
        { status: 400 }
      );
    }

    if (principalAmount > MAX_LOAN_AMOUNT) {
      return NextResponse.json(
        { error: "Loan amount cannot exceed $1,000,000." },
        { status: 400 }
      );
    }

    if (!termMonths || termMonths < 6 || termMonths > 84) {
      return NextResponse.json(
        { error: "Loan term must be between 6 and 84 months." },
        { status: 400 }
      );
    }

    if (!monthlyIncome || monthlyIncome <= 0) {
      return NextResponse.json(
        { error: "Monthly income must be greater than zero." },
        { status: 400 }
      );
    }

    if (monthlyHousingPayment < 0) {
      return NextResponse.json(
        { error: "Debt and housing values cannot be negative." },
        { status: 400 }
      );
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const { data: checkingAccount, error: accountError } = await supabase
      .from("accounts")
      .select("account_id, customer_id, account_type, status")
      .eq("account_id", checkingAccountId)
      .eq("customer_id", customer.customer_id)
      .single();

    if (accountError || !checkingAccount) {
      return NextResponse.json(
        { error: "Checking account not found." },
        { status: 404 }
      );
    }

    if (checkingAccount.account_type !== "checking" || checkingAccount.status !== "active") {
      return NextResponse.json(
        { error: "Loans can only be disbursed into an active checking account." },
        { status: 400 }
      );
    }

    const { data: creditAccountsData, error: creditAccountsError } = await supabase
      .from("accounts")
      .select("account_id, credit_accounts(current_balance)")
      .eq("customer_id", customer.customer_id)
      .eq("account_type", "credit")
      .eq("status", "active");

    if (creditAccountsError) {
      return NextResponse.json(
        {
          error:
            creditAccountsError.message || "Failed to load current credit card balances.",
        },
        { status: 500 }
      );
    }

    const existingCreditDebt = (creditAccountsData ?? []).reduce((sum, account) => {
      const creditAccount = Array.isArray(account.credit_accounts)
        ? account.credit_accounts[0]
        : account.credit_accounts;
      return sum + Number(creditAccount?.current_balance ?? 0);
    }, 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingLoans, error: existingLoansError } = await (supabase as any)
      .from("loans")
      .select("loan_id, status, outstanding_principal, accrued_interest")
      .eq("customer_id", customer.customer_id)
      .in("status", ["pending", "active"]);

    if (existingLoansError) {
      return NextResponse.json(
        { error: existingLoansError.message || "Failed to load existing loans." },
        { status: 500 }
      );
    }

    const activeLoanCount = (existingLoans ?? []).filter(
      (loan: { status?: string | null }) => loan.status === "active"
    ).length;
    const activeLoanOutstanding = (existingLoans ?? []).reduce(
      (sum: number, loan: { status?: string | null; outstanding_principal?: number | null; accrued_interest?: number | null }) =>
        loan.status === "active"
          ? sum +
            Number(loan.outstanding_principal || 0) +
            Number(loan.accrued_interest || 0)
          : sum,
      0
    );

    const assessment = computeLoanAssessment({
      requestedAmount: principalAmount,
      termMonths,
      monthlyIncome,
      monthlyHousingPayment,
      existingCreditDebt,
      employmentStatus,
      activeLoanCount,
      activeLoanOutstanding,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: createdLoan, error: insertError } = await (supabase as any)
      .from("loans")
      .insert({
        customer_id: customer.customer_id,
        checking_account_id: checkingAccount.account_id,
        principal_amount: principalAmount,
        term_months: termMonths,
        annual_interest_rate: assessment.annualInterestRate,
        monthly_income: monthlyIncome,
        monthly_housing_payment: monthlyHousingPayment,
        existing_credit_debt: existingCreditDebt,
        employment_status: employmentStatus,
        purpose: purpose || null,
        other_financial_notes: otherFinancialNotes || null,
        status: "pending",
        risk_score: assessment.riskScore,
        risk_tier: assessment.riskTier,
        recommended_decision: assessment.recommendedDecision,
        risk_summary: assessment.riskSummary,
        debt_to_income_ratio: assessment.debtToIncomeRatio,
        estimated_monthly_payment: assessment.estimatedMonthlyPayment,
        outstanding_principal: 0,
        accrued_interest: 0,
        total_interest_charged: 0,
        total_paid: 0,
      })
      .select("*")
      .single();

    if (insertError || !createdLoan) {
      return NextResponse.json(
        { error: insertError?.message || "Failed to create loan application." },
        { status: 500 }
      );
    }

    revalidatePath("/customer/loans");
    revalidatePath("/customer/dashboard");
    revalidatePath("/admin/loans");
    revalidatePath("/admin/dashboard");

    return NextResponse.json({
      success: true,
      loan: createdLoan,
      assessment,
    });
  } catch (error) {
    console.error("customer loans POST error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
