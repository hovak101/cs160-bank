import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPlaidLinkToken, PlaidApiError } from "@/lib/plaid/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      undefined;

    const plaid = await createPlaidLinkToken({
      clientUserId: user.id,
      legalName,
    });

    return NextResponse.json({
      link_token: plaid.link_token,
      expiration: plaid.expiration,
    });
  } catch (error) {
    console.error("plaid link token error:", error);

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
      { error: "Failed to create Plaid link token." },
      { status: 500 }
    );
  }
}
