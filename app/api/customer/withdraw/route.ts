import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  computeCreditCashAdvanceFee,
  computeCreditMinimumPayment,
  getAccountTypeLabel,
  isCreditAccount,
  isSavingsAccount,
} from "@/lib/banking/rules";
import {
  getOrCreateSavingsMonthlyActivity,
  getRemainingSavingsWithdrawalAllowance,
} from "@/lib/banking/server";
import { recordBankIncomeTransactions } from "@/lib/banking/bank-income";
import { verifySecurityCode } from "@/lib/banking/security-code.server";
import {
  isValidSecurityCodeFormat,
  normalizeSecurityCode,
} from "@/lib/banking/security-code";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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

    const formData = await req.formData();
    const accountId = String(formData.get("account_id") || "");
    const amountValue = Number(formData.get("amount"));
    const securityCode = normalizeSecurityCode(formData.get("security_code"));

    if (!accountId) {
      return NextResponse.json(
        { error: "Account is required." },
        { status: 400 }
      );
    }

    if (!amountValue || amountValue <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required." },
        { status: 400 }
      );
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 }
      );
    }

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("account_id, customer_id, account_name, account_type, balance, currency, status")
      .eq("account_id", accountId)
      .eq("customer_id", customer.customer_id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 }
      );
    }

    if (account.status !== "active") {
      return NextResponse.json(
        { error: "Account is not active." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const currentBalance = Number(account.balance || 0);

    if (isCreditAccount(account.account_type)) {
      if (!isValidSecurityCodeFormat(securityCode)) {
        return NextResponse.json(
          { error: "A valid 3-digit security code is required for cash advances." },
          { status: 400 }
        );
      }

      const [{ data: creditAccount, error: creditAccountError }, { data: creditCard }] =
        await Promise.all([
          supabase
            .from("credit_accounts")
            .select(
              "account_id, available_credit, current_balance, cash_advance_limit, cash_advance_balance"
            )
            .eq("account_id", account.account_id)
            .single(),
          supabase
            .from("credit_cards")
            .select("card_status, security_code_hash")
            .eq("account_id", account.account_id)
            .maybeSingle(),
        ]);

      if (creditAccountError || !creditAccount) {
        return NextResponse.json(
          { error: "Credit card details not found." },
          { status: 404 }
        );
      }

      if (!creditCard) {
        return NextResponse.json(
          { error: "Credit card record not found." },
          { status: 404 }
        );
      }

      if ((creditCard.card_status ?? "").toLowerCase() !== "active") {
        return NextResponse.json(
          { error: "Only active credit cards can be used for cash advances." },
          { status: 400 }
        );
      }

      if (!verifySecurityCode(securityCode, creditCard.security_code_hash)) {
        return NextResponse.json(
          { error: "Security code does not match this card." },
          { status: 400 }
        );
      }

      const feeAmount = computeCreditCashAdvanceFee(amountValue);
      const availableCredit = Number(creditAccount.available_credit || 0);
      const cashAdvanceRemaining = Math.max(
        Number(creditAccount.cash_advance_limit || 0) -
          Number(creditAccount.cash_advance_balance || 0),
        0
      );

      if (amountValue > cashAdvanceRemaining) {
        return NextResponse.json(
          {
            error: `Cash advance limit exceeded. You can withdraw up to $${cashAdvanceRemaining.toFixed(
              2
            )} right now.`,
          },
          { status: 400 }
        );
      }

      if (amountValue + feeAmount > availableCredit) {
        return NextResponse.json(
          {
            error:
              "Insufficient available credit to cover the cash advance and fee.",
          },
          { status: 400 }
        );
      }

      const nextCurrentBalance =
        Number(creditAccount.current_balance || 0) + amountValue + feeAmount;
      const nextCashAdvanceBalance =
        Number(creditAccount.cash_advance_balance || 0) + amountValue;

      const { error: updateCreditError } = await supabase
        .from("credit_accounts")
        .update({
          current_balance: nextCurrentBalance,
          cash_advance_balance: nextCashAdvanceBalance,
          minimum_payment_due: computeCreditMinimumPayment(nextCurrentBalance),
          last_payment_at: null,
          updated_at: nowIso,
        })
        .eq("account_id", account.account_id);

      if (updateCreditError) {
        return NextResponse.json(
          { error: updateCreditError.message || "Failed to process cash advance." },
          { status: 500 }
        );
      }

      const { data: insertedTransactions, error: transactionError } = await supabase
        .from("transactions")
        .insert([
          {
            reference_number: `CAD-${Date.now()}`,
            source_account_id: account.account_id,
            destination_account_id: null,
            amount: amountValue,
            transaction_type: "withdrawal",
            status: "completed",
            description: "Credit card cash advance",
            executed_at: nowIso,
          },
          {
            reference_number: `FEE-${Date.now()}`,
            source_account_id: account.account_id,
            destination_account_id: null,
            amount: feeAmount,
            transaction_type: "fee",
            status: "completed",
            description: "Credit card cash advance fee",
            executed_at: nowIso,
          },
        ])
        .select(
          "transaction_id, source_account_id, reference_number, amount, transaction_type, description, executed_at, status"
        );

      if (transactionError) {
        return NextResponse.json(
          {
            error:
              transactionError.message ||
              "Cash advance applied but transaction history failed.",
          },
          { status: 500 }
        );
      }

      await recordBankIncomeTransactions(insertedTransactions ?? []);
    } else {
      let savingsMonthlyActivity:
        | Awaited<ReturnType<typeof getOrCreateSavingsMonthlyActivity>>
        | null = null;

      if (amountValue > currentBalance) {
        return NextResponse.json(
          {
            error:
              "Insufficient funds. Withdrawal amount exceeds current balance.",
          },
          { status: 400 }
        );
      }

      let savingsRuleMessage: string | null = null;

      if (isSavingsAccount(account.account_type)) {
        savingsMonthlyActivity = await getOrCreateSavingsMonthlyActivity(
          supabase,
          account.account_id,
          currentBalance
        );
        const remainingAllowance =
          getRemainingSavingsWithdrawalAllowance(savingsMonthlyActivity);

        if (amountValue > remainingAllowance) {
          return NextResponse.json(
            {
              error: `Savings accounts can only withdraw up to 10% of the monthly starting balance. Remaining allowance: $${remainingAllowance.toFixed(
                2
              )}.`,
            },
            { status: 400 }
          );
        }

        savingsRuleMessage = "Savings monthly withdrawal rule applied.";
      }

      const newBalance = currentBalance - amountValue;

      const { error: updateAccountError } = await supabase
        .from("accounts")
        .update({
          balance: newBalance,
          updated_at: nowIso,
        })
        .eq("account_id", account.account_id);

      if (updateAccountError) {
        console.error("updateAccountError:", updateAccountError);
        return NextResponse.json(
          { error: updateAccountError.message || "Failed to update account." },
          { status: 500 }
        );
      }

      if (savingsMonthlyActivity) {
        const { error: activityError } = await supabase
          .from("savings_monthly_activity")
          .update({
            withdrawn_amount:
              Number(savingsMonthlyActivity.withdrawn_amount || 0) + amountValue,
            updated_at: nowIso,
          })
          .eq("account_id", account.account_id)
          .eq("month_key", savingsMonthlyActivity.month_key);

        if (activityError) {
          return NextResponse.json(
            { error: activityError.message || "Failed to track savings withdrawal." },
            { status: 500 }
          );
        }
      }

      const { error: transactionError } = await supabase.from("transactions").insert({
        reference_number: `WTH-${Date.now()}`,
        source_account_id: account.account_id,
        destination_account_id: null,
        amount: amountValue,
        transaction_type: "withdrawal",
        status: "completed",
        description:
          account.account_type === "saving"
            ? "Savings withdrawal"
            : "Cash withdrawal",
        executed_at: nowIso,
      });

      if (transactionError) {
        console.error("transactionError:", transactionError);
        return NextResponse.json(
          {
            error:
              transactionError.message || "Balance updated but transaction failed.",
          },
          { status: 500 }
        );
      }

      if (savingsRuleMessage) {
        console.info(savingsRuleMessage);
      }
    }

    revalidatePath("/customer/dashboard");
    revalidatePath("/customer/transactions");
    revalidatePath("/customer/accounts");
    revalidatePath("/customer/withdraw");

    return NextResponse.json({
      success: true,
      message: `${getAccountTypeLabel(account.account_type)} withdrawal completed successfully.`,
    });
  } catch (err) {
    console.error("withdraw route error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
