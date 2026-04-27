import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Direct withdrawals are no longer available. Please use the ATM page and finish the ATM simulation there.",
    },
    { status: 410 }
  );
}
