import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// cancels a bill payment schedule
export async function DELETE(request: Request, { params }: { params: Promise<{ scheduleId: string }> }) {
  const supabase = await createClient();

  let { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("user_id", user.id)
    .single();
  
  if (userData?.role !== "customer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let { scheduleId } = await params;

  // Verify ownership before cancelling + fetch schedule + confirm source account belongs to this customer
  const { data: customerData } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .single();

  if (!customerData) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  const { data: schedule } = await supabaseAdmin
    .from("bill_schedules" as any)
    .select("account_id")
    .eq("schedule_id", scheduleId)
    .single();

  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
  }

  // Confirm the schedule's source account belongs to this customer
  const { data: ownerCheck } = await supabase
    .from("accounts")
    .select("account_id")
    .eq("account_id", (schedule as any).account_id)
    .eq("customer_id", customerData.customer_id)
    .single();

  if (!ownerCheck) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // set the status to cancelled in the database
  const { error: updateError } = await supabaseAdmin
    .from("bill_schedules" as any)
    .update({ status: "cancelled" })
    .eq("schedule_id", scheduleId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
