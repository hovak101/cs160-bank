import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { computeCreditMinimumPayment, isCreditAccount } from "@/lib/banking/rules";
import { verifySecurityCode } from "@/lib/banking/security-code.server";
import {
  isValidSecurityCodeFormat,
  normalizeSecurityCode,
} from "@/lib/banking/security-code";
import { validateMoneyAmount } from "@/lib/banking/validation";

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

    const body = await request.json();
    const accountId = String(body.account_id ?? "").trim();
    const merchant = String(body.merchant ?? "").trim();
    const category = String(body.category ?? "").trim();
    if (!/^\d+(\.\d{1,2})?$/.test(String(body.amount ?? ""))) {
      return NextResponse.json({ error: "Amount must have at most 2 decimal places." }, { status: 400 });
    }
    const amount = Number(body.amount ?? 0);
    const securityCode = normalizeSecurityCode(body.security_code);

    if (!accountId || !merchant || !Number.isFinite(amount) || amount < 0.01) {
      return NextResponse.json(
        { error: "Credit account, merchant, and valid amount are required." },
        { status: 400 }
      );
    }

    const amountError = validateMoneyAmount(amount);
    if (amountError) {
      return NextResponse.json({ error: amountError }, { status: 400 });
    }

    if (!isValidSecurityCodeFormat(securityCode)) {
      return NextResponse.json(
        { error: "A valid 3-digit security code is required." },
        { status: 400 }
      );
    }

    const { data: customer } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .single();

    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("account_id, account_type, status")
      .eq("account_id", accountId)
      .eq("customer_id", customer.customer_id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: "Credit account not found." }, { status: 404 });
    }

    if (!isCreditAccount(account.account_type)) {
      return NextResponse.json(
        { error: "Only credit accounts can post card purchases." },
        { status: 400 }
      );
    }

    if ((account.status ?? "").toLowerCase() !== "active") {
      return NextResponse.json(
        { error: "Only active credit accounts can be used for purchases." },
        { status: 400 }
      );
    }

    const { data: creditAccount, error: creditAccountError } = await supabase
      .from("credit_accounts")
      .select(
        "account_id, available_credit, current_balance, minimum_payment_due, rewards_points, statement_balance"
      )
      .eq("account_id", accountId)
      .single();

    if (creditAccountError || !creditAccount) {
      return NextResponse.json(
        { error: "Credit account details not found." },
        { status: 404 }
      );
    }

    const availableCredit = Number(creditAccount.available_credit || 0);
    if (amount > availableCredit) {
      return NextResponse.json(
        {
          error: `Purchase exceeds available credit. Available credit: $${availableCredit.toFixed(
            2
          )}.`,
        },
        { status: 400 }
      );
    }

    const { data: creditCard } = await supabase
      .from("credit_cards")
      .select("card_status, rewards_rate, security_code_hash")
      .eq("account_id", accountId)
      .maybeSingle();

    if (!creditCard) {
      return NextResponse.json(
        { error: "Credit card details not found." },
        { status: 404 }
      );
    }

    if ((creditCard.card_status ?? "").toLowerCase() !== "active") {
      return NextResponse.json(
        { error: "Only active credit cards can be used for purchases." },
        { status: 400 }
      );
    }

    if (!verifySecurityCode(securityCode, creditCard.security_code_hash)) {
      return NextResponse.json(
        { error: "Security code does not match this card." },
        { status: 400 }
      );
    }

    const rewardsRate = Number(creditCard.rewards_rate ?? 0);
    const rewardsEarned = amount * rewardsRate;
    const nextBalance = Number(creditAccount.current_balance || 0) + amount;
    const nextStatementBalance =
      Number(creditAccount.statement_balance || 0) + amount;
    const nextRewards = Number(creditAccount.rewards_points || 0) + rewardsEarned;
    const nowIso = new Date().toISOString();

    const { error: updateCreditError } = await supabase
      .from("credit_accounts")
      .update({
        current_balance: nextBalance,
        statement_balance: nextStatementBalance,
        minimum_payment_due: computeCreditMinimumPayment(nextBalance),
        rewards_points: nextRewards,
        updated_at: nowIso,
      })
      .eq("account_id", accountId);

    if (updateCreditError) {
      return NextResponse.json(
        { error: updateCreditError.message || "Failed to post card purchase." },
        { status: 500 }
      );
    }

    const description = category
      ? `${merchant} purchase - ${category}`
      : `${merchant} purchase`;

    const { error: transactionError } = await supabase.from("transactions").insert({
      reference_number: `CRD-${Date.now()}`,
      source_account_id: accountId,
      destination_account_id: null,
      amount,
      transaction_type: "credit_purchase",
      status: "completed",
      description,
      executed_at: nowIso,
    });

    if (transactionError) {
      return NextResponse.json(
        {
          error:
            transactionError.message || "Purchase posted but transaction history failed.",
        },
        { status: 500 }
      );
    }

    revalidatePath("/customer/dashboard");
    revalidatePath("/customer/accounts");
    revalidatePath("/customer/transactions");
    revalidatePath("/customer/credit-card");

    return NextResponse.json({
      success: true,
      message: "Credit card purchase posted successfully.",
      rewards_earned: rewardsEarned,
    });
  } catch (error) {
    console.error("credit card purchase route error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
