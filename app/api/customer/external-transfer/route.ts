import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  getOrCreateSavingsMonthlyActivity,
  getRemainingSavingsWithdrawalAllowance,
} from "@/lib/banking/server";
import {
  isDepositEligible,
  isSavingsAccount,
  roundCurrency,
} from "@/lib/banking/rules";
import {
  PlaidApiError,
  createPlaidTransfer,
  createPlaidTransferAuthorization,
  isSandboxPlaid,
} from "@/lib/plaid/server";
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
    const amountValue = roundCurrency(Number(formData.get("amount") || 0));

    if (direction !== "inbound" && direction !== "outbound") {
      return NextResponse.json(
        { error: "Transfer direction is required." },
        { status: 400 }
      );
    }

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

    if (!amountValue || amountValue <= 0) {
      return NextResponse.json(
        { error: "Enter a valid transfer amount." },
        { status: 400 }
      );
    }

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
        "linked_account_id, plaid_account_id, encrypted_access_token, access_token_iv, access_token_auth_tag, institution_name, plaid_account_name, plaid_account_mask, status"
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
          supabase,
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

    if (isSandboxPlaid()) {
      // In Plaid Sandbox, a Link-connected external account does not expose a
      // reliable writable balance surface for keeping Transfer authorization and
      // Plaid Ledger in sync with our demo bank balances. For a stable demo,
      // mirror the selected bank account balance as the external account's
      // available balance for outbound transfers and simulate success entirely
      // within the app. Inbound transfers stay effectively unlimited so demo
      // deposits are not blocked by Plaid sandbox balance constraints.
      const mirroredExternalBalance = currentBalance;

      if (direction === "outbound" && amountValue > mirroredExternalBalance) {
        return NextResponse.json(
          {
            error: `Sandbox demo external balance mirrors your selected bank account and currently has $${mirroredExternalBalance.toFixed(
              2
            )}.`,
          },
          { status: 400 }
        );
      }

      return finalizeExternalTransfer({
        supabase,
        accountId: account.account_id,
        currentBalance,
        amountValue,
        direction,
        transactionDescription: transferDescription,
        savingsMonthlyActivity,
        linkedAccountId,
        customerId: customer.customer_id,
      });
    }

    const plaidAccessToken = decryptText({
      ciphertext: String(linkedAccount.encrypted_access_token || ""),
      iv: String(linkedAccount.access_token_iv || ""),
      authTag: String(linkedAccount.access_token_auth_tag || ""),
    });

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
      supabase,
      accountId: account.account_id,
      currentBalance,
      amountValue,
      direction,
      transactionDescription: transferDescription,
      savingsMonthlyActivity,
      linkedAccountId,
      customerId: customer.customer_id,
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
  supabase: Awaited<ReturnType<typeof createClient>>;
  accountId: string;
  currentBalance: number;
  amountValue: number;
  direction: Direction;
  transactionDescription: string;
  savingsMonthlyActivity:
    | Awaited<ReturnType<typeof getOrCreateSavingsMonthlyActivity>>
    | null;
  linkedAccountId?: string;
  customerId?: string;
}) {
  const nowIso = new Date().toISOString();
  const nextBalance =
    params.direction === "inbound"
      ? roundCurrency(params.currentBalance + params.amountValue)
      : roundCurrency(params.currentBalance - params.amountValue);

  if (params.linkedAccountId && params.customerId) {
    await supabaseAdmin
      .from("plaid_linked_accounts")
      .update({
        last_verified_at: nowIso,
        updated_at: nowIso,
      })
      .eq("linked_account_id", params.linkedAccountId)
      .eq("customer_id", params.customerId);
  }

  const { error: updateAccountError } = await params.supabase
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
    const { error: activityError } = await params.supabase
      .from("savings_monthly_activity")
      .update({
        withdrawn_amount:
          Number(params.savingsMonthlyActivity.withdrawn_amount || 0) +
          params.amountValue,
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

  const { error: transactionError } = await params.supabase.from("transactions").insert({
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

  return NextResponse.json({
    success: true,
    message:
      params.direction === "inbound"
        ? "External transfer completed and funds were added to your account."
        : "External transfer completed and funds were sent to your linked bank.",
  });
}
