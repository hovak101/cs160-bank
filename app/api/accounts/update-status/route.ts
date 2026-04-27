import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { supabaseAdmin } from "@/lib/supabase/admin";

type UpdateAccountStatusBody = {
  account_id?: string;
  status?: string;
};

const ALLOWED_STATUSES = new Set(["active", "frozen", "closed"]);

function mapAccountStatusToCardStatus(status: string) {
  return status === "active" ? "active" : "locked";
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(["admin", "manager"]);
    if (!auth.ok) return auth.response;
    const body = (await req.json()) as UpdateAccountStatusBody;

    const accountId = body.account_id?.trim();
    const status = body.status?.trim().toLowerCase();

    if (!accountId) {
      return NextResponse.json(
        { error: "account_id is required." },
        { status: 400 }
      );
    }

    if (!status || !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "Invalid status. Only active, frozen, or closed is allowed." },
        { status: 400 }
      );
    }

    const { data: account, error: fetchError } = await supabaseAdmin
      .from("accounts")
      .select("account_id, account_type, status, balance")
      .eq("account_id", accountId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message || "Failed to fetch account." },
        { status: 500 }
      );
    }

    if (!account) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 }
      );
    }

    const currentStatus = String(account.status || "").toLowerCase();

    if (currentStatus === "closed") {
      return NextResponse.json(
        { error: "Closed accounts cannot be updated." },
        { status: 400 }
      );
    }

    if (status === "closed") {
      if (account.account_type === "credit") {
          const { data: creditAccount } = await supabaseAdmin
          .from("credit_accounts")
          .select("current_balance")
          .eq("account_id", accountId)
          .maybeSingle();

        if (Number(creditAccount?.current_balance || 0) > 0) {
          return NextResponse.json(
            { error: "Credit card balance must be paid off before closing the account." },
            { status: 400 }
          );
        }
      } else if (Number(account.balance || 0) > 0) {
        return NextResponse.json(
          { error: "Account balance must be 0 before closing the account." },
          { status: 400 }
        );
      }
    }

    const updatedAt = new Date().toISOString();

    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from("accounts")
      .update({
        status: status as "active" | "frozen" | "closed",
        updated_at: updatedAt,
      })
      .eq("account_id", accountId)
      .select("account_id, status, updated_at");

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update account status." },
        { status: 500 }
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No rows were updated. This is usually caused by RLS policy or insufficient permissions.",
        },
        { status: 403 }
      );
    }

    if (account.account_type === "credit") {
      const { error: creditCardStatusError } = await supabaseAdmin
        .from("credit_cards")
        .update({
          card_status: mapAccountStatusToCardStatus(status),
          updated_at: updatedAt,
        })
        .eq("account_id", accountId);

      if (creditCardStatusError) {
        return NextResponse.json(
          {
            error:
              creditCardStatusError.message ||
              "Account status was updated, but credit card status sync failed.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      message: `Account status updated to ${status}.`,
      data: updatedRows[0],
    });
  } catch (error) {
    console.error("Update account status API error:", error);
    return NextResponse.json(
      { error: "Failed to update account status." },
      { status: 500 }
    );
  }
}
