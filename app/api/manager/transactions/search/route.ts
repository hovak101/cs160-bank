import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type TransactionType =
  | "deposit"
  | "withdrawal"
  | "transfer"
  | "bill_payment"
  | "cashbox_send"
  | "cashbox_withdraw"
  | "credit_purchase"
  | "credit_payment"
  | "fee"
  | "interest";

const ALLOWED_TRANSACTION_TYPES = [
  "deposit",
  "withdrawal",
  "transfer",
  "bill_payment",
  "cashbox_send",
  "cashbox_withdraw",
  "credit_purchase",
  "credit_payment",
  "fee",
  "interest",
] as const satisfies readonly TransactionType[];

function isTransactionType(value: string): value is TransactionType {
  return (ALLOWED_TRANSACTION_TYPES as readonly string[]).includes(value);
}

type TransactionItem = {
  transaction_id: string;
  reference_number: string;
  source_account_id: string | null;
  destination_account_id: string | null;
  amount: number;
  transaction_type: string | null;
  status: string | null;
  description: string | null;
  executed_at: string | null;
};

type TransactionResponse = {
  data: TransactionItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalTransactions: number;
    totalPages: number;
  };
};

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify manager role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (userData?.role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "10"));
    const transactionType = searchParams.get("transactionType");
    const referenceNumber = searchParams.get("referenceNumber");

    let query = supabase
      .from("transactions")
      .select("*", { count: "exact" });

    // Filter by transaction type if specified (deposits, withdrawals)
    if (transactionType && transactionType !== "all") {
      if (!isTransactionType(transactionType)) {
        return NextResponse.json(
          { error: "Invalid transaction type." },
          { status: 400 }
        );
      }

      query = query.eq("transaction_type", transactionType);
    }

    // Filter by reference number if provided
    if (referenceNumber?.trim()) {
      query = query.ilike("reference_number", `%${referenceNumber.trim()}%`);
    }

    // Get total count
    const { count: totalCount } = await query;
    const total = totalCount || 0;
    const totalPages = Math.ceil(total / pageSize);

    // Fetch paginated results ordered by executed_at descending
    const { data: transactions, error } = await query
      .order("executed_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch transactions." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: transactions || [],
      pagination: {
        page,
        pageSize,
        totalTransactions: total,
        totalPages,
      },
    } as TransactionResponse);
  } catch (error) {
    console.error("Manager transactions search error:", error);
    return NextResponse.json(
      { error: "Failed to search transactions." },
      { status: 500 }
    );
  }
}
