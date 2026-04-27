import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import type { Database } from "@/lib/supabase/database.types";
import {
  computeCreditMinimumPayment,
  computeSavingsInterest,
  computeSavingsWithdrawalCap,
  getMonthKey,
  roundCurrency,
} from "@/lib/banking/rules";
import { recordBankIncomeTransactions } from "@/lib/banking/bank-income";

export async function POST(request: Request) {
  const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient<Database>(
    process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const nowIso = now.toISOString();
  const monthKey = getMonthKey(now);

  const { data: savingsAccounts } = await supabase
    .from("accounts")
    .select("account_id, balance")
    .eq("account_type", "saving")
    .eq("status", "active");

  for (const account of savingsAccounts ?? []) {
    const currentBalance = Number(account.balance || 0);

    let { data: activity } = await supabase
      .from("savings_monthly_activity")
      .select("*")
      .eq("account_id", account.account_id)
      .eq("month_key", monthKey)
      .maybeSingle();

    if (!activity) {
      const { data: created } = await supabase
        .from("savings_monthly_activity")
        .insert({
          account_id: account.account_id,
          month_key: monthKey,
          opening_balance: roundCurrency(currentBalance),
          withdrawal_cap_amount: computeSavingsWithdrawalCap(currentBalance),
          withdrawn_amount: 0,
          interest_credited_amount: 0,
        })
        .select("*")
        .single();

      activity = created ?? null;
    }

    if (activity && !activity.interest_credited_at) {
      const interestAmount = computeSavingsInterest(currentBalance);

      if (interestAmount > 0) {
        await supabase
          .from("accounts")
          .update({
            balance: roundCurrency(currentBalance + interestAmount),
            updated_at: nowIso,
          })
          .eq("account_id", account.account_id);

        await supabase
          .from("transactions")
          .insert({
            reference_number: `INT-${Date.now()}-${account.account_id.slice(0, 6)}`,
            source_account_id: null,
            destination_account_id: account.account_id,
            amount: interestAmount,
            transaction_type: "interest",
            status: "completed",
            description: "Monthly savings interest credit",
            executed_at: nowIso,
          });
      }

      await supabase
        .from("savings_monthly_activity")
        .update({
          interest_credited_amount: interestAmount,
          interest_credited_at: nowIso,
          updated_at: nowIso,
        })
        .eq("account_id", account.account_id)
        .eq("month_key", monthKey);
    }
  }

  const { data: creditAccounts } = await supabase
    .from("credit_accounts")
    .select(
      "account_id, current_balance, statement_balance, minimum_payment_due, payment_due_at, next_statement_at, late_fee_amount, last_payment_at"
    );

  for (const creditAccount of creditAccounts ?? []) {
    const currentBalance = Number(creditAccount.current_balance || 0);

    if (
      creditAccount.next_statement_at &&
      new Date(creditAccount.next_statement_at) <= now
    ) {
      const nextStatement = new Date(creditAccount.next_statement_at);
      nextStatement.setMonth(nextStatement.getMonth() + 1);
      const nextDue = new Date(nextStatement);
      nextDue.setDate(nextDue.getDate() + 25);

      await supabase
        .from("credit_accounts")
        .update({
          statement_balance: currentBalance,
          minimum_payment_due: computeCreditMinimumPayment(currentBalance),
          last_statement_at: nowIso,
          next_statement_at: nextStatement.toISOString(),
          payment_due_at: nextDue.toISOString(),
          updated_at: nowIso,
        })
        .eq("account_id", creditAccount.account_id);
    }

    if (
      currentBalance > 0 &&
      creditAccount.payment_due_at &&
      new Date(creditAccount.payment_due_at) <= now &&
      (!creditAccount.last_payment_at ||
        new Date(creditAccount.last_payment_at) < new Date(creditAccount.payment_due_at))
    ) {
      const lateFee = Number(creditAccount.late_fee_amount || 0);
      const nextBalance = roundCurrency(currentBalance + lateFee);

      await supabase
        .from("credit_accounts")
        .update({
          current_balance: nextBalance,
          statement_balance: roundCurrency(
            Number(creditAccount.statement_balance || 0) + lateFee
          ),
          minimum_payment_due: computeCreditMinimumPayment(nextBalance),
          payment_due_at: new Date(
            new Date(creditAccount.payment_due_at).setMonth(
              new Date(creditAccount.payment_due_at).getMonth() + 1
            )
          ).toISOString(),
          updated_at: nowIso,
        })
        .eq("account_id", creditAccount.account_id);

      const { data: feeTransactions } = await supabase
        .from("transactions")
        .insert({
          reference_number: `LATE-${Date.now()}-${creditAccount.account_id.slice(0, 6)}`,
          source_account_id: creditAccount.account_id,
          destination_account_id: null,
          amount: lateFee,
          transaction_type: "fee",
          status: "completed",
          description: "Late payment fee",
          executed_at: nowIso,
        })
        .select(
          "transaction_id, source_account_id, reference_number, amount, transaction_type, description, executed_at, status"
        );

      await recordBankIncomeTransactions(feeTransactions ?? []);
    }
  }

  return NextResponse.json({
    message: "Processed savings and credit-card account cycles.",
  });
}
