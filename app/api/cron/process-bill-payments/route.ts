import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import { todayInBankTz } from "@/lib/banking/clock";

// this runs every day at 8am via vercel cron
// it finds all payments that are due and processes them
// (deduct from payer, credit payee — both are internal accounts).
export async function POST(request: Request) {
  const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfigured: no NEXT_PUBLIC_CRON_SECRET set" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
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
    await processOnePayment(supabase, schedule, today);
  }

  return NextResponse.json({ message: `Processed ${dueSchedules.length} payment(s).` });
}

async function processOnePayment(supabase: any, schedule: any, today: string) {

  // Past end date, mark completed
  if (schedule.end_date && schedule.end_date < today) {
    await supabase
      .from("bill_schedules")
      .update({ status: "completed" })
      .eq("schedule_id", schedule.schedule_id);
    return;
  }

  // Look up source account
  const { data: fromAccount } = await supabase
    .from("accounts")
    .select("balance, status")
    .eq("account_id", schedule.account_id)
    .single();

  if (!fromAccount || fromAccount.status !== "active") {
    await cancelSchedule(supabase, schedule.schedule_id);
    return;
  }

  // Insufficient funds: log the failed cycle but keep the schedule active.
  // Advance next_payment_date by one frequency unit so the cron doesn't retry
  // the same failing date on every tick — the user fixes their balance and the
  // next cycle runs normally.
  if (Number(fromAccount.balance) < Number(schedule.amount)) {
    await supabase.from("payment_executions").insert({
      schedule_id: schedule.schedule_id,
      scheduled_date: schedule.next_payment_date,
      actual_execution_at: new Date().toISOString(),
      status: "failed",
      failure_reason: "insufficient_funds",
      retry_count: 0,
    });

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

  // Look up payee account, resolved from account number at schedule creation
  const { data: toAccount } = await supabase
    .from("accounts")
    .select("balance, status")
    .eq("account_id", schedule.payee_id)
    .single();

  if (!toAccount || toAccount.status !== "active") {
    await cancelSchedule(supabase, schedule.schedule_id);
    return;
  }

  // Deduct from payer
  await supabase
    .from("accounts")
    .update({ balance: fromAccount.balance - schedule.amount })
    .eq("account_id", schedule.account_id);

  // Send to payee
  await supabase
    .from("accounts")
    .update({ balance: toAccount.balance + schedule.amount })
    .eq("account_id", schedule.payee_id);

  // Record bill_payment
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

  await supabase.from("payment_executions").insert({
    schedule_id: schedule.schedule_id,
    transaction_id: txn ? txn.transaction_id : null,
    scheduled_date: schedule.next_payment_date,
    actual_execution_at: new Date().toISOString(),
    status: "success",
    retry_count: 0,
  });

  // Get to next payment date
  const nextPaymentDate = getNextDate(schedule.next_payment_date, schedule.frequency);
  const scheduleIsDone = schedule.end_date && nextPaymentDate > schedule.end_date;

  await supabase
    .from("bill_schedules")
    .update({
      next_payment_date: nextPaymentDate,
      status: scheduleIsDone ? "completed" : "active",
    })
    .eq("schedule_id", schedule.schedule_id);
}

async function cancelSchedule(supabase: any, scheduleId: string) {
  await supabase
    .from("bill_schedules")
    .update({ status: "cancelled" })
    .eq("schedule_id", scheduleId);
}

function getNextDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);
  if (frequency === "weekly")    date.setDate(date.getDate() + 7);
  if (frequency === "bi-weekly") date.setDate(date.getDate() + 14);
  if (frequency === "monthly")   date.setMonth(date.getMonth() + 1);
  if (frequency === "annually")  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split("T")[0];
}
