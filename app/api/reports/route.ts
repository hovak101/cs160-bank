import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";

function getStartDate(timeframe: string): string | null {
  const now = new Date();
  switch (timeframe) {
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "month":
      return new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate()
      ).toISOString();
    case "3months":
      return new Date(
        now.getFullYear(),
        now.getMonth() - 3,
        now.getDate()
      ).toISOString();
    case "year":
      return new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate()
      ).toISOString();
    case "lifetime":
      return null;
    default:
      return new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate()
      ).toISOString();
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(["admin", "manager"]);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const timeframe =
    req.nextUrl.searchParams.get("timeframe") || "month";
  const startDate = getStartDate(timeframe);
  const now = new Date().toISOString();

  try {
    // Build queries
    let accountsOpenedQuery = supabase
      .from("accounts")
      .select("account_id", { count: "exact", head: true });
    if (startDate)
      accountsOpenedQuery = accountsOpenedQuery.gte("created_at", startDate);

    const allAccountsQuery = supabase
      .from("accounts")
      .select("account_id, status, account_type");

    let txQuery = supabase
      .from("transactions")
      .select("amount, transaction_type")
      .eq("status", "completed")
      .limit(10000);
    if (startDate) txQuery = txQuery.gte("executed_at", startDate);

    let customersQuery = supabase
      .from("customers")
      .select("customer_id", { count: "exact", head: true });
    if (startDate)
      customersQuery = customersQuery.gte("created_at", startDate);

    const loansQuery = supabase
      .from("loans")
      .select(
        "loan_id, status, principal_amount, outstanding_principal, disbursed_at, paid_off_at"
      );

    let incomeQuery = supabase
      .from("bank_income")
      .select("amount, income_category")
      .limit(10000);
    if (startDate) incomeQuery = incomeQuery.gte("recognized_at", startDate);

    const [
      accountsOpenedRes,
      allAccountsRes,
      txRes,
      customersRes,
      loansRes,
      incomeRes,
    ] = await Promise.all([
      accountsOpenedQuery,
      allAccountsQuery,
      txQuery,
      customersQuery,
      loansQuery,
      incomeQuery,
    ]);

    // Accounts opened
    const openedInPeriod = accountsOpenedRes.count ?? 0;

    // Account snapshot
    const allAccounts = allAccountsRes.data ?? [];
    let totalActive = 0,
      totalFrozen = 0,
      totalClosed = 0;
    let checking = 0,
      saving = 0,
      credit = 0;
    for (const acc of allAccounts) {
      const s = (acc.status || "").toLowerCase();
      if (s === "active") totalActive++;
      else if (s === "frozen") totalFrozen++;
      else if (s === "closed") totalClosed++;

      const t = (acc.account_type || "").toLowerCase();
      if (t === "checking") checking++;
      else if (t === "saving") saving++;
      else if (t === "credit") credit++;
    }

    // Transactions
    const txRows = txRes.data ?? [];
    const byType: Record<string, { count: number; amount: number }> = {};
    let totalDeposits = 0,
      totalWithdrawals = 0,
      totalTransfers = 0,
      totalAmount = 0;

    for (const row of txRows) {
      const type = (row.transaction_type || "unknown").toLowerCase();
      const amount = Number(row.amount || 0);
      totalAmount += amount;

      if (!byType[type]) byType[type] = { count: 0, amount: 0 };
      byType[type].count++;
      byType[type].amount += amount;

      if (type === "deposit") totalDeposits += amount;
      else if (type === "withdrawal") totalWithdrawals += amount;
      else if (type === "transfer") totalTransfers += amount;
    }

    // Customers
    const newRegistrations = customersRes.count ?? 0;

    // Loans
    const loanRows = loansRes.data ?? [];
    let issuedInPeriod = 0,
      issuedAmount = 0,
      paidOffInPeriod = 0,
      currentlyActive = 0,
      totalOutstandingPrincipal = 0;

    for (const loan of loanRows) {
      if (loan.status === "active") {
        currentlyActive++;
        totalOutstandingPrincipal += Number(loan.outstanding_principal || 0);
      }
      if (
        loan.disbursed_at &&
        (!startDate || loan.disbursed_at >= startDate)
      ) {
        issuedInPeriod++;
        issuedAmount += Number(loan.principal_amount || 0);
      }
      if (
        loan.paid_off_at &&
        (!startDate || loan.paid_off_at >= startDate)
      ) {
        paidOffInPeriod++;
      }
    }

    // Bank income
    const incomeRows = incomeRes.data ?? [];
    let totalFees = 0,
      totalInterest = 0;
    for (const row of incomeRows) {
      const amount = Number(row.amount || 0);
      if (row.income_category === "fee") totalFees += amount;
      else if (row.income_category === "interest_charge")
        totalInterest += amount;
    }

    return NextResponse.json({
      timeframe,
      periodStart: startDate,
      periodEnd: now,
      accounts: {
        openedInPeriod,
        totalActive,
        totalFrozen,
        totalClosed,
        byType: { checking, saving, credit },
      },
      transactions: {
        totalCount: txRows.length,
        totalAmount,
        totalDeposits,
        totalWithdrawals,
        totalTransfers,
        byType,
      },
      customers: { newRegistrations },
      loans: {
        issuedInPeriod,
        issuedAmount,
        paidOffInPeriod,
        currentlyActive,
        totalOutstandingPrincipal,
      },
      bankIncome: {
        totalFees,
        totalInterest,
        totalIncome: totalFees + totalInterest,
      },
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report." },
      { status: 500 }
    );
  }
}
