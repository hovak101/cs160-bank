import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseCurrencyInput } from "@/lib/banking/amount";

type BillScheduleRow = {
  schedule_id: string;
  account_id: string;
  payee_id: string;
  nickname: string | null;
  amount: number;
  currency: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  next_payment_date: string | null;
  status: string | null;
  created_at?: string | null;
};

type PaymentExecutionRow = {
  schedule_id: string;
  status: string | null;
  failure_reason: string | null;
  actual_execution_at: string | null;
  scheduled_date: string | null;
};
import { validateMoneyAmount, validateNotPastDate } from "@/lib/banking/validation";
import { todayInBankTz } from "@/lib/banking/clock";

// get all bill payment schedules for the logged in user
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (userData?.role !== "customer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: customerData } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .single();

  if (!customerData) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const { data: customerAccounts } = await supabase
    .from("accounts")
    .select("account_id")
    .eq("customer_id", customerData.customer_id);

  if (!customerAccounts || customerAccounts.length === 0) {
    return NextResponse.json({ schedules: [] });
  }

  const accountIdList = customerAccounts.map((account) => account.account_id);

  const { data: scheduleList } = await supabaseAdmin
    .from("bill_schedules")
    .select("*")
    .in("account_id", accountIdList)
    .order("created_at", { ascending: false })
    .returns<BillScheduleRow[]>();

  const schedules = scheduleList ?? [];
  const scheduleIds = schedules.map((schedule) => schedule.schedule_id);
  const { data: executions } =
    scheduleIds.length > 0
      ? await supabaseAdmin
          .from("payment_executions")
          .select(
            "schedule_id, status, failure_reason, actual_execution_at, scheduled_date"
          )
          .in("schedule_id", scheduleIds)
          .order("actual_execution_at", { ascending: false })
          .returns<PaymentExecutionRow[]>()
      : { data: [] };

  const latestExecutionBySchedule = new Map<string, PaymentExecutionRow>();
  for (const execution of executions ?? []) {
    if (!latestExecutionBySchedule.has(execution.schedule_id)) {
      latestExecutionBySchedule.set(execution.schedule_id, execution);
    }
  }

  return NextResponse.json({
    schedules: schedules.map((schedule) => ({
      ...schedule,
      last_execution: latestExecutionBySchedule.get(schedule.schedule_id) ?? null,
    })),
  });
}

// creates a new bill payment schedule
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await request.json();
  const {
    account_id,
    payee_account_number,
    nickname,
    amount,
    frequency,
    start_date,
    end_date,
  } = body;

  if (!account_id || !payee_account_number || !amount || !frequency || !start_date) {
    return NextResponse.json(
      { error: "Fill in all required fields." },
      { status: 400 }
    );
  }

  const parsedAmount = parseCurrencyInput(amount, {
    fieldLabel: "Amount",
  });

  if (!parsedAmount.ok) {
    return NextResponse.json({ error: parsedAmount.error }, { status: 400 });
  }

  if (!/^\d+(\.\d{1,2})?$/.test(String(amount))) {
    return NextResponse.json({ error: "Amount must have at most 2 decimal places." }, { status: 400 });
  }

  const amountError = validateMoneyAmount(Number(amount));
  if (amountError) {
    return NextResponse.json({ error: amountError }, { status: 400 });
  }

  const startDateError = validateNotPastDate(start_date, todayInBankTz(), "Start date");
  if (startDateError) {
    return NextResponse.json({ error: startDateError }, { status: 400 });
  }

  if (end_date && end_date <= start_date) {
    return NextResponse.json(
      { error: "End date must be after start date." },
      { status: 400 }
    );
  }

  const validFrequencies = ["weekly", "bi-weekly", "monthly", "annually"];
  if (!validFrequencies.includes(frequency)) {
    return NextResponse.json({ error: "Invalid frequency." }, { status: 400 });
  }

  const { data: customerData } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .single();

  const { data: sourceAccount } = await supabase
    .from("accounts")
    .select("account_id, account_type, status, balance")
    .eq("account_id", account_id)
    .eq("customer_id", customerData!.customer_id)
    .single();

  if (!sourceAccount) {
    return NextResponse.json(
      { error: "You don't own that account." },
      { status: 403 }
    );
  }
  if (sourceAccount.status !== "active") {
    return NextResponse.json(
      { error: "That account is not active." },
      { status: 400 }
    );
  }
  if (sourceAccount.account_type !== "checking") {
    return NextResponse.json(
      { error: "Bill payments can only be scheduled from active checking accounts." },
      { status: 400 }
    );
  }
  if (Number(sourceAccount.balance) < Number(amount)) {
    return NextResponse.json(
      {
        error: `Insufficient funds in source account. Balance is $${Number(sourceAccount.balance).toFixed(2)}, scheduled amount is $${Number(amount).toFixed(2)}.`,
      },
      { status: 400 },
    );
  }

  const { data: payeeAccount } = await supabaseAdmin
    .from("accounts")
    .select("account_id, status, account_name")
    .eq("account_number", payee_account_number)
    .single();

  if (!payeeAccount) {
    return NextResponse.json(
      {
        error:
          "No account found with that account number. The recipient must have an account at this bank.",
      },
      { status: 404 }
    );
  }
  if (payeeAccount.status !== "active") {
    return NextResponse.json(
      { error: "That payee account is not active." },
      { status: 400 }
    );
  }

  if (payeeAccount.account_id === account_id) {
    return NextResponse.json(
      { error: "You can't schedule a bill payment to your own account." },
      { status: 400 }
    );
  }

  const { data: newSchedule, error: insertError } = await supabaseAdmin
    .from("bill_schedules")
    .insert({
      account_id,
      payee_id: payeeAccount.account_id,
      nickname: nickname || `Bill Payment -> ${payeeAccount.account_name}`,
      amount: parsedAmount.value,
      currency: "USD",
      frequency,
      start_date,
      end_date: end_date || null,
      next_payment_date: start_date,
      status: "active",
    })
    .select()
    .single<BillScheduleRow>();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ schedule: newSchedule }, { status: 201 });
}
