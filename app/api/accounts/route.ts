import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const supabase = await createClient();

    const {
        data: {user},
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }
    
    const {data: customer, error: customerError} = await supabase
        .from("customers")
        .select("customer_id")
        .eq("user_id", user.id)
        .single();

    if (customerError || !customer) {
        return NextResponse.json({error: "Customer not found"}, {status: 404});
    }

    const {data: accounts, error: accountsError} = await supabase
        .from("accounts")
        .select("*")
        .eq("customer_id", customer.customer_id)

    if (accountsError || !accounts) {
        return NextResponse.json({error: "Accounts not found"}, {status: 404});
    }

    return NextResponse.json({accounts});
}
    
export async function POST(request: Request) {
    const supabase = await createClient();
    
    const {
        data: {user},
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    const {currency, account_name} = await request.json();

    let account_number: string;

    try{
        account_number = await generateUniqueAccountNumber(supabase);
    } catch (error) {
        return NextResponse.json({error: "Failed to generate unique account number"}, {status: 500});
    }   

    const {data: customer, error: customerError} = await supabase
        .from("customers")
        .select("customer_id")
        .eq("user_id", user.id)
        .single();
        
    if (customerError || !customer) {
        return NextResponse.json({error: "Customer not found"}, {status: 404});
    }

    const {account_type} = await request.json();
    
    const {data: newAccount, error: createError} = await supabase
        .from("accounts")
        .insert({
            customer_id: customer.customer_id,
            account_name, 
            account_number,
            account_type,
            balance: 0,
            currency: currency ?? "USD",
            status: "active",
        })
        .select("*")
        .single();

    if (createError || !newAccount) {
        return NextResponse.json({error: "Failed to create account"}, {status: 500});
    }

    return NextResponse.json(newAccount, {status: 201});    
}

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