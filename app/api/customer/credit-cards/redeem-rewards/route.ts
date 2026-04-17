import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCreditAccount, isDepositEligible, roundCurrency } from "@/lib/banking/rules";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const creditAccountId = String(body.credit_account_id ?? "").trim();
    const destinationAccountId = String(body.destination_account_id ?? "").trim();

    if (!creditAccountId) {
      return NextResponse.json(
        { error: "Credit account is required." },
        { status: 400 }
      );
    }

    if (!destinationAccountId) {
      return NextResponse.json(
        { error: "Destination account is required." },
        { status: 400 }
      );
    }

    const { data: customer } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .single();

    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const { data: creditAccountRow, error: creditAccountError } = await supabase
      .from("accounts")
      .select("account_id, customer_id, account_type, status")
      .eq("account_id", creditAccountId)
      .eq("customer_id", customer.customer_id)
      .single();

    if (creditAccountError || !creditAccountRow) {
      return NextResponse.json(
        { error: "Credit card account not found." },
        { status: 404 }
      );
    }

    if (!isCreditAccount(creditAccountRow.account_type)) {
      return NextResponse.json(
        { error: "Rewards can only be claimed from a credit card account." },
        { status: 400 }
      );
    }

    if ((creditAccountRow.status ?? "").toLowerCase() !== "active") {
      return NextResponse.json(
        { error: "Only active credit card accounts can claim rewards." },
        { status: 400 }
      );
    }

    const { data: rewardsAccount, error: rewardsError } = await supabase
      .from("credit_accounts")
      .select("account_id, rewards_points")
      .eq("account_id", creditAccountId)
      .single();

    if (rewardsError || !rewardsAccount) {
      return NextResponse.json(
        { error: "Credit rewards details not found." },
        { status: 404 }
      );
    }

    const rewardsBalance = roundCurrency(Number(rewardsAccount.rewards_points || 0));

    if (rewardsBalance <= 0) {
      return NextResponse.json(
        { error: "There are no rewards available to claim right now." },
        { status: 400 }
      );
    }

    const { data: destinationAccount, error: destinationError } = await supabase
      .from("accounts")
      .select("account_id, customer_id, account_type, balance, status")
      .eq("account_id", destinationAccountId)
      .eq("customer_id", customer.customer_id)
      .single();

    if (destinationError || !destinationAccount) {
      return NextResponse.json(
        { error: "Destination account not found." },
        { status: 404 }
      );
    }

    if (!isDepositEligible(destinationAccount.account_type)) {
      return NextResponse.json(
        { error: "Rewards can only be redeemed into checking or savings accounts." },
        { status: 400 }
      );
    }

    if ((destinationAccount.status ?? "").toLowerCase() !== "active") {
      return NextResponse.json(
        { error: "Destination account must be active." },
        { status: 400 }
      );
    }

    const nextDestinationBalance =
      roundCurrency(Number(destinationAccount.balance || 0) + rewardsBalance);
    const nowIso = new Date().toISOString();

    const { error: updateRewardsError } = await supabase
      .from("credit_accounts")
      .update({
        rewards_points: 0,
        updated_at: nowIso,
      })
      .eq("account_id", creditAccountId);

    if (updateRewardsError) {
      return NextResponse.json(
        { error: updateRewardsError.message || "Failed to redeem rewards." },
        { status: 500 }
      );
    }

    const { error: updateDestinationError } = await supabase
      .from("accounts")
      .update({
        balance: nextDestinationBalance,
        updated_at: nowIso,
      })
      .eq("account_id", destinationAccountId);

    if (updateDestinationError) {
      return NextResponse.json(
        {
          error:
            updateDestinationError.message ||
            "Rewards were redeemed, but the destination account could not be credited.",
        },
        { status: 500 }
      );
    }

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        reference_number: `RWD-${Date.now()}`,
        source_account_id: creditAccountId,
        destination_account_id: destinationAccountId,
        amount: rewardsBalance,
        transaction_type: "deposit",
        status: "completed",
        description: "Credit card rewards redemption",
        executed_at: nowIso,
      });

    if (transactionError) {
      return NextResponse.json(
        {
          error:
            transactionError.message ||
            "Rewards were redeemed, but the transaction history entry failed.",
        },
        { status: 500 }
      );
    }

    revalidatePath("/customer/accounts");
    revalidatePath(`/customer/accounts/${creditAccountId}`);
    revalidatePath("/customer/credit-card");
    revalidatePath("/customer/dashboard");
    revalidatePath("/customer/transactions");

    return NextResponse.json({
      success: true,
      message: "Rewards claimed successfully.",
      amount: rewardsBalance,
    });
  } catch (error) {
    console.error("credit rewards redemption route error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
