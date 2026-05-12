import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  computeCreditMinimumPayment,
  isCreditAccount,
  isSavingsAccount,
  roundCurrency,
} from "@/lib/banking/rules";
import {
  getOrCreateSavingsMonthlyActivity,
  getRemainingSavingsWithdrawalAllowance,
} from "@/lib/banking/server";
import {
  MAX_ACCOUNT_BALANCE,
  parseCurrencyInput,
  willExceedMaxAccountBalance,
} from "@/lib/banking/amount";
import { validateMoneyAmount } from "@/lib/banking/validation";

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
    const fromAccountId = String(formData.get("from_account_id") || "");
    const toAccountId = String(formData.get("to_account_id") || "");
    const parsedAmount = parseCurrencyInput(formData.get("amount"), {
      fieldLabel: "Amount",
    });

    if (!fromAccountId) {
      return NextResponse.json(
        { error: "Source account is required." },
        { status: 400 }
      );
    }

    if (!toAccountId) {
      return NextResponse.json(
        { error: "Destination account is required." },
        { status: 400 }
      );
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json(
        { error: "Source and destination accounts must be different." },
        { status: 400 }
      );
    }

    if (!parsedAmount.ok) {
      return NextResponse.json(
        { error: parsedAmount.error },
        { status: 400 }
      );
    }

    const amountValue = parsedAmount.value;
    const amountError = validateMoneyAmount(amountValue);
    if (amountError) {
      return NextResponse.json({ error: amountError }, { status: 400 });
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

    const { data: sourceAccount, error: sourceError } = await supabase
      .from("accounts")
      .select("account_id, customer_id, account_type, balance, currency, status")
      .eq("account_id", fromAccountId)
      .eq("customer_id", customer.customer_id)
      .single();

    if (sourceError || !sourceAccount) {
      return NextResponse.json(
        { error: "Source account not found." },
        { status: 404 }
      );
    }

    if (sourceAccount.status !== "active") {
      return NextResponse.json(
        { error: "Source account is not active." },
        { status: 400 }
      );
    }

    if (isCreditAccount(sourceAccount.account_type)) {
      return NextResponse.json(
        {
          error:
            "Credit cards cannot be used as the source of an internal transfer. Pay the card from checking or savings instead.",
        },
        { status: 400 }
      );
    }

    const { data: destAccount, error: destError } = await supabase
      .from("accounts")
      .select("account_id, customer_id, account_type, balance, currency, status")
      .eq("account_id", toAccountId)
      .eq("customer_id", customer.customer_id)
      .single();

    if (destError || !destAccount) {
      return NextResponse.json(
        { error: "Destination account not found." },
        { status: 404 }
      );
    }

    if (destAccount.status !== "active") {
      return NextResponse.json(
        { error: "Destination account is not active." },
        { status: 400 }
      );
    }

    const sourceBalance = Number(sourceAccount.balance || 0);
    const destBalance = Number(destAccount.balance || 0);

    if (
      !isCreditAccount(destAccount.account_type) &&
      willExceedMaxAccountBalance(destBalance, amountValue)
    ) {
      return NextResponse.json(
        {
          error: `Destination account cannot exceed ${new Intl.NumberFormat(
            "en-US",
            {
              style: "currency",
              currency: "USD",
            }
          ).format(MAX_ACCOUNT_BALANCE)}.`,
        },
        { status: 400 }
      );
    }

    if (amountValue > sourceBalance) {
      return NextResponse.json(
        { error: "Insufficient funds. Transfer amount exceeds source account balance." },
        { status: 400 }
      );
    }

    let savingsMonthlyActivity:
      | Awaited<ReturnType<typeof getOrCreateSavingsMonthlyActivity>>
      | null = null;

    if (isSavingsAccount(sourceAccount.account_type)) {
        savingsMonthlyActivity = await getOrCreateSavingsMonthlyActivity(
        supabaseAdmin,
        sourceAccount.account_id,
        sourceBalance
      );
      const remainingAllowance =
        getRemainingSavingsWithdrawalAllowance(savingsMonthlyActivity);

      if (amountValue > remainingAllowance) {
        return NextResponse.json(
          {
            error: `Savings transfer exceeds your monthly 10% withdrawal allowance. Remaining allowance: $${remainingAllowance.toFixed(
              2
            )}.`,
          },
            { status: 400 }
          );
        }
    }

    const nowIso = new Date().toISOString();

    const { error: updateSourceError } = await supabaseAdmin
      .from("accounts")
      .update({
        balance: roundCurrency(sourceBalance - amountValue),
        updated_at: nowIso,
      })
      .eq("account_id", sourceAccount.account_id);

    if (updateSourceError) {
      console.error("updateSourceError:", updateSourceError);
      return NextResponse.json(
        { error: updateSourceError.message || "Failed to update source account." },
        { status: 500 }
      );
    }

    if (savingsMonthlyActivity) {
      const { error: activityError } = await supabaseAdmin
        .from("savings_monthly_activity")
        .update({
          withdrawn_amount:
            roundCurrency(
              Number(savingsMonthlyActivity.withdrawn_amount || 0) + amountValue
            ),
          updated_at: nowIso,
        })
        .eq("account_id", sourceAccount.account_id)
        .eq("month_key", savingsMonthlyActivity.month_key);

      if (activityError) {
        return NextResponse.json(
          { error: activityError.message || "Failed to track savings transfer." },
          { status: 500 }
        );
      }
    }

    let transactionType: "transfer" | "credit_payment" = "transfer";
    let description = "Account transfer";

    if (isCreditAccount(destAccount.account_type)) {
      const { data: creditAccount, error: creditAccountError } = await supabase
        .from("credit_accounts")
        .select("account_id, current_balance")
        .eq("account_id", destAccount.account_id)
        .single();

      if (creditAccountError || !creditAccount) {
        return NextResponse.json(
          { error: "Credit card details not found." },
          { status: 404 }
        );
      }

      const outstandingBalance = Number(creditAccount.current_balance || 0);

      if (outstandingBalance <= 0) {
        return NextResponse.json(
          { error: "This credit card does not have an outstanding balance." },
          { status: 400 }
        );
      }

      if (amountValue > outstandingBalance) {
        return NextResponse.json(
          {
            error: `Payment exceeds the current credit balance. Outstanding balance: $${outstandingBalance.toFixed(
              2
            )}.`,
          },
          { status: 400 }
        );
      }

      const nextCreditBalance = roundCurrency(outstandingBalance - amountValue);

      const { error: updateCreditError } = await supabaseAdmin
        .from("credit_accounts")
        .update({
          current_balance: nextCreditBalance,
          minimum_payment_due: computeCreditMinimumPayment(nextCreditBalance),
          last_payment_at: nowIso,
          updated_at: nowIso,
        })
        .eq("account_id", destAccount.account_id);

      if (updateCreditError) {
        return NextResponse.json(
          { error: updateCreditError.message || "Failed to apply credit payment." },
          { status: 500 }
        );
      }

      transactionType = "credit_payment";
      description = "Credit card payment";
    } else {
      const { error: updateDestError } = await supabaseAdmin
        .from("accounts")
        .update({
          balance: roundCurrency(destBalance + amountValue),
          updated_at: nowIso,
        })
        .eq("account_id", destAccount.account_id);

      if (updateDestError) {
        console.error("updateDestError:", updateDestError);
        return NextResponse.json(
          { error: updateDestError.message || "Failed to update destination account." },
          { status: 500 }
        );
      }
    }

    const { error: transactionError } = await supabaseAdmin
      .from("transactions")
      .insert({
        reference_number: `TRF-${Date.now()}`,
        source_account_id: sourceAccount.account_id,
        destination_account_id: destAccount.account_id,
        amount: amountValue,
        transaction_type: transactionType,
        status: "completed",
        description,
        executed_at: nowIso,
      });

    if (transactionError) {
      console.error("transactionError:", transactionError);
      return NextResponse.json(
        {
          error:
            transactionError.message || "Balances updated but transaction record failed.",
        },
        { status: 500 }
      );
    }

    revalidatePath("/customer/dashboard");
    revalidatePath("/customer/transactions");
    revalidatePath("/customer/accounts");
    revalidatePath("/customer/transfers");

    return NextResponse.json({
      success: true,
      message: "Transfer completed successfully.",
    });
  } catch (err) {
    console.error("transfer route error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
