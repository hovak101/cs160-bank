import { roundCurrency } from "@/lib/banking/rules";
import { decryptText } from "@/lib/security/encryption";
import type { Tables } from "@/lib/supabase/database.types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPlaidAccountBalances } from "./server";

type PlaidLinkedAccountRow = Pick<
  Tables<"plaid_linked_accounts">,
  | "access_token_auth_tag"
  | "access_token_iv"
  | "available_balance"
  | "current_balance"
  | "customer_id"
  | "encrypted_access_token"
  | "last_verified_at"
  | "linked_account_id"
  | "plaid_account_id"
  | "plaid_item_id"
  | "status"
>;

type PlaidBalanceSnapshot = {
  available_balance: number | null;
  current_balance: number | null;
};

function normalizePlaidBalance(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return roundCurrency(value);
}

function toBalanceSnapshot(row: {
  available_balance: number | null;
  current_balance: number | null;
}): PlaidBalanceSnapshot {
  return {
    available_balance: normalizePlaidBalance(row.available_balance),
    current_balance: normalizePlaidBalance(row.current_balance),
  };
}

export function getPreferredPlaidBalance(row: {
  available_balance: number | null;
  current_balance: number | null;
}) {
  const snapshot = toBalanceSnapshot(row);
  return snapshot.available_balance ?? snapshot.current_balance;
}

export async function syncPlaidBalancesForItem(plaidItemId: string) {
  const { data: linkedAccounts, error } = await supabaseAdmin
    .from("plaid_linked_accounts")
    .select(
      "linked_account_id, plaid_account_id, plaid_item_id, encrypted_access_token, access_token_iv, access_token_auth_tag, available_balance, current_balance, customer_id, last_verified_at, status"
    )
    .eq("plaid_item_id", plaidItemId);

  if (error) {
    throw new Error(error.message || "Failed to load Plaid linked accounts.");
  }

  const accounts = (linkedAccounts ?? []) as PlaidLinkedAccountRow[];
  if (accounts.length === 0) {
    return {
      syncedCount: 0,
      balancesByAccountId: new Map<string, PlaidBalanceSnapshot>(),
    };
  }

  const accessToken = decryptText({
    ciphertext: accounts[0].encrypted_access_token,
    iv: accounts[0].access_token_iv,
    authTag: accounts[0].access_token_auth_tag,
  });

  const plaidResponse = await getPlaidAccountBalances(accessToken);
  const nowIso = new Date().toISOString();
  const balancesByAccountId = new Map<string, PlaidBalanceSnapshot>();

  for (const plaidAccount of plaidResponse.accounts ?? []) {
    balancesByAccountId.set(plaidAccount.account_id, {
      available_balance: normalizePlaidBalance(
        plaidAccount.balances?.available ?? null
      ),
      current_balance: normalizePlaidBalance(
        plaidAccount.balances?.current ?? null
      ),
    });
  }

  await Promise.all(
    accounts.map(async (linkedAccount) => {
      const snapshot =
        balancesByAccountId.get(linkedAccount.plaid_account_id) ?? {
          available_balance: null,
          current_balance: null,
        };

      const { error: updateError } = await supabaseAdmin
        .from("plaid_linked_accounts")
        .update({
          available_balance: snapshot.available_balance,
          current_balance: snapshot.current_balance,
          balance_synced_at: nowIso,
          last_verified_at: nowIso,
          updated_at: nowIso,
        })
        .eq("linked_account_id", linkedAccount.linked_account_id);

      if (updateError) {
        throw new Error(
          updateError.message || "Failed to update stored Plaid balances."
        );
      }
    })
  );

  return {
    syncedCount: accounts.length,
    balancesByAccountId,
  };
}
