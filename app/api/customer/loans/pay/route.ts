import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { computeLoanOutstandingAmount } from "@/lib/banking/loans";
import { roundCurrency } from "@/lib/banking/rules";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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
    const loanId = String(body.loan_id || "").trim();
    const paymentAccountId = String(body.payment_account_id || "").trim();
    const amount = Number(body.amount || 0);

    if (!loanId || !paymentAccountId) {
      return NextResponse.json(
        { error: "Loan and payment account are required." },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than zero." },
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: loan, error: loanError } = await (supabase as any)
      .from("loans")
      .select("*")
      .eq("loan_id", loanId)
      .eq("customer_id", customer.customer_id)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: "Loan not found." }, { status: 404 });
    }

    if (loan.status !== "active") {
      return NextResponse.json(
        { error: "Only active loans can receive payments." },
        { status: 400 }
      );
    }

    const { data: paymentAccount, error: accountError } = await supabase
      .from("accounts")
      .select("account_id, customer_id, account_type, balance, status")
      .eq("account_id", paymentAccountId)
      .eq("customer_id", customer.customer_id)
      .single();

    if (accountError || !paymentAccount) {
      return NextResponse.json(
        { error: "Payment account not found." },
        { status: 404 }
      );
    }

    if (paymentAccount.account_type !== "checking" || paymentAccount.status !== "active") {
      return NextResponse.json(
        { error: "Loan payments must come from an active checking account." },
        { status: 400 }
      );
    }

    const availableBalance = Number(paymentAccount.balance || 0);
    if (amount > availableBalance) {
      return NextResponse.json(
        { error: "Insufficient balance in the selected checking account." },
        { status: 400 }
      );
    }

    const outstandingAmount = computeLoanOutstandingAmount(loan);
    if (amount > outstandingAmount) {
      return NextResponse.json(
        {
          error: `Payment exceeds the remaining amount due (${outstandingAmount.toFixed(
            2
          )}).`,
        },
        { status: 400 }
      );
    }

    const accruedInterest = Number(loan.accrued_interest || 0);
    const outstandingPrincipal = Number(loan.outstanding_principal || 0);
    const interestPaid = Math.min(amount, accruedInterest);
    const principalPaid = Math.min(amount - interestPaid, outstandingPrincipal);
    const nextAccruedInterest = roundCurrency(accruedInterest - interestPaid);
    const nextOutstandingPrincipal = roundCurrency(outstandingPrincipal - principalPaid);
    const nextStatus =
      nextAccruedInterest <= 0 && nextOutstandingPrincipal <= 0 ? "paid" : "active";
    const nowIso = new Date().toISOString();

    const { error: updateAccountError } = await supabaseAdmin
      .from("accounts")
      .update({
        balance: roundCurrency(availableBalance - amount),
        updated_at: nowIso,
      })
      .eq("account_id", paymentAccount.account_id);

    if (updateAccountError) {
      return NextResponse.json(
        { error: updateAccountError.message || "Failed to update checking account." },
        { status: 500 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateLoanError } = await (supabaseAdmin as any)
      .from("loans")
      .update({
        accrued_interest: nextAccruedInterest,
        outstanding_principal: nextOutstandingPrincipal,
        total_paid: roundCurrency(Number(loan.total_paid || 0) + amount),
        status: nextStatus,
        last_payment_at: nowIso,
        paid_off_at: nextStatus === "paid" ? nowIso : null,
        last_interest_accrued_at: null,
        updated_at: nowIso,
      })
      .eq("loan_id", loan.loan_id);

    if (updateLoanError) {
      return NextResponse.json(
        { error: updateLoanError.message || "Failed to update the loan." },
        { status: 500 }
      );
    }

    const { error: transactionError } = await supabaseAdmin.from("transactions").insert({
      reference_number: `LPM-${Date.now()}`,
      source_account_id: paymentAccount.account_id,
      destination_account_id: null,
      amount,
      transaction_type: "loan_payment",
      status: "completed",
      description: "Loan payment",
      executed_at: nowIso,
    });

    if (transactionError) {
      return NextResponse.json(
        {
          error:
            transactionError.message ||
            "Payment was posted but transaction history failed to update.",
        },
        { status: 500 }
      );
    }

    revalidatePath("/customer/loans");
    revalidatePath("/customer/accounts");
    revalidatePath("/customer/transactions");
    revalidatePath("/customer/dashboard");
    revalidatePath("/admin/loans");
    revalidatePath("/admin/dashboard");

    return NextResponse.json({
      success: true,
      message: nextStatus === "paid" ? "Loan paid off successfully." : "Loan payment posted.",
    });
  } catch (error) {
    console.error("customer loans pay POST error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
