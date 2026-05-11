import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { roundCurrency } from "@/lib/banking/rules";
import type { Database, Tables } from "@/lib/supabase/database.types";

type BillScheduleRow = Tables<"bill_schedules">;
type BillSchedule = BillScheduleRow & {
  account_id: string;
  payee_id: string;
  amount: number;
  frequency: string;
  next_payment_date: string;
};

type ServiceSupabase = SupabaseClient<Database>;
import { todayInBankTz } from "@/lib/banking/clock";

// this runs every day at 8am via vercel cron
// it finds all payments that are due and processes them
// (deduct from payer, credit payee - both are internal accounts).
export async function POST(request: Request) {
  const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfigured: no NEXT_PUBLIC_CRON_SECRET set" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  let authorizedByCronSecret = false;

  if (authHeader) {
    const expected = `Bearer ${cronSecret}`;
    const a = Buffer.from(authHeader);
    const b = Buffer.from(expected);
    authorizedByCronSecret = a.length === b.length && timingSafeEqual(a, b);
  }

  if (!authorizedByCronSecret) {
    const supabaseSession = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseSession.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabaseSession
      .from("users")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!["customer", "manager", "admin"].includes(userData?.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = todayInBankTz();

  const { data: dueSchedules, error: fetchError } = await supabase
    .from("bill_schedules")
    .select("*")
    .eq("status", "active")
    .lte("next_payment_date", today);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!dueSchedules || dueSchedules.length === 0) {
    return NextResponse.json({ message: "No payments due today" });
  }

  for (const schedule of dueSchedules) {
    if (
      !schedule.account_id ||
      !schedule.payee_id ||
      schedule.amount == null ||
      !schedule.frequency ||
      !schedule.next_payment_date
    ) {
      await stopSchedule(supabase, schedule, "cancelled", "invalid_schedule");
      continue;
    }

    await processOnePayment(
      supabase,
      {
        ...schedule,
        account_id: schedule.account_id,
        payee_id: schedule.payee_id,
        amount: Number(schedule.amount),
        frequency: schedule.frequency,
        next_payment_date: schedule.next_payment_date,
      },
      today
    );
  }

  return NextResponse.json({
    message: `Processed ${dueSchedules.length} payment(s).`,
  });
}

async function processOnePayment(
  supabase: ServiceSupabase,
  schedule: BillSchedule,
  today: string
) {
  if (schedule.end_date && schedule.end_date < today) {
    await supabase
      .from("bill_schedules")
      .update({ status: "completed" })
      .eq("schedule_id", schedule.schedule_id);
    return;
  }

  const { data: fromAccount } = await supabase
    .from("accounts")
    .select("balance, status")
    .eq("account_id", schedule.account_id)
    .single();

  if (!fromAccount || fromAccount.status !== "active") {
    // Log a failed transaction so the attempt is visible in the account's transaction history
    const { data: failedTxn } = await supabase
      .from("transactions")
      .insert({
        reference_number: `BP-FAIL-${Date.now()}`,
        source_account_id: schedule.account_id,
        destination_account_id: schedule.payee_id,
        amount: schedule.amount,
        transaction_type: "bill_payment",
        status: "failed",
        description: `Bill payment failed: ${schedule.nickname} - source account is closed or inactive`,
        executed_at: new Date().toISOString(),
      })
      .select("transaction_id")
      .single();

    await stopSchedule(supabase, schedule, "cancelled", "source_account_inactive", failedTxn?.transaction_id ?? null);
    return;
  }

  if (Number(fromAccount.balance) < Number(schedule.amount)) {
    await recordExecution(supabase, schedule, "failed", "insufficient_funds");

    const nextPaymentDate = getNextDate(schedule.next_payment_date, schedule.frequency);
    const scheduleIsDone = schedule.end_date && nextPaymentDate > schedule.end_date;
    await supabase
      .from("bill_schedules")
      .update({
        next_payment_date: nextPaymentDate,
        status: scheduleIsDone ? "completed" : "active",
      })
      .eq("schedule_id", schedule.schedule_id);
    return;
  }

  const { data: toAccount } = await supabase
    .from("accounts")
    .select("balance, status")
    .eq("account_id", schedule.payee_id)
    .single();

  if (!toAccount || toAccount.status !== "active") {
    await stopSchedule(supabase, schedule, "cancelled", "payee_account_inactive");
    return;
  }

  await supabase
    .from("accounts")
    .update({ balance: roundCurrency(fromAccount.balance - schedule.amount) })
    .eq("account_id", schedule.account_id);

  await supabase
    .from("accounts")
    .update({ balance: roundCurrency(toAccount.balance + schedule.amount) })
    .eq("account_id", schedule.payee_id);

  const { data: txn } = await supabase
    .from("transactions")
    .insert({
      reference_number: `BP-${Date.now()}`,
      source_account_id: schedule.account_id,
      destination_account_id: schedule.payee_id,
      amount: schedule.amount,
      transaction_type: "bill_payment",
      status: "completed",
      description: `Bill payment: ${schedule.nickname}`,
      executed_at: new Date().toISOString(),
    })
    .select("transaction_id")
    .single();

  await recordExecution(
    supabase,
    schedule,
    "success",
    null,
    txn ? txn.transaction_id : null
  );

  const nextPaymentDate = getNextDate(
    schedule.next_payment_date,
    schedule.frequency
  );
  const scheduleIsDone = schedule.end_date && nextPaymentDate > schedule.end_date;

  await supabase
    .from("bill_schedules")
    .update({
      next_payment_date: nextPaymentDate,
      status: scheduleIsDone ? "completed" : "active",
    })
    .eq("schedule_id", schedule.schedule_id);
}

async function stopSchedule(
  supabase: ServiceSupabase,
  schedule: Pick<BillScheduleRow, "schedule_id" | "next_payment_date">,
  nextStatus: "cancelled" | "completed",
  failureReason?: string | null,
  transactionId?: string | null
) {
  await supabase
    .from("bill_schedules")
    .update({ status: nextStatus })
    .eq("schedule_id", schedule.schedule_id);

  if (failureReason) {
    await recordExecution(supabase, schedule, "failed", failureReason, transactionId ?? null);
  }
}

async function recordExecution(
  supabase: ServiceSupabase,
  schedule: Pick<BillScheduleRow, "schedule_id" | "next_payment_date">,
  status: "failed" | "success",
  failureReason?: string | null,
  transactionId?: string | null
) {
  await supabase.from("payment_executions").insert({
    schedule_id: schedule.schedule_id,
    transaction_id: transactionId ?? null,
    scheduled_date: schedule.next_payment_date ?? new Date().toISOString().split("T")[0],
    actual_execution_at: new Date().toISOString(),
    status,
    failure_reason: failureReason ?? null,
    retry_count: 0,
  });
}

function getNextDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);
  if (frequency === "weekly") date.setDate(date.getDate() + 7);
  if (frequency === "bi-weekly") date.setDate(date.getDate() + 14);
  if (frequency === "monthly") date.setMonth(date.getMonth() + 1);
  if (frequency === "annually") date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split("T")[0];
}
