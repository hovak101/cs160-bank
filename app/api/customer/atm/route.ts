import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildAtmInstruction,
  buildAtmTransactionDescription,
  formatAtmLocation,
  generateAtmReferenceNumber,
  generateAtmVerificationCode,
  getAtmAccountRestrictionMessage,
  getAtmAccountStatusErrorMessage,
  getDemoAtmLocation,
  type AtmAction,
} from "@/lib/atm/demo";
import {
  computeCreditCashAdvanceFee,
  getAccountTypeLabel,
  isCreditAccount,
  isSavingsAccount,
} from "@/lib/banking/rules";
import {
  getOrCreateSavingsMonthlyActivity,
  getRemainingSavingsWithdrawalAllowance,
} from "@/lib/banking/server";
import { verifySecurityCode } from "@/lib/banking/security-code.server";
import {
  isValidSecurityCodeFormat,
  normalizeSecurityCode,
} from "@/lib/banking/security-code";
import {
  LARGE_DEPOSIT_SUPPORT_MESSAGE,
  MANUAL_DEPOSIT_LIMIT_USD,
  parseCurrencyInput,
} from "@/lib/banking/amount";

export const dynamic = "force-dynamic";

type RequestBody = {
  account_id?: string;
  action?: string;
  amount?: number | string;
  atm_id?: string;
  atm_name?: string;
  atm_location?: string;
  security_code?: string;
};

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

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (userData?.role !== "customer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as RequestBody;
    const accountId = String(body.account_id ?? "").trim();
    const atmId = String(body.atm_id ?? "").trim();
    const providedAtmName = String(body.atm_name ?? "").trim();
    const providedAtmLocation = String(body.atm_location ?? "").trim();
    const action = String(body.action ?? "").trim().toLowerCase() as AtmAction;
    if (!/^\d+(\.\d{1,2})?$/.test(String(body.amount ?? ""))) {
      return NextResponse.json({ error: "Amount must have at most 2 decimal places." }, { status: 400 });
    }
    const securityCode = normalizeSecurityCode(body.security_code);

    if (!atmId) {
      return NextResponse.json(
        { error: "Please choose an ATM location." },
        { status: 400 }
      );
    }

    if (action !== "withdraw" && action !== "deposit") {
      return NextResponse.json(
        { error: "Please choose whether this is an ATM withdrawal or deposit." },
        { status: 400 }
      );
    }

    const parsedAmount = parseCurrencyInput(body.amount, {
      fieldLabel: "Amount",
      max: action === "deposit" ? MANUAL_DEPOSIT_LIMIT_USD : undefined,
      maxErrorMessage:
        action === "deposit" ? LARGE_DEPOSIT_SUPPORT_MESSAGE : undefined,
    });

    if (!accountId) {
      return NextResponse.json(
        { error: "Please choose one of your accounts." },
        { status: 400 }
      );
    }

    if (!parsedAmount.ok) {
      return NextResponse.json(
        { error: parsedAmount.error },
        { status: 400 }
      );
    }

    const amount = parsedAmount.value;

    let atmName = providedAtmName;
    let atmLocation = providedAtmLocation;
    const demoAtm = getDemoAtmLocation(atmId);

    if (!atmName || !atmLocation) {
      if (demoAtm) {
        atmName = demoAtm.name;
        atmLocation = formatAtmLocation(demoAtm);
      }
    }

    if (!atmName || !atmLocation) {
      return NextResponse.json(
        { error: "Selected ATM location was not found." },
        { status: 404 }
      );
    }

    const atm = {
      atm_id: atmId,
      name: atmName,
      location: atmLocation,
    };

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
      .select(
        "account_id, customer_id, account_name, account_number, account_type, balance, currency, status"
      )
      .eq("account_id", accountId)
      .eq("customer_id", customer.customer_id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "The selected account could not be found." },
        { status: 404 }
      );
    }

    const statusError = getAtmAccountStatusErrorMessage(account.status);
    if (statusError) {
      return NextResponse.json({ error: statusError }, { status: 400 });
    }

    const accountRestrictionMessage = getAtmAccountRestrictionMessage(
      account.account_type,
      action
    );
    if (accountRestrictionMessage) {
      return NextResponse.json(
        { error: accountRestrictionMessage },
        { status: 400 }
      );
    }

    let feeAmount = 0;

    if (action === "withdraw") {
      if (isCreditAccount(account.account_type)) {
        if (!isValidSecurityCodeFormat(securityCode)) {
          return NextResponse.json(
            {
              error:
                "A valid 3-digit security code is required before starting a credit cash advance.",
            },
            { status: 400 }
          );
        }

        const [{ data: creditAccount, error: creditAccountError }, { data: creditCard }] =
          await Promise.all([
            supabase
              .from("credit_accounts")
              .select(
                "account_id, available_credit, current_balance, cash_advance_limit, cash_advance_balance"
              )
              .eq("account_id", account.account_id)
              .single(),
            supabase
              .from("credit_cards")
              .select("card_status, security_code_hash")
              .eq("account_id", account.account_id)
              .maybeSingle(),
          ]);

        if (creditAccountError || !creditAccount) {
          return NextResponse.json(
            { error: "Credit account details not found." },
            { status: 404 }
          );
        }

        if (!creditCard) {
          return NextResponse.json(
            { error: "Credit card record not found." },
            { status: 404 }
          );
        }

        if ((creditCard.card_status ?? "").toLowerCase() !== "active") {
          return NextResponse.json(
            { error: "Only active credit cards can be used for ATM cash advances." },
            { status: 400 }
          );
        }

        if (!verifySecurityCode(securityCode, creditCard.security_code_hash)) {
          return NextResponse.json(
            { error: "Security code does not match this card." },
            { status: 400 }
          );
        }

        feeAmount = computeCreditCashAdvanceFee(amount);
        const availableCredit = Number(creditAccount.available_credit || 0);
        const cashAdvanceRemaining = Math.max(
          Number(creditAccount.cash_advance_limit || 0) -
            Number(creditAccount.cash_advance_balance || 0),
          0
        );

        if (amount > cashAdvanceRemaining) {
          return NextResponse.json(
            {
              error: `Cash advance limit exceeded. You can withdraw up to $${cashAdvanceRemaining.toFixed(
                2
              )} right now.`,
            },
            { status: 400 }
          );
        }

        if (amount + feeAmount > availableCredit) {
          return NextResponse.json(
            {
              error:
                "Insufficient available credit to cover the ATM cash advance and fee.",
            },
            { status: 400 }
          );
        }
      } else {
        const currentBalance = Number(account.balance || 0);

        if (amount > currentBalance) {
          return NextResponse.json(
            { error: "Insufficient funds. Withdrawal amount exceeds current balance." },
            { status: 400 }
          );
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
            return NextResponse.json(
              {
                error: `Savings accounts can only withdraw up to 10% of the monthly starting balance. Remaining allowance: $${remainingAllowance.toFixed(
                  2
                )}.`,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    const nowIso = new Date().toISOString();
    const verificationCode =
      action === "withdraw" ? generateAtmVerificationCode() : null;

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("transactions")
      .insert({
        reference_number: generateAtmReferenceNumber(action),
        source_account_id: action === "withdraw" ? account.account_id : null,
        destination_account_id: action === "deposit" ? account.account_id : null,
        amount,
        transaction_type: action === "withdraw" ? "atm_withdrawal" : "atm_deposit",
        status: "pending",
        description: buildAtmTransactionDescription(action, atm, "pending"),
        executed_at: nowIso,
      })
      .select(
        "transaction_id, reference_number, amount, transaction_type, status, description, executed_at"
      )
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: transactionError?.message || "Failed to create the pending ATM transaction." },
        { status: 500 }
      );
    }

    const { data: simulation, error: simulationError } = await supabaseAdmin
      .from("atm_simulations")
      .insert({
        customer_id: customer.customer_id,
        account_id: account.account_id,
        transaction_id: transaction.transaction_id,
        atm_id: atm.atm_id,
        atm_name: atm.name,
        atm_location: atm.location,
        action,
        amount,
        verification_code: verificationCode,
        status: "pending",
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select(
        "atm_simulation_id, transaction_id, account_id, atm_id, atm_name, atm_location, action, amount, verification_code, status, created_at, completed_at"
      )
      .single();

    if (simulationError || !simulation) {
      return NextResponse.json(
        { error: simulationError?.message || "Failed to create the ATM simulation." },
        { status: 500 }
      );
    }

    revalidatePath("/customer/atm");
    revalidatePath("/customer/transactions");
    revalidatePath("/customer/dashboard");

    return NextResponse.json({
      success: true,
      message:
        action === "withdraw"
          ? `${getAccountTypeLabel(account.account_type)} ATM withdrawal is ready.`
          : `${getAccountTypeLabel(account.account_type)} ATM deposit is ready.`,
      simulation: {
        ...simulation,
        account_name: account.account_name,
        account_type: account.account_type,
        account_mask: account.account_number?.slice(-4) || "",
        currency: account.currency ?? "USD",
        instruction: buildAtmInstruction(action, atm),
        fee_amount: feeAmount,
      },
    });
  } catch (error) {
    console.error("ATM start route error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
