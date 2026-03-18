import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// get all bill payment schedules for the logged in user
export async function GET() {
  const supabase = await createClient();

  let { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  // get the customer id from the customers table
  let { data: customerData } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .single();

  if (!customerData) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // get all accounts for this customer so we can find their schedules
  let { data: customerAccounts } = await supabase
    .from("accounts")
    .select("account_id")
    .eq("customer_id", customerData.customer_id);

  if (!customerAccounts || customerAccounts.length === 0) {
    return NextResponse.json({ schedules: [] });
  }

  let accountIdList = customerAccounts.map((a) => a.account_id);

  // now get all the schedules that belong to those accounts
  let { data: scheduleList } = await supabase
    .from("bill_schedules" as any)
    .select("*")
    .in("account_id", accountIdList)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  return NextResponse.json({ schedules: scheduleList ?? [] });
}

// creates a new bill payment schedule
export async function POST(request: Request) {
  const supabase = await createClient();

  let { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  let body = await request.json();
  let { account_id, payee_account_id, nickname, amount, frequency, start_date, end_date } = body;

  // make sure all required fields are filled in
  if (!account_id || !payee_account_id || !amount || !frequency || !start_date) {
    return NextResponse.json({ error: "Fill in all required fields." }, { status: 400 });
  }

  if (amount <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0." }, { status: 400 });
  }

  if (end_date && end_date <= start_date) {
    return NextResponse.json({ error: "End date must be after start date." }, { status: 400 });
  }

  const validFrequencies = ["weekly", "biweekly", "monthly", "annually", "once"];
  if (!validFrequencies.includes(frequency)) {
    return NextResponse.json({ error: "Invalid frequency." }, { status: 400 });
  }

  // check that the user actually owns the source account
  let { data: customerData } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .single();

  let { data: sourceAccount } = await supabase
    .from("accounts")
    .select("account_id, status")
    .eq("account_id", account_id)
    .eq("customer_id", customerData!.customer_id)
    .single();

  if (!sourceAccount) {
    return NextResponse.json({ error: "You don't own that account." }, { status: 403 });
  }

  if (sourceAccount.status !== "active") {
    return NextResponse.json({ error: "That account is not active." }, { status: 400 });
  }

  // save the new schedule to the database
  let { data: newSchedule, error: insertError } = await supabase
    .from("bill_schedules" as any)
    .insert({
      account_id: account_id,
      payee_id: payee_account_id,
      nickname: nickname || "Bill Payment",
      amount: amount,
      currency: "USD",
      frequency: frequency,
      start_date: start_date,
      end_date: end_date || null,
      next_payment_date: start_date,
      status: "active",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ schedule: newSchedule }, { status: 201 });
}
