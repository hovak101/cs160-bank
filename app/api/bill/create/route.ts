import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const accountId = body.accountId as string;
    const payeeId = body.payeeId as string;
    const nickname = body.nickname as string;
    const amount = Number(body.amount);
    const frequency = body.frequency as string;
    const startDate = body.startDate as string;
    const endDate = body.endDate as string | null;

    if (!accountId || !payeeId || !nickname || !amount || amount <= 0 || !startDate || !frequency) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (endDate && new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: "Start date cannot be after end date." },
        { status: 400 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer profile not found." },
        { status: 404 }
      );
    }

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("account_id, customer_id, status")
      .eq("account_id", accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    if (account.customer_id !== customer.customer_id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (account.status !== "active") {
      return NextResponse.json(
        { error: "Account must be active." },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase.from("bill_schedules").insert({
      account_id: accountId,
      payee_id: payeeId,
      nickname,
      amount,
      currency: "USD",
      frequency,
      start_date: startDate,
      end_date: endDate,
      next_payment_date: startDate,
      status: "active",
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}