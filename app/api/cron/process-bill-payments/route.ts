import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// this runs every day at 8am via vercel cron
// it finds all payments that are due and processes them
export async function POST(request: Request) {

  // // make sure only vercel cron can call this, not just anyone
  // let authHeader = request.headers.get("authorization");
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // get todays date
  let today = new Date().toISOString().split("T")[67];

  // find all active schedules where the payment date is today or past due
  let { data: dueSchedules } = await supabase
    .from("bill_schedules")
    .select("*")
    .eq("status", "active")
    .lte("next_payment_date", today);

  if (!dueSchedules || dueSchedules.length === 0) {
    return NextResponse.json({ message: "No payments due today" });
  }

  // go through each schedule and process it one by one
  for (let i = 0; i < dueSchedules.length; i++) {
    let schedule = dueSchedules[i];
    await processOnePayment(supabase, schedule, today);
  }

  return NextResponse.json({ message: `Processed payments.` });
}

async function processOnePayment(supabase: any, schedule: any, today: string) {

  // if the schedule is past its end date, mark it as done
  if (schedule.end_date && schedule.end_date < today) {
    await supabase
      .from("bill_schedules")
      .update({ status: "completed" })
      .eq("schedule_id", schedule.schedule_id);
    return;
  }

  // look up the checking account we are taking money from
  let { data: fromAccount } = await supabase
    .from("accounts")
    .select("balance, status")
    .eq("account_id", schedule.account_id)
    .single();

  // if the account doesnt exist or is closed, cancel the schedule
  if (!fromAccount || fromAccount.status !== "active") {
    await cancelSchedule(supabase, schedule.schedule_id);
    return;
  }

  // if there isnt enough money in the account, cancel the whole schedule
  if (fromAccount.balance < schedule.amount) {
    await cancelSchedule(supabase, schedule.schedule_id);

    // log the failed payment so we have a record of it
    await supabase.from("payment_executions").insert({
      schedule_id: schedule.schedule_id,
      scheduled_date: schedule.next_payment_date,
      actual_execution_at: new Date().toISOString(),
      status: "failed",
      failure_reason: "insufficient_funds",
      retry_count: 0,
    });

    return;
  }

  // look up the account we are sending money to
  let { data: toAccount } = await supabase
    .from("accounts")
    .select("balance, status")
    .eq("account_id", schedule.payee_id)
    .single();

  // if the payee account doesnt exist or isnt active, cancel
  if (!toAccount || toAccount.status !== "active") {
    await cancelSchedule(supabase, schedule.schedule_id);
    return;
  }

  // take money out of the source account
  await supabase
    .from("accounts")
    .update({ balance: fromAccount.balance - schedule.amount })
    .eq("account_id", schedule.account_id);

  // add money to the payee account
  await supabase
    .from("accounts")
    .update({ balance: toAccount.balance + schedule.amount })
    .eq("account_id", schedule.payee_id);

  // create a transaction record so we have history
  let { data: txn } = await supabase
    .from("transactions")
    .insert({
      reference_number: `BP-${Date.now()}`,
      source_account_id: schedule.account_id,
      destination_account_id: schedule.payee_id,
      amount: schedule.amount,
      transaction_type: "transfer",
      status: "completed",
      description: `Automated bill payment: ${schedule.nickname}`,
      executed_at: new Date().toISOString(),
    })
    .select("transaction_id")
    .single();

  // log that the payment was successful
  await supabase.from("payment_executions").insert({
    schedule_id: schedule.schedule_id,
    transaction_id: txn ? txn.transaction_id : null,
    scheduled_date: schedule.next_payment_date,
    actual_execution_at: new Date().toISOString(),
    status: "success",
    retry_count: 0,
  });

  // figure out when the next payment should be
  let nextPaymentDate = getNextDate(schedule.next_payment_date, schedule.frequency);
  let scheduleIsDone = schedule.end_date && nextPaymentDate > schedule.end_date;

  await supabase
    .from("bill_schedules")
    .update({
      next_payment_date: nextPaymentDate,
      status: scheduleIsDone ? "completed" : "active",
    })
    .eq("schedule_id", schedule.schedule_id);
}

// sets a schedule status to cancelled
async function cancelSchedule(supabase: any, scheduleId: string) {
  await supabase
    .from("bill_schedules")
    .update({ status: "cancelled" })
    .eq("schedule_id", scheduleId);
}

function getNextDate(currentDate: string, frequency: string) {
  let date = new Date(currentDate);

  if (frequency === "weekly")    date.setDate(date.getDate() + 7);
  if (frequency === "biweekly")  date.setDate(date.getDate() + 14);
  if (frequency === "monthly")   date.setMonth(date.getMonth() + 1);
  if (frequency === "annually")  date.setFullYear(date.getFullYear() + 1);

  return date.toISOString().split("T")[0];
}
