import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

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
    
    const formData = await req.formData();
    const fromAccountId = String(formData.get("from_account_id") || "");
    const toAccountId = String(formData.get("to_account_id") || "");
    const amountValue = Number(formData.get("amount"));

    if (!fromAccountId) {
      return NextResponse.json(
        { error: "Source account is required." },
        { status: 400 }
      );
    }

    if (!toAccountId) {
      return NextResponse.json(
        { error: "Destination account is required." },
        { status: 400 }
      );
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json(
        { error: "Source and destination accounts must be different." },
        { status: 400 }
      );
    }

    if (!amountValue || amountValue <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required." },
        { status: 400 }
      );
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 }
      );
    }

    const { data: sourceAccount, error: sourceError } = await supabase
      .from("accounts")
      .select("account_id, customer_id, balance, currency, status")
      .eq("account_id", fromAccountId)
      .eq("customer_id", customer.customer_id)
      .single();

    if (sourceError || !sourceAccount) {
      return NextResponse.json(
        { error: "Source account not found." },
        { status: 404 }
      );
    }

    if (sourceAccount.status !== "active") {
      return NextResponse.json(
        { error: "Source account is not active." },
        { status: 400 }
      );
    }

    const { data: destAccount, error: destError } = await supabase
      .from("accounts")
      .select("account_id, customer_id, balance, currency, status")
      .eq("account_id", toAccountId)
      .eq("customer_id", customer.customer_id)
      .single();

    if (destError || !destAccount) {
      return NextResponse.json(
        { error: "Destination account not found." },
        { status: 404 }
      );
    }

    if (destAccount.status !== "active") {
      return NextResponse.json(
        { error: "Destination account is not active." },
        { status: 400 }
      );
    }

    const sourceBalance = Number(sourceAccount.balance || 0);

    if (amountValue > sourceBalance) {
      return NextResponse.json(
        { error: "Insufficient funds. Transfer amount exceeds source account balance." },
        { status: 400 }
      );
    }

    const { error: updateSourceError } = await supabase
      .from("accounts")
      .update({
        balance: sourceBalance - amountValue,
        updated_at: new Date().toISOString(),
      })
      .eq("account_id", sourceAccount.account_id);

    if (updateSourceError) {
      console.error("updateSourceError:", updateSourceError);
      return NextResponse.json(
        { error: updateSourceError.message || "Failed to update source account." },
        { status: 500 }
      );
    }

    const destBalance = Number(destAccount.balance || 0);

    const { error: updateDestError } = await supabase
      .from("accounts")
      .update({
        balance: destBalance + amountValue,
        updated_at: new Date().toISOString(),
      })
      .eq("account_id", destAccount.account_id);

    if (updateDestError) {
      console.error("updateDestError:", updateDestError);
      return NextResponse.json(
        { error: updateDestError.message || "Failed to update destination account." },
        { status: 500 }
      );
    }

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        reference_number: `TRF-${Date.now()}`,
        source_account_id: sourceAccount.account_id,
        destination_account_id: destAccount.account_id,
        amount: amountValue,
        transaction_type: "transfer",
        status: "completed",
        description: "Account transfer",
        executed_at: new Date().toISOString(),
      });

    if (transactionError) {
      console.error("transactionError:", transactionError);
      return NextResponse.json(
        {
          error:
            transactionError.message || "Balances updated but transaction record failed.",
        },
        { status: 500 }
      );
    }

    revalidatePath("/customer/dashboard");
    revalidatePath("/customer/transactions");
    revalidatePath("/customer/accounts");
    revalidatePath("/customer/transfers");

    return NextResponse.json({
      success: true,
      message: "Transfer completed successfully.",
    });
  } catch (err) {
    console.error("transfer route error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
