import { NextResponse } from "next/server";
import { encryptText } from "@/lib/security/encryption";
import {
  exchangePlaidPublicToken,
  getPlaidAccounts,
  PlaidApiError,
  updatePlaidItemWebhook,
} from "@/lib/plaid/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const customer = await getAuthenticatedCustomer();

    if ("error" in customer) {
      return customer.error;
    }

    const { data, error } = await supabaseAdmin
      .from("plaid_linked_accounts")
      .select(
        "linked_account_id, institution_name, plaid_account_name, plaid_account_mask, plaid_account_subtype, status, created_at, available_balance, current_balance, balance_synced_at"
      )
      .eq("customer_id", customer.customerId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to load linked accounts." },
        { status: 500 }
      );
    }

    const accounts = (data ?? []).map((row: Record<string, unknown>) => ({
      linked_account_id: String(row.linked_account_id || ""),
      institution_name: String(row.institution_name || "External bank"),
      plaid_account_name: String(row.plaid_account_name || "Linked account"),
      plaid_account_mask: String(row.plaid_account_mask || ""),
      plaid_account_subtype: String(row.plaid_account_subtype || ""),
      status: String(row.status || "active"),
      created_at: String(row.created_at || ""),
      available_balance:
        typeof row.available_balance === "number" ? row.available_balance : null,
      current_balance:
        typeof row.current_balance === "number" ? row.current_balance : null,
      balance_synced_at: row.balance_synced_at
        ? String(row.balance_synced_at)
        : null,
    }));

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("plaid linked accounts get error:", error);
    return NextResponse.json(
      { error: "Failed to load linked Plaid accounts." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const customer = await getAuthenticatedCustomer();

    if ("error" in customer) {
      return customer.error;
    }

    const body = await request.json();
    const publicToken = String(body.public_token || "").trim();
    const plaidAccountId = String(body.plaid_account_id || "").trim();
    const fallbackInstitutionName = String(body.institution_name || "").trim();

    if (!publicToken || !plaidAccountId) {
      return NextResponse.json(
        { error: "Plaid public token and account selection are required." },
        { status: 400 }
      );
    }

    const exchanged = await exchangePlaidPublicToken(publicToken);
    const plaidAccounts = await getPlaidAccounts(exchanged.access_token);
    const matchedAccount = plaidAccounts.accounts?.find(
      (account) => account.account_id === plaidAccountId
    );

    if (!matchedAccount) {
      return NextResponse.json(
        { error: "The selected Plaid account could not be verified." },
        { status: 404 }
      );
    }

    if (matchedAccount.type !== "depository") {
      return NextResponse.json(
        { error: "Only checking or savings accounts can be linked for transfers." },
        { status: 400 }
      );
    }

    const subtype = String(matchedAccount.subtype || "").toLowerCase();
    if (subtype !== "checking" && subtype !== "savings") {
      return NextResponse.json(
        { error: "Only checking or savings accounts can be linked for transfers." },
        { status: 400 }
      );
    }

    const encrypted = encryptText(exchanged.access_token);
    const nowIso = new Date().toISOString();
    const webhookUrl = resolvePlaidWebhookUrl();
    const availableBalance =
      typeof matchedAccount.balances?.available === "number"
        ? matchedAccount.balances.available
        : typeof matchedAccount.balances?.current === "number"
          ? matchedAccount.balances.current
          : null;
    const currentBalance =
      typeof matchedAccount.balances?.current === "number"
        ? matchedAccount.balances.current
        : null;

    if (webhookUrl) {
      await updatePlaidItemWebhook(exchanged.access_token, webhookUrl);
    }

    const payload = {
      customer_id: customer.customerId,
      plaid_item_id: exchanged.item_id,
      plaid_account_id: matchedAccount.account_id,
      encrypted_access_token: encrypted.ciphertext,
      access_token_iv: encrypted.iv,
      access_token_auth_tag: encrypted.authTag,
      institution_name: fallbackInstitutionName || "Plaid linked bank",
      plaid_account_name:
        matchedAccount.name ||
        matchedAccount.official_name ||
        "Linked account",
      plaid_account_official_name: matchedAccount.official_name || null,
      plaid_account_mask: matchedAccount.mask || null,
      plaid_account_type: matchedAccount.type || null,
      plaid_account_subtype: matchedAccount.subtype || null,
      available_balance: availableBalance,
      current_balance: currentBalance,
      balance_synced_at: nowIso,
      status: "active",
      last_verified_at: nowIso,
      updated_at: nowIso,
    };

    const { data, error } = await supabaseAdmin
      .from("plaid_linked_accounts")
      .upsert(payload, {
        onConflict: "customer_id,plaid_account_id",
      })
      .select(
        "linked_account_id, institution_name, plaid_account_name, plaid_account_mask, plaid_account_subtype, status, created_at, available_balance, current_balance, balance_synced_at"
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to save linked Plaid account." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      account: {
        linked_account_id: String(data.linked_account_id || ""),
        institution_name: String(data.institution_name || "External bank"),
        plaid_account_name: String(data.plaid_account_name || "Linked account"),
        plaid_account_mask: String(data.plaid_account_mask || ""),
        plaid_account_subtype: String(data.plaid_account_subtype || ""),
        status: String(data.status || "active"),
        created_at: String(data.created_at || ""),
        available_balance:
          typeof data.available_balance === "number"
            ? data.available_balance
            : null,
        current_balance:
          typeof data.current_balance === "number" ? data.current_balance : null,
        balance_synced_at: data.balance_synced_at
          ? String(data.balance_synced_at)
          : null,
      },
      message: "External bank linked and saved successfully.",
    });
  } catch (error) {
    console.error("plaid linked accounts post error:", error);

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
      { error: "Failed to link external bank account." },
      { status: 500 }
    );
  }
}

async function getAuthenticatedCustomer() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (userData?.role !== "customer") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (customerError || !customer) {
    return {
      error: NextResponse.json(
        { error: "Customer profile not found." },
        { status: 404 }
      ),
    };
  }

  return {
    customerId: customer.customer_id,
  };
}

function resolvePlaidWebhookUrl() {
  const explicitUrl = process.env.PLAID_WEBHOOK_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl}/public/plaid-webhook`;
  }

  return null;
}
