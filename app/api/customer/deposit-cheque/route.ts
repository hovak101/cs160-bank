import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  LARGE_DEPOSIT_SUPPORT_MESSAGE,
  MANUAL_DEPOSIT_LIMIT_USD,
  parseCurrencyInput,
} from "@/lib/banking/amount";
import { roundCurrency } from "@/lib/banking/rules";

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
    const accountId = String(formData.get("account_id") || "");
    const parsedAmount = parseCurrencyInput(formData.get("amount"), {
      fieldLabel: "Amount",
      max: MANUAL_DEPOSIT_LIMIT_USD,
      maxErrorMessage: LARGE_DEPOSIT_SUPPORT_MESSAGE,
    });
    const chequeImage = formData.get("cheque_image") as File | null;

    if (!chequeImage) {
      return NextResponse.json(
        { error: "Cheque image is required." },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { error: "Account is required." },
        { status: 400 }
      );
    }

    if (!parsedAmount.ok) {
      return NextResponse.json(
        { error: parsedAmount.error },
        { status: 400 }
      );
    }

    const amountValue = parsedAmount.value;

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
      .select("account_id, customer_id, account_type, balance, currency, status")
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

    if (account.account_type == "credit") {
      return NextResponse.json(
        {
          error:
            "Cheque deposits are only supported for checking and savings accounts. Pay credit cards through transfers instead.",
        },
        { status: 400 }
      );
    }

    const currentBalance = Number(account.balance || 0);
    const newBalance = roundCurrency(currentBalance + amountValue);

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

    // Insert transaction first to get the transaction_id
    const { data: transactionData, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        reference_number: `CHK-${Date.now()}`,
        source_account_id: null,
        destination_account_id: account.account_id,
        amount: amountValue,
        transaction_type: "deposit",
        status: "completed",
        description: "Cheque deposit (demo)",
        executed_at: new Date().toISOString(),
      })
      .select("transaction_id")
      .single();

    if (transactionError || !transactionData) {
      console.error("transactionError:", transactionError);
      return NextResponse.json(
        {
          error:
            transactionError?.message ||
            "Balance updated but transaction failed.",
        },
        { status: 500 }
      );
    }

    // Upload cheque image to Supabase Storage
    const fileExtension = chequeImage.name.split(".").pop() || "jpg";
    const fileName = `cheques/${customer.customer_id}/${transactionData.transaction_id}.${fileExtension}`;

    try {
      const buffer = await chequeImage.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("cheques")
        .upload(fileName, new Uint8Array(buffer), {
          contentType: chequeImage.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("uploadError:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload cheque image." },
          { status: 500 }
        );
      }

      // Store image reference in cheque_deposits table
      const { error: chequeDepositError } = await supabase
        .from("cheque_deposits")
        .insert({
          transaction_id: transactionData.transaction_id,
          image_url: fileName,
        });

      if (chequeDepositError) {
        console.error("chequeDepositError:", chequeDepositError);
        return NextResponse.json(
          { error: "Transaction created but failed to store image reference." },
          { status: 500 }
        );
      }
    } catch (uploadErr) {
      console.error("Image upload error:", uploadErr);
      return NextResponse.json(
        { error: "Failed to process cheque image." },
        { status: 500 }
      );
    }

    revalidatePath("/customer/dashboard");
    revalidatePath("/customer/transactions");
    revalidatePath("/customer/accounts");

    return NextResponse.json({
      success: true,
      message: "Deposit successful (demo mode)",
    });
  } catch (err) {
    console.error("deposit route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
