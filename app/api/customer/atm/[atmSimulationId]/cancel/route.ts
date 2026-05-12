import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ atmSimulationId: string }> }
) {
  try {
    const { atmSimulationId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (userData?.role !== "customer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!atmSimulationId) {
      return NextResponse.json(
        { error: "ATM simulation id is required." },
        { status: 400 }
      );
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 }
      );
    }

    const { data: simulation, error: simulationError } = await supabase
      .from("atm_simulations")
      .select(
        "atm_simulation_id, transaction_id, customer_id, atm_name, atm_location, action, status"
      )
      .eq("atm_simulation_id", atmSimulationId)
      .eq("customer_id", customer.customer_id)
      .single();

    if (simulationError || !simulation) {
      return NextResponse.json(
        { error: "Pending ATM action not found." },
        { status: 404 }
      );
    }

    if ((simulation.status ?? "").toLowerCase() !== "pending") {
      return NextResponse.json(
        { error: "Only pending ATM actions can be cancelled." },
        { status: 400 }
      );
    }

    const action = simulation.action === "deposit" ? "deposit" : "withdraw";
    const nowIso = new Date().toISOString();
    const cancelledDescription = `${
      action === "withdraw" ? "Cancelled ATM withdrawal" : "Cancelled ATM deposit"
    } at ${simulation.atm_name} - ${simulation.atm_location}`;

    const { data: updatedTransaction, error: updateTransactionError } = await supabaseAdmin
      .from("transactions")
      .update({
        status: "failed",
        description: cancelledDescription,
        executed_at: nowIso,
      })
      .eq("status", "pending")
      .eq("transaction_id", simulation.transaction_id)
      .select("transaction_id")
      .maybeSingle();

    if (updateTransactionError || !updatedTransaction) {
      return NextResponse.json(
        {
          error:
            updateTransactionError?.message ||
            "The ATM transaction record could not be cancelled.",
        },
        { status: 500 }
      );
    }

    const { data: updatedSimulation, error: updateSimulationError } = await supabaseAdmin
      .from("atm_simulations")
      .update({
        status: "failed",
        completed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("status", "pending")
      .eq("atm_simulation_id", simulation.atm_simulation_id)
      .select("atm_simulation_id")
      .maybeSingle();

    if (updateSimulationError || !updatedSimulation) {
      return NextResponse.json(
        {
          error:
            updateSimulationError?.message ||
            "The ATM session could not be cancelled.",
        },
        { status: 500 }
      );
    }

    revalidatePath("/customer/dashboard");
    revalidatePath("/customer/accounts");
    revalidatePath("/customer/transactions");
    revalidatePath("/customer/atm");
    revalidatePath("/customer/withdraw");

    return NextResponse.json({
      success: true,
      message: "ATM action cancelled.",
    });
  } catch (error) {
    console.error("ATM cancel route error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
