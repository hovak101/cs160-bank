import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  getOrCreateSavingsMonthlyActivity,
  getRemainingSavingsWithdrawalAllowance,
} from "@/lib/banking/server";
import {
  MAX_ACCOUNT_BALANCE,
  LARGE_DEPOSIT_SUPPORT_MESSAGE,
  MANUAL_DEPOSIT_LIMIT_USD,
  parseCurrencyInput,
  willExceedMaxAccountBalance,
} from "@/lib/banking/amount";
import {
  isDepositEligible,
  isSavingsAccount,
  roundCurrency,
} from "@/lib/banking/rules";
import {
  PlaidApiError,
  createPlaidTransfer,
  createPlaidTransferAuthorization,
  firePlaidSandboxItemWebhook,
  isSandboxPlaid,
} from "@/lib/plaid/server";
import {
  getPreferredPlaidBalance,
  syncPlaidBalancesForItem,
} from "@/lib/plaid/sync";
import { decryptText } from "@/lib/security/encryption";
import { validateMoneyAmount } from "@/lib/banking/validation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Direction = "inbound" | "outbound";

export async function POST(req: Request) {
  const formData = await req.formData();
  const linkedAccountId = String(formData.get("linked_account_id") || "");

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const direction = String(formData.get("direction") || "") as Direction;
    const internalAccountId = String(formData.get("internal_account_id") || "");
    if (direction !== "inbound" && direction !== "outbound") {
      return NextResponse.json(
        { error: "Transfer direction is required." },
        { status: 400 }
      );
    }

    const parsedAmount = parseCurrencyInput(formData.get("amount"), {
      fieldLabel: "Transfer amount",
      max: direction === "inbound" ? MANUAL_DEPOSIT_LIMIT_USD : undefined,
      maxErrorMessage:
        direction === "inbound" ? LARGE_DEPOSIT_SUPPORT_MESSAGE : undefined,
    });

    if (!internalAccountId) {
      return NextResponse.json(
        { error: "Select an internal account first." },
        { status: 400 }
      );
    }

    if (!linkedAccountId) {
      return NextResponse.json(
        { error: "Choose a saved external bank account first." },
        { status: 400 }
      );
    }

    if (!parsedAmount.ok) {
      return NextResponse.json({ error: parsedAmount.error }, { status: 400 });
    }

    const amountValue = parsedAmount.value;
    const amountError = validateMoneyAmount(amountValue);
    if (amountError) {
      return NextResponse.json({ error: amountError }, { status: 400 });
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("customer_id, first_name, last_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer profile not found." },
        { status: 404 }
      );
    }

    const legalName =
      [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() ||
      user.email ||
      "";

    if (!legalName) {
      return NextResponse.json(
        { error: "Complete your profile before starting an external transfer." },
        { status: 400 }
      );
    }

    const { data: linkedAccount, error: linkedAccountError } = await supabaseAdmin
      .from("plaid_linked_accounts")
      .select(
        "linked_account_id, plaid_account_id, plaid_item_id, encrypted_access_token, access_token_iv, access_token_auth_tag, institution_name, plaid_account_name, plaid_account_mask, status, available_balance, current_balance"
      )
      .eq("linked_account_id", linkedAccountId)
      .eq("customer_id", customer.customer_id)
      .maybeSingle();

    if (linkedAccountError || !linkedAccount) {
      return NextResponse.json(
        { error: "Saved external account not found." },
        { status: 404 }
      );
    }

    if (String(linkedAccount.status || "").toLowerCase() !== "active") {
      return NextResponse.json(
        { error: "This saved external account must be re-linked before use." },
        { status: 400 }
      );
    }

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("account_id, account_name, account_number, account_type, balance, currency, status")
      .eq("customer_id", customer.customer_id)
      .eq("account_id", internalAccountId)
      .maybeSingle();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "Selected account was not found." },
        { status: 404 }
      );
    }

    if ((account.status || "").toLowerCase() !== "active") {
      return NextResponse.json(
        { error: "Only active checking or savings accounts can be used." },
        { status: 400 }
      );
    }

    if (!isDepositEligible(account.account_type)) {
      return NextResponse.json(
        { error: "External transfers are limited to checking and savings accounts." },
        { status: 400 }
      );
    }

    const currentBalance = roundCurrency(Number(account.balance || 0));

    if (
      direction === "inbound" &&
      willExceedMaxAccountBalance(currentBalance, amountValue)
    ) {
      return NextResponse.json(
        {
          error: `Destination account cannot exceed ${new Intl.NumberFormat(
            "en-US",
            {
              style: "currency",
              currency: "USD",
            }
          ).format(MAX_ACCOUNT_BALANCE)}.`,
        },
        { status: 400 }
      );
    }

    let savingsMonthlyActivity:
      | Awaited<ReturnType<typeof getOrCreateSavingsMonthlyActivity>>
      | null = null;

    if (direction === "outbound") {
      if (amountValue > currentBalance) {
        return NextResponse.json(
          { error: "Insufficient funds for this external transfer." },
          { status: 400 }
        );
      }

      if (isSavingsAccount(account.account_type)) {
        savingsMonthlyActivity = await getOrCreateSavingsMonthlyActivity(
          supabaseAdmin,
          account.account_id,
          currentBalance
        );

        const remainingAllowance =
          getRemainingSavingsWithdrawalAllowance(savingsMonthlyActivity);

        if (amountValue > remainingAllowance) {
          return NextResponse.json(
            {
              error: `Savings transfer exceeds your monthly 10% withdrawal allowance. Remaining allowance: $${remainingAllowance.toFixed(
                2
              )}.`,
            },
            { status: 400 }
          );
        }
      }
    }

    const transferDescription =
      direction === "inbound"
        ? `External transfer from ${formatExternalLabel(
            String(linkedAccount.institution_name || ""),
            String(linkedAccount.plaid_account_name || ""),
            String(linkedAccount.plaid_account_mask || "")
          )}`
        : `External transfer to ${formatExternalLabel(
            String(linkedAccount.institution_name || ""),
            String(linkedAccount.plaid_account_name || ""),
            String(linkedAccount.plaid_account_mask || "")
          )}`;

    const plaidAccessToken = decryptText({
      ciphertext: String(linkedAccount.encrypted_access_token || ""),
      iv: String(linkedAccount.access_token_iv || ""),
      authTag: String(linkedAccount.access_token_auth_tag || ""),
    });

    let externalAvailableBalance = getPreferredPlaidBalance({
      available_balance:
        typeof linkedAccount.available_balance === "number"
          ? linkedAccount.available_balance
          : null,
      current_balance:
        typeof linkedAccount.current_balance === "number"
          ? linkedAccount.current_balance
          : null,
    });

    if (
      direction === "inbound" &&
      externalAvailableBalance === null &&
      linkedAccount.plaid_item_id
    ) {
      const syncedBalances = await syncPlaidBalancesForItem(
        String(linkedAccount.plaid_item_id)
      );

      externalAvailableBalance =
        syncedBalances.balancesByAccountId.get(
          String(linkedAccount.plaid_account_id || "")
        )?.available_balance ??
        syncedBalances.balancesByAccountId.get(
          String(linkedAccount.plaid_account_id || "")
        )?.current_balance ??
        null;
    }

    if (
      direction === "inbound" &&
      typeof externalAvailableBalance === "number" &&
      amountValue > externalAvailableBalance
    ) {
      return NextResponse.json(
        {
          error: `Amount exceeds available external balance (${externalAvailableBalance.toFixed(
            2
          )}).`,
        },
        { status: 400 }
      );
    }

    if (isSandboxPlaid()) {
      return finalizeExternalTransfer({
        accountId: account.account_id,
        currentBalance,
        amountValue,
        direction,
        transactionDescription: transferDescription,
        savingsMonthlyActivity,
        linkedAccountId,
        customerId: customer.customer_id,
        plaidAccessToken,
        linkedAccountSnapshot: {
          available_balance:
            typeof linkedAccount.available_balance === "number"
              ? linkedAccount.available_balance
              : null,
          current_balance:
            typeof linkedAccount.current_balance === "number"
              ? linkedAccount.current_balance
              : null,
        },
      });
    }

    const authorization = await createPlaidTransferAuthorization({
      accessToken: plaidAccessToken,
      accountId: String(linkedAccount.plaid_account_id || ""),
      legalName,
      amount: amountValue.toFixed(2),
      direction,
      idempotencyKey: crypto.randomUUID(),
    });

    const authorizationDecision = authorization.authorization?.decision;
    const authorizationRationale = authorization.authorization?.decision_rationale;
    const authorizationId = authorization.authorization?.id;

    if (authorizationDecision !== "approved" || !authorizationId) {
      const rationale =
        authorizationRationale?.description ||
        authorizationRationale?.code ||
        "Plaid declined the transfer authorization.";

      return NextResponse.json({ error: rationale }, { status: 400 });
    }

    const plaidTransferDescription =
      direction === "inbound" ? "TRANSFER" : "PAYOUT";

    await createPlaidTransfer({
      accessToken: plaidAccessToken,
      accountId: String(linkedAccount.plaid_account_id || ""),
      authorizationId,
      amount: amountValue.toFixed(2),
      description: plaidTransferDescription,
    });

    return finalizeExternalTransfer({
      accountId: account.account_id,
      currentBalance,
      amountValue,
      direction,
      transactionDescription: transferDescription,
      savingsMonthlyActivity,
      linkedAccountId,
      customerId: customer.customer_id,
      plaidAccessToken,
      linkedAccountSnapshot: {
        available_balance:
          typeof linkedAccount.available_balance === "number"
            ? linkedAccount.available_balance
            : null,
        current_balance:
          typeof linkedAccount.current_balance === "number"
            ? linkedAccount.current_balance
            : null,
      },
    });
  } catch (error) {
    console.error("external transfer error:", error);

    if (
      error instanceof PlaidApiError &&
      (error.code === "ITEM_LOGIN_REQUIRED" || error.code === "INVALID_ACCESS_TOKEN") &&
      linkedAccountId
    ) {
      await supabaseAdmin
        .from("plaid_linked_accounts")
        .update({
          status: "disconnected",
          updated_at: new Date().toISOString(),
        })
        .eq("linked_account_id", linkedAccountId);
    }

    if (error instanceof PlaidApiError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          request_id: error.requestId,
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to complete external transfer." },
      { status: 500 }
    );
  }
}

function formatExternalLabel(
  institutionName: string,
  externalAccountName: string,
  accountMask: string
) {
  const base =
    institutionName.trim() || externalAccountName.trim() || "linked account";

  const mask = accountMask.trim();
  return mask ? `${base} ****${mask}` : base;
}

async function finalizeExternalTransfer(params: {
  accountId: string;
  currentBalance: number;
  amountValue: number;
  direction: Direction;
  transactionDescription: string;
  savingsMonthlyActivity:
    | Awaited<ReturnType<typeof getOrCreateSavingsMonthlyActivity>>
    | null;
  linkedAccountId?: string;
  linkedAccountSnapshot?: {
    available_balance: number | null;
    current_balance: number | null;
  };
  plaidAccessToken?: string;
  customerId?: string;
}) {
  const nowIso = new Date().toISOString();
  const nextBalance =
    params.direction === "inbound"
      ? roundCurrency(params.currentBalance + params.amountValue)
      : roundCurrency(params.currentBalance - params.amountValue);

  if (params.linkedAccountId && params.customerId) {
    const plaidBalanceUpdate =
      params.linkedAccountSnapshot
        ? buildUpdatedPlaidBalanceSnapshot(
            params.linkedAccountSnapshot,
            params.direction,
            params.amountValue
          )
        : null;

    await supabaseAdmin
      .from("plaid_linked_accounts")
      .update({
        available_balance: plaidBalanceUpdate?.available_balance,
        current_balance: plaidBalanceUpdate?.current_balance,
        balance_synced_at: plaidBalanceUpdate ? nowIso : undefined,
        last_verified_at: nowIso,
        updated_at: nowIso,
      })
      .eq("linked_account_id", params.linkedAccountId)
      .eq("customer_id", params.customerId);
  }

  const { error: updateAccountError } = await supabaseAdmin
    .from("accounts")
    .update({
      balance: nextBalance,
      updated_at: nowIso,
    })
    .eq("account_id", params.accountId);

  if (updateAccountError) {
    return NextResponse.json(
      { error: updateAccountError.message || "Failed to update account balance." },
      { status: 500 }
    );
  }

  if (params.savingsMonthlyActivity) {
    const { error: activityError } = await supabaseAdmin
      .from("savings_monthly_activity")
      .update({
        withdrawn_amount:
          roundCurrency(
            Number(params.savingsMonthlyActivity.withdrawn_amount || 0) +
              params.amountValue
          ),
        updated_at: nowIso,
      })
      .eq("account_id", params.accountId)
      .eq("month_key", params.savingsMonthlyActivity.month_key);

    if (activityError) {
      return NextResponse.json(
        { error: activityError.message || "Failed to update savings activity." },
        { status: 500 }
      );
    }
  }

  const { error: transactionError } = await supabaseAdmin.from("transactions").insert({
    reference_number: `EXT-${Date.now()}`,
    source_account_id: params.direction === "outbound" ? params.accountId : null,
    destination_account_id: params.direction === "inbound" ? params.accountId : null,
    amount: params.amountValue,
    transaction_type: params.direction === "inbound" ? "deposit" : "withdrawal",
    status: "completed",
    description: params.transactionDescription,
    executed_at: nowIso,
  });

  if (transactionError) {
    return NextResponse.json(
      {
        error:
          transactionError.message ||
          "Transfer completed but transaction history could not be saved.",
      },
      { status: 500 }
    );
  }

  revalidatePath("/customer/dashboard");
  revalidatePath("/customer/accounts");
  revalidatePath("/customer/accounts/[accountId]", "page");
  revalidatePath("/customer/transactions");
  revalidatePath("/customer/transfers");

  if (params.plaidAccessToken && isSandboxPlaid()) {
    try {
      await firePlaidSandboxItemWebhook({
        accessToken: params.plaidAccessToken,
        webhookCode: "DEFAULT_UPDATE",
        webhookType: "TRANSACTIONS",
      });
    } catch (webhookError) {
      console.error("sandbox plaid webhook fire error:", webhookError);
    }
  }

  return NextResponse.json({
    success: true,
    message:
      params.direction === "inbound"
        ? "External transfer completed and funds were added to your account."
        : "External transfer completed and funds were sent to your linked bank.",
  });
}

function buildUpdatedPlaidBalanceSnapshot(
  snapshot: {
    available_balance: number | null;
    current_balance: number | null;
  },
  direction: Direction,
  amountValue: number
) {
  const delta = direction === "inbound" ? -amountValue : amountValue;

  return {
    available_balance:
      typeof snapshot.available_balance === "number"
        ? roundCurrency(snapshot.available_balance + delta)
        : null,
    current_balance:
      typeof snapshot.current_balance === "number"
        ? roundCurrency(snapshot.current_balance + delta)
        : null,
  };
}
