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

    const formData = await req.formData();
    const accountId = String(formData.get("account_id") || "");
    const amountValue = Number(formData.get("amount"));

    if (!accountId) {
      return NextResponse.json(
        { error: "Account is required." },
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

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("account_id, customer_id, balance, currency, status")
      .eq("account_id", accountId)
      .eq("customer_id", customer.customer_id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 }
      );
    }

    if (account.status !== "active") {
      return NextResponse.json(
        { error: "Account is not active." },
        { status: 400 }
      );
    }

    const currentBalance = Number(account.balance || 0);

    if (amountValue > currentBalance) {
      return NextResponse.json(
        { error: "Insufficient funds. Withdrawal amount exceeds current balance." },
        { status: 400 }
      );
    }

    const newBalance = currentBalance - amountValue;

    const { error: updateAccountError } = await supabase
      .from("accounts")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("account_id", account.account_id);

    if (updateAccountError) {
      console.error("updateAccountError:", updateAccountError);
      return NextResponse.json(
        { error: updateAccountError.message || "Failed to update account." },
        { status: 500 }
      );
    }

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        reference_number: `WTH-${Date.now()}`,
        source_account_id: account.account_id,
        destination_account_id: null,
        amount: amountValue,
        transaction_type: "withdrawal",
        status: "completed",
        description: "Cash withdrawal",
        executed_at: new Date().toISOString(),
      });

    if (transactionError) {
      console.error("transactionError:", transactionError);
      return NextResponse.json(
        {
          error:
            transactionError.message || "Balance updated but transaction failed.",
        },
        { status: 500 }
      );
    }

    revalidatePath("/customer/dashboard");
    revalidatePath("/customer/transactions");
    revalidatePath("/customer/accounts");
    revalidatePath("/customer/withdraw");

    return NextResponse.json({
      success: true,
      message: "Withdrawal completed successfully.",
    });
  } catch (err) {
    console.error("withdraw route error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}