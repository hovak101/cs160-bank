import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildCreditCardSeed, getCustomerDisplayName } from "@/lib/banking/server";
import { getDefaultCreditTerms } from "@/lib/banking/rules";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
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
    
    const body = await request.json();
    const { currency, account_name, account_type } = body;

    const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("customer_id, first_name, last_name")
        .eq("user_id", user.id)
        .single();
        
    if (customerError || !customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    const dbAccountType = (() => {
        if (!account_type) return "checking";
        const v = account_type.toString().trim().toLowerCase();
        if (v.includes("check")) return "checking";
        if (v.includes("sav")) return "saving";
        if (v.includes("credit")) return "credit";
        return "checking";
    })();

    let account_number: string;
    try {
        account_number = await generateUniqueAccountNumber(supabase);
    } catch (error) {
        return NextResponse.json({ error: "Failed to generate account number" }, { status: 500 });
    }   
    const { data: newAccount, error: createError } = await supabase
        .from("accounts")
        .insert({
            customer_id: customer.customer_id,
            account_name: account_name || "New Account", 
            account_number,
            account_type: dbAccountType,
            balance: 0,
            currency: currency ?? "USD",
            status: "active",
        })
        .select("*")
        .single();

    if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    if (dbAccountType === "credit") {
        const creditTerms = getDefaultCreditTerms();

        const { error: creditAccountError } = await supabase
          .from("credit_accounts")
          .insert({
            account_id: newAccount.account_id,
            ...creditTerms,
          });

        if (creditAccountError) {
          await supabase.from("accounts").delete().eq("account_id", newAccount.account_id);
          return NextResponse.json(
            { error: creditAccountError.message || "Failed to create credit account details." },
            { status: 500 }
          );
        }

        const cardholderName = getCustomerDisplayName(customer);
        const { error: creditCardError } = await supabase
          .from("credit_cards")
          .insert({
            account_id: newAccount.account_id,
            ...buildCreditCardSeed(cardholderName),
          });

        if (creditCardError) {
          await supabase.from("credit_accounts").delete().eq("account_id", newAccount.account_id);
          await supabase.from("accounts").delete().eq("account_id", newAccount.account_id);
          return NextResponse.json(
            { error: creditCardError.message || "Failed to issue credit card." },
            { status: 500 }
          );
        }
    }

    return NextResponse.json(newAccount, { status: 201 });    
}

async function generateUniqueAccountNumber(supabase: any): Promise<string> {
  let attempts = 0;
  while(attempts < 10) {
    const candidate = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const { data: existing } = await supabase
      .from("accounts")
      .select("account_number")
      .eq("account_number", candidate)
      .maybeSingle();
    if (!existing) return candidate;
    attempts++;
  }
  throw new Error("Could not generate unique account number");
}
