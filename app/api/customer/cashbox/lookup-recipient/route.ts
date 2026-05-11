import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
    const phone_number = String(body.phone_number ?? "").replace(/\D/g, "");

    if (!phone_number) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    const { data: senderCustomer, error: senderError } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .single();

    if (senderError || !senderCustomer) {
      return NextResponse.json(
        { error: "Sender profile not found." },
        { status: 404 }
      );
    }

    const { data: receiverCustomer, error: receiverError } = await supabaseAdmin
      .from("customers")
      .select("customer_id, first_name, last_name, phone_number")
      .eq("phone_number", phone_number)
      .single();

    if (receiverError || !receiverCustomer) {
      return NextResponse.json(
        { error: "Receiver not found by phone number." },
        { status: 404 }
      );
    }

    if (receiverCustomer.customer_id === senderCustomer.customer_id) {
      return NextResponse.json(
        { error: "You cannot send money to yourself." },
        { status: 400 }
      );
    }

    const receiver_name =
      [receiverCustomer.first_name, receiverCustomer.last_name]
        .filter(Boolean)
        .join(" ") || "Unknown User";

    return NextResponse.json({
      customer_id: receiverCustomer.customer_id,
      receiver_name,
      phone_number: receiverCustomer.phone_number,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
