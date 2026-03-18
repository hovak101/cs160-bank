import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// cancels a bill payment schedule
export async function DELETE(request, { params }) {
  const supabase = await createClient();

  let { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  let scheduleId = params.scheduleId;

  // set the status to cancelled in the database
  let { error: updateError } = await supabase
    .from("bill_schedules")
    .update({ status: "cancelled" })
    .eq("schedule_id", scheduleId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
