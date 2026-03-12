import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient();

  // Get user from auth
  const { data: { user },} = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get customer profile
  const { data: customer} = await supabase
    .from("customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .single();

    // If no customer profile, user needs to create one before managing accounts
    if (!customer) {
      return NextResponse.json({ error: "Customer profile not found" }, { status: 404 });
  }

  // Get accounts for customer
  const { data, error } = await supabase
    .from("accounts")
    .select("account_id, account_number, balance, currency, status, created_at, updated_at")
    .eq("customer_id", customer.customer_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Get user from auth
  const { data: { user },} = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body for currency
  const { currency } = await request.json();

  // Generate unique account number
  let account_number: string;
  try {
    account_number = await generateUniqueAccountNumber(supabase);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Could not generate unique account number" },
      { status: 500 }
    );
  }

  // Get customer profile
  const { data: customer} = await supabase
    .from("customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .single();

   if (!customer) {
    return NextResponse.json({ error: "Customer profile not found" }, { status: 404 });
  }

  // Create new account with 0 balance and "active" status
  const { data, error } = await supabase
    .from("accounts")
    .insert([
      {
        customer_id: customer.customer_id,
        account_number,
        balance: 0,
        currency: currency ?? "USD",
        status: "active",
      },
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}


// Helper to generate unique account numbers
async function generateUniqueAccountNumber(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  let attempts = 0;
  while(attempts < 10) {
    const candidate = generateAccountNumber();
    const { data: existing } = await supabase
      .from("accounts")
      .select("account_number")
      .eq("account_number", candidate)
      .maybeSingle();

    if (!existing) {
      return candidate;
    }
    attempts++;
  }
  throw new Error("Could not generate unique account number");
}

// Simple account number generator using timestamp and random string
function generateAccountNumber(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${timestamp}${random}`;
}

