import { NextResponse } from "next/server";
import { PlaidApiError } from "@/lib/plaid/server";
import { syncPlaidBalancesForItem } from "@/lib/plaid/sync";

export const dynamic = "force-dynamic";

type PlaidWebhookPayload = {
  item_id?: string | null;
  webhook_code?: string | null;
  webhook_type?: string | null;
};

const BALANCE_SYNC_WEBHOOK_CODES = new Set([
  "SYNC_UPDATES_AVAILABLE",
  "DEFAULT_UPDATE",
]);

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PlaidWebhookPayload;
    const webhookCode = String(payload.webhook_code || "").trim().toUpperCase();
    const plaidItemId = String(payload.item_id || "").trim();

    if (!plaidItemId) {
      return NextResponse.json(
        { received: false, error: "Plaid item_id is required." },
        { status: 400 }
      );
    }

    if (!BALANCE_SYNC_WEBHOOK_CODES.has(webhookCode)) {
      return NextResponse.json({
        received: true,
        ignored: true,
        webhook_code: webhookCode || null,
        webhook_type: String(payload.webhook_type || "").trim() || null,
      });
    }

    const result = await syncPlaidBalancesForItem(plaidItemId);

    return NextResponse.json({
      received: true,
      synced_accounts: result.syncedCount,
      webhook_code: webhookCode,
    });
  } catch (error) {
    console.error("plaid webhook error:", error);

    if (error instanceof PlaidApiError) {
      return NextResponse.json(
        {
          received: false,
          error: error.message,
          code: error.code,
          request_id: error.requestId,
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { received: false, error: "Failed to process Plaid webhook." },
      { status: 500 }
    );
  }
}
