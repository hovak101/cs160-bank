import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildStoredAtmTransactionDescription,
  canUseAtmDeposit,
  canUseAtmWithdrawal,
  getAtmAccountRestrictionMessage,
  getAtmAccountStatusErrorMessage,
} from "@/lib/atm/demo";
import {
  LARGE_DEPOSIT_SUPPORT_MESSAGE,
  MANUAL_DEPOSIT_LIMIT_USD,
} from "@/lib/banking/amount";
import {
  computeCreditCashAdvanceFee,
  computeCreditMinimumPayment,
  getAccountTypeLabel,
  isCreditAccount,
  isSavingsAccount,
  roundCurrency,
} from "@/lib/banking/rules";
import {
  getOrCreateSavingsMonthlyActivity,
  getRemainingSavingsWithdrawalAllowance,
} from "@/lib/banking/server";
import { recordBankIncomeTransactions } from "@/lib/banking/bank-income";

export const dynamic = "force-dynamic";

async function failPendingAtmSimulation(params: {
  supabase: typeof supabaseAdmin;
  simulationId: string;
  transactionId: string;
  action: "deposit" | "withdraw";
  atmName: string;
  atmLocation: string;
  reason: string;
  status?: number;
}) {
  const nowIso = new Date().toISOString();
  const failedDescription = buildStoredAtmTransactionDescription(
    params.action,
    params.atmName,
    params.atmLocation,
    "failed"
  );

  await params.supabase
    .from("transactions")
    .update({
      status: "failed",
      description: failedDescription,
      executed_at: nowIso,
    })
    .eq("status", "pending")
    .eq("transaction_id", params.transactionId);

  await params.supabase
    .from("atm_simulations")
    .update({
      status: "failed",
      completed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("status", "pending")
    .eq("atm_simulation_id", params.simulationId);

  return NextResponse.json(
    { error: params.reason },
    { status: params.status ?? 400 }
  );
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ atmSimulationId: string }> }
) {
  try {
    const { atmSimulationId } = await context.params;
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

    if (!atmSimulationId) {
      return NextResponse.json(
        { error: "ATM simulation id is required." },
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

    const { data: simulation, error: simulationError } = await supabase
      .from("atm_simulations")
      .select(
        "atm_simulation_id, transaction_id, customer_id, account_id, atm_id, atm_name, atm_location, action, amount, verification_code, status, created_at, completed_at"
      )
      .eq("atm_simulation_id", atmSimulationId)
      .eq("customer_id", customer.customer_id)
      .single();

    if (simulationError || !simulation) {
      return NextResponse.json(
        { error: "Pending ATM action not found." },
        { status: 404 }
      );
    }

    if ((simulation.status ?? "").toLowerCase() !== "pending") {
      return NextResponse.json(
        { error: "This ATM action has already been completed." },
        { status: 400 }
      );
    }

    const action = simulation.action === "deposit" ? "deposit" : "withdraw";

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select(
        "account_id, customer_id, account_name, account_number, account_type, balance, currency, status"
      )
      .eq("account_id", simulation.account_id)
      .eq("customer_id", customer.customer_id)
      .single();

    if (accountError || !account) {
      return failPendingAtmSimulation({
        supabase: supabaseAdmin,
        simulationId: simulation.atm_simulation_id,
        transactionId: simulation.transaction_id,
        action,
        atmName: simulation.atm_name,
        atmLocation: simulation.atm_location,
        reason: "The selected account could not be found.",
        status: 404,
      });
    }

    const statusError = getAtmAccountStatusErrorMessage(account.status);
    if (statusError) {
      return failPendingAtmSimulation({
        supabase: supabaseAdmin,
        simulationId: simulation.atm_simulation_id,
        transactionId: simulation.transaction_id,
        action,
        atmName: simulation.atm_name,
        atmLocation: simulation.atm_location,
        reason: statusError,
      });
    }

    const amount = Number(simulation.amount || 0);
    const nowIso = new Date().toISOString();
    const completedDescription = buildStoredAtmTransactionDescription(
      action,
      simulation.atm_name,
      simulation.atm_location,
      "completed"
    );
    const accountRestrictionMessage = getAtmAccountRestrictionMessage(
      account.account_type,
      action
    );
    if (accountRestrictionMessage) {
      return failPendingAtmSimulation({
        supabase: supabaseAdmin,
        simulationId: simulation.atm_simulation_id,
        transactionId: simulation.transaction_id,
        action,
        atmName: simulation.atm_name,
        atmLocation: simulation.atm_location,
        reason: accountRestrictionMessage,
      });
    }

    const { data: claimedSimulation, error: claimSimulationError } = await supabase
      .from("atm_simulations")
      .update({
        status: "completed",
        completed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("status", "pending")
      .eq("atm_simulation_id", simulation.atm_simulation_id)
      .select("atm_simulation_id")
      .maybeSingle();

    if (claimSimulationError || !claimedSimulation) {
      return NextResponse.json(
        {
          error:
            claimSimulationError?.message ||
            "This ATM action has already been completed.",
        },
        { status: 400 }
      );
    }

    if (action === "deposit") {
      if (amount > MANUAL_DEPOSIT_LIMIT_USD) {
        return failPendingAtmSimulation({
          supabase: supabaseAdmin,
          simulationId: simulation.atm_simulation_id,
          transactionId: simulation.transaction_id,
          action,
          atmName: simulation.atm_name,
          atmLocation: simulation.atm_location,
          reason: LARGE_DEPOSIT_SUPPORT_MESSAGE,
        });
      }

      if (!canUseAtmDeposit(account.account_type)) {
        return failPendingAtmSimulation({
          supabase: supabaseAdmin,
          simulationId: simulation.atm_simulation_id,
          transactionId: simulation.transaction_id,
          action,
          atmName: simulation.atm_name,
          atmLocation: simulation.atm_location,
          reason: `${getAccountTypeLabel(account.account_type)} accounts cannot receive ATM deposits in this demo.`,
        });
      }

      const nextBalance = roundCurrency(Number(account.balance || 0) + amount);

      const { error: updateAccountError } = await supabaseAdmin
        .from("accounts")
        .update({
          balance: nextBalance,
          updated_at: nowIso,
        })
        .eq("account_id", account.account_id);

      if (updateAccountError) {
        return NextResponse.json(
          { error: updateAccountError.message || "Failed to update account balance." },
          { status: 500 }
        );
      }
    } else {
      if (!canUseAtmWithdrawal(account.account_type)) {
        return failPendingAtmSimulation({
          supabase: supabaseAdmin,
          simulationId: simulation.atm_simulation_id,
          transactionId: simulation.transaction_id,
          action,
          atmName: simulation.atm_name,
          atmLocation: simulation.atm_location,
          reason: `${getAccountTypeLabel(account.account_type)} accounts cannot be used for ATM withdrawals in this demo.`,
        });
      }

      if (isCreditAccount(account.account_type)) {
        const { data: creditAccount, error: creditAccountError } = await supabase
          .from("credit_accounts")
          .select(
            "account_id, available_credit, current_balance, cash_advance_limit, cash_advance_balance"
          )
          .eq("account_id", account.account_id)
          .single();

        if (creditAccountError || !creditAccount) {
          return failPendingAtmSimulation({
            supabase: supabaseAdmin,
            simulationId: simulation.atm_simulation_id,
            transactionId: simulation.transaction_id,
            action,
            atmName: simulation.atm_name,
            atmLocation: simulation.atm_location,
            reason: "Credit account details not found.",
            status: 404,
          });
        }

        const feeAmount = computeCreditCashAdvanceFee(amount);
        const availableCredit = Number(creditAccount.available_credit || 0);
        const cashAdvanceRemaining = Math.max(
          Number(creditAccount.cash_advance_limit || 0) -
            Number(creditAccount.cash_advance_balance || 0),
          0
        );

        if (amount > cashAdvanceRemaining) {
          return failPendingAtmSimulation({
            supabase: supabaseAdmin,
            simulationId: simulation.atm_simulation_id,
            transactionId: simulation.transaction_id,
            action,
            atmName: simulation.atm_name,
            atmLocation: simulation.atm_location,
            reason: `Cash advance limit exceeded. You can withdraw up to $${cashAdvanceRemaining.toFixed(
              2
            )} right now.`,
          });
        }

        if (amount + feeAmount > availableCredit) {
          return failPendingAtmSimulation({
            supabase: supabaseAdmin,
            simulationId: simulation.atm_simulation_id,
            transactionId: simulation.transaction_id,
            action,
            atmName: simulation.atm_name,
            atmLocation: simulation.atm_location,
            reason:
              "Insufficient available credit to cover the ATM cash advance and fee.",
          });
        }

        const nextCurrentBalance =
          Number(creditAccount.current_balance || 0) + amount + feeAmount;
        const nextCashAdvanceBalance =
          Number(creditAccount.cash_advance_balance || 0) + amount;

        const { error: updateCreditError } = await supabaseAdmin
          .from("credit_accounts")
          .update({
            current_balance: nextCurrentBalance,
            cash_advance_balance: nextCashAdvanceBalance,
            minimum_payment_due: computeCreditMinimumPayment(nextCurrentBalance),
            last_payment_at: null,
            updated_at: nowIso,
          })
          .eq("account_id", account.account_id);

        if (updateCreditError) {
          return NextResponse.json(
            { error: updateCreditError.message || "Failed to process ATM cash advance." },
            { status: 500 }
          );
        }

        const { data: feeTransactionRows, error: feeTransactionError } = await supabaseAdmin
          .from("transactions")
          .insert({
            reference_number: `ATM-FEE-${Date.now()}`,
            source_account_id: account.account_id,
            destination_account_id: null,
            amount: feeAmount,
            transaction_type: "fee",
            status: "completed",
            description: `ATM cash advance fee at ${simulation.atm_name}`,
            executed_at: nowIso,
          })
          .select(
            "transaction_id, source_account_id, reference_number, amount, transaction_type, description, executed_at, status"
          );

        if (feeTransactionError) {
          return NextResponse.json(
            { error: feeTransactionError.message || "ATM cash advance completed but fee history failed." },
            { status: 500 }
          );
        }

        await recordBankIncomeTransactions(feeTransactionRows ?? []);
      } else {
        const currentBalance = Number(account.balance || 0);

        if (amount > currentBalance) {
          return failPendingAtmSimulation({
            supabase: supabaseAdmin,
            simulationId: simulation.atm_simulation_id,
            transactionId: simulation.transaction_id,
            action,
            atmName: simulation.atm_name,
            atmLocation: simulation.atm_location,
            reason: "Insufficient funds. Withdrawal amount exceeds current balance.",
          });
        }

        if (isSavingsAccount(account.account_type)) {
          const savingsMonthlyActivity = await getOrCreateSavingsMonthlyActivity(
            supabaseAdmin,
            account.account_id,
            currentBalance
          );
          const remainingAllowance =
            getRemainingSavingsWithdrawalAllowance(savingsMonthlyActivity);

          if (amount > remainingAllowance) {
            return failPendingAtmSimulation({
              supabase: supabaseAdmin,
              simulationId: simulation.atm_simulation_id,
              transactionId: simulation.transaction_id,
              action,
              atmName: simulation.atm_name,
              atmLocation: simulation.atm_location,
              reason: `Savings accounts can only withdraw up to 10% of the monthly starting balance. Remaining allowance: $${remainingAllowance.toFixed(
                2
              )}.`,
            });
          }

          const { error: activityError } = await supabaseAdmin
            .from("savings_monthly_activity")
            .update({
              withdrawn_amount:
                roundCurrency(
                  Number(savingsMonthlyActivity.withdrawn_amount || 0) + amount
                ),
              updated_at: nowIso,
            })
            .eq("account_id", account.account_id)
            .eq("month_key", savingsMonthlyActivity.month_key);

          if (activityError) {
            return NextResponse.json(
              { error: activityError.message || "Failed to track savings ATM withdrawal." },
              { status: 500 }
            );
          }
        }

        const nextBalance = roundCurrency(currentBalance - amount);

        const { error: updateAccountError } = await supabaseAdmin
          .from("accounts")
          .update({
            balance: nextBalance,
            updated_at: nowIso,
          })
          .eq("account_id", account.account_id);

        if (updateAccountError) {
          return NextResponse.json(
            { error: updateAccountError.message || "Failed to update account balance." },
            { status: 500 }
          );
        }
      }
    }

    const { data: updatedTransaction, error: updateTransactionError } = await supabaseAdmin
      .from("transactions")
      .update({
        status: "completed",
        description: completedDescription,
        executed_at: nowIso,
      })
      .eq("status", "pending")
      .eq("transaction_id", simulation.transaction_id)
      .select("transaction_id")
      .maybeSingle();

    if (updateTransactionError || !updatedTransaction) {
      return NextResponse.json(
        {
          error:
            updateTransactionError?.message ||
            "Balance updated but the ATM transaction record could not be completed.",
        },
        { status: 500 }
      );
    }

    const { data: updatedSimulation, error: updateSimulationError } = await supabaseAdmin
      .from("atm_simulations")
      .update({
        status: "completed",
        completed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("status", "pending")
      .eq("atm_simulation_id", simulation.atm_simulation_id)
      .select("atm_simulation_id")
      .maybeSingle();

    if (updateSimulationError || !updatedSimulation) {
      return NextResponse.json(
        {
          error:
            updateSimulationError?.message ||
            "ATM transaction completed but the ATM session could not be marked complete.",
        },
        { status: 500 }
      );
    }

    revalidatePath("/customer/dashboard");
    revalidatePath("/customer/accounts");
    revalidatePath("/customer/transactions");
    revalidatePath("/customer/atm");
    revalidatePath("/customer/withdraw");

    return NextResponse.json({
      success: true,
      message:
        action === "withdraw"
          ? `${getAccountTypeLabel(account.account_type)} ATM withdrawal completed successfully.`
          : `${getAccountTypeLabel(account.account_type)} ATM deposit completed successfully.`,
      simulation: {
        ...simulation,
        status: "completed",
        completed_at: nowIso,
        account_name: account.account_name,
        account_type: account.account_type,
        account_mask: account.account_number?.slice(-4) || "",
        currency: account.currency ?? "USD",
      },
    });
  } catch (error) {
    console.error("ATM completion route error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
