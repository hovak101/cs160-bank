import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { recordBankIncomeTransactions } from "@/lib/banking/bank-income";
import { computeLoanTotalInterest } from "@/lib/banking/loans";
import { roundCurrency } from "@/lib/banking/rules";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ loanId: string }> }
) {
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

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { loanId } = await params;
    const body = await request.json();
    const action = String(body.action || "").trim().toLowerCase();
    const adminDecisionNotes = String(body.admin_decision_notes || "").trim();

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Action must be approve or reject." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: loan, error: loanError } = await (supabase as any)
      .from("loans")
      .select("*")
      .eq("loan_id", loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: "Loan not found." }, { status: 404 });
    }

    if (loan.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending applications can be reviewed." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    if (action === "reject") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: rejectError } = await (supabaseAdmin as any)
        .from("loans")
        .update({
          status: "rejected",
          reviewed_at: nowIso,
          reviewed_by_user_id: user.id,
          admin_decision_notes: adminDecisionNotes || "Rejected by admin review.",
          updated_at: nowIso,
        })
        .eq("loan_id", loan.loan_id);

      if (rejectError) {
        return NextResponse.json(
          { error: rejectError.message || "Failed to reject loan." },
          { status: 500 }
        );
      }
    } else {
      const { data: checkingAccount, error: checkingError } = await supabase
        .from("accounts")
        .select("account_id, account_type, balance, status")
        .eq("account_id", loan.checking_account_id)
        .single();

      if (checkingError || !checkingAccount) {
        return NextResponse.json(
          { error: "Linked checking account not found." },
          { status: 404 }
        );
      }

      if (checkingAccount.account_type !== "checking" || checkingAccount.status !== "active") {
        return NextResponse.json(
          { error: "Loan can only be approved into an active checking account." },
          { status: 400 }
        );
      }

      const principalAmount = Number(loan.principal_amount || 0);
      const totalInterest = computeLoanTotalInterest(
        principalAmount,
        Number(loan.annual_interest_rate || 0),
        Number(loan.term_months || 0)
      );

      const { error: updateAccountError } = await supabaseAdmin
        .from("accounts")
        .update({
          balance: roundCurrency(Number(checkingAccount.balance || 0) + principalAmount),
          updated_at: nowIso,
        })
        .eq("account_id", checkingAccount.account_id);

      if (updateAccountError) {
        return NextResponse.json(
          {
            error:
              updateAccountError.message || "Failed to deposit loan proceeds into checking.",
          },
          { status: 500 }
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: approveError } = await (supabaseAdmin as any)
        .from("loans")
        .update({
          status: "active",
          reviewed_at: nowIso,
          reviewed_by_user_id: user.id,
          admin_decision_notes:
            adminDecisionNotes ||
            `Approved at ${Number(loan.annual_interest_rate || 0).toFixed(2)}% APR.`,
          disbursed_at: nowIso,
          last_interest_accrued_at: null,
          outstanding_principal: principalAmount,
          accrued_interest: totalInterest,
          total_interest_charged: totalInterest,
          updated_at: nowIso,
        })
        .eq("loan_id", loan.loan_id);

      if (approveError) {
        return NextResponse.json(
          { error: approveError.message || "Failed to approve loan." },
          { status: 500 }
        );
      }

      const { data: transactionRows, error: transactionError } = await supabaseAdmin
        .from("transactions")
        .insert([
          {
            reference_number: `LDS-${Date.now()}`,
            source_account_id: null,
            destination_account_id: checkingAccount.account_id,
            amount: principalAmount,
            transaction_type: "loan_disbursement",
            status: "completed",
            description: "Loan disbursement",
            executed_at: nowIso,
          },
          {
            reference_number: `LINT-${Date.now()}`,
            source_account_id: null,
            destination_account_id: null,
            amount: totalInterest,
            transaction_type: "interest",
            status: "completed",
            description: "Loan interest charge",
            executed_at: nowIso,
          },
        ])
        .select(
          "transaction_id, source_account_id, reference_number, amount, transaction_type, description, executed_at, status"
        );

      if (transactionError || !transactionRows) {
        return NextResponse.json(
          {
            error:
              transactionError.message ||
              "Loan was approved but transaction history failed to update.",
          },
          { status: 500 }
        );
      }

      await recordBankIncomeTransactions(
        transactionRows.filter((transaction) => transaction.transaction_type === "interest")
      );
    }

    revalidatePath("/admin/loans");
    revalidatePath("/admin/dashboard");
    revalidatePath("/customer/loans");
    revalidatePath("/customer/accounts");
    revalidatePath("/customer/transactions");
    revalidatePath("/customer/dashboard");

    return NextResponse.json({
      success: true,
      message: action === "approve" ? "Loan approved." : "Loan rejected.",
    });
  } catch (error) {
    console.error("admin loans review POST error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
