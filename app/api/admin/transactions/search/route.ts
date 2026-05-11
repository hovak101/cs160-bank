import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";

type TransactionType =
  | "deposit"
  | "withdrawal"
  | "atm_deposit"
  | "atm_withdrawal"
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
  "atm_deposit",
  "atm_withdrawal",
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
    const auth = await requireRole(["admin"]);
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    // Reduce max page size to 10 to avoid large result sets
    const pageSize = Math.min(10, Math.max(1, parseInt(searchParams.get("pageSize") || "10")));
    const transactionType = searchParams.get("transactionType");
    const transactionStatus = searchParams.get("transactionStatus");
    const referenceNumber = searchParams.get("referenceNumber");
    const dateSort = searchParams.get("dateSort"); // "asc" or "desc"
    const specificDate = searchParams.get("specificDate"); // YYYY-MM-DD format
    const minAmount = searchParams.get("minAmount");
    const maxAmount = searchParams.get("maxAmount");
    const cashboxOnly = searchParams.get("cashboxOnly") === "true";

    // Always apply a date range filter to avoid scanning the entire table
    let dateRangeStart: Date;
    let dateRangeEnd: Date;

    if (specificDate) {
      // If searching a specific date, use that day only
      dateRangeStart = new Date(specificDate);
      dateRangeStart.setUTCHours(0, 0, 0, 0);
      dateRangeEnd = new Date(specificDate);
      dateRangeEnd.setUTCHours(23, 59, 59, 999);
    } else {
      // Default to last 30 days if no date filter provided
      dateRangeEnd = new Date();
      dateRangeStart = new Date();
      dateRangeStart.setDate(dateRangeStart.getDate() - 30);
    }

    // Build base query for filtering (reusable for both count and fetch)
    let filterQuery = supabase
      .from("transactions")
      .select(
        "transaction_id, reference_number, source_account_id, destination_account_id, amount, transaction_type, status, description, executed_at",
        { count: "exact" }
      )
      .gte("executed_at", dateRangeStart.toISOString())
      .lte("executed_at", dateRangeEnd.toISOString());

    // Filter by cashbox transactions if requested
    if (cashboxOnly) {
      filterQuery = filterQuery.in("transaction_type", ["cashbox_withdraw", "cashbox_send"]);
    } else if (transactionType && transactionType !== "all") {
      if (!isTransactionType(transactionType)) {
        return NextResponse.json(
          { error: "Invalid transaction type." },
          { status: 400 }
        );
      }

      // Filter by transaction type if specified (deposits, withdrawals)
      if (transactionType === "deposit") {
        filterQuery = filterQuery.in("transaction_type", ["deposit", "atm_deposit"]);
      } else if (transactionType === "withdrawal") {
        filterQuery = filterQuery.in("transaction_type", ["withdrawal", "atm_withdrawal"]);
      } else {
        filterQuery = filterQuery.eq("transaction_type", transactionType);
      }
    }

    // Filter by transaction status if specified
    if (transactionStatus && transactionStatus !== "all") {
      filterQuery = filterQuery.eq("status", transactionStatus);
    }

    // Filter by reference number if provided - only allow with at least 3 characters
    const trimmedRef = referenceNumber?.trim();
    if (trimmedRef && trimmedRef.length >= 3) {
      filterQuery = filterQuery.ilike("reference_number", `%${trimmedRef}%`);
    } else if (trimmedRef && trimmedRef.length > 0 && trimmedRef.length < 3) {
      return NextResponse.json(
        { error: "Reference number search requires at least 3 characters." },
        { status: 400 }
      );
    }

    // Filter by amount range if provided
    if (minAmount) {
      filterQuery = filterQuery.gte("amount", parseFloat(minAmount));
    }
    if (maxAmount) {
      filterQuery = filterQuery.lte("amount", parseFloat(maxAmount));
    }

    // Get total count
    const { count: totalCount } = await filterQuery;
    const total = totalCount || 0;
    const totalPages = Math.ceil(total / pageSize);

    // Fetch paginated results with sorting
    const sortAscending = dateSort === "asc";
    const { data: transactions, error } = await filterQuery
      .order("executed_at", { ascending: sortAscending })
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
    console.error("Admin transactions search error:", error);
    return NextResponse.json(
      { error: "Failed to search transactions." },
      { status: 500 }
    );
  }
}
