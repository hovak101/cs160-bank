import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";

type CustomerRow = {
  customer_id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  tax_id: string | null;
  kyc_status: string | null;
};

type UserRow = {
  user_id: string;
  email: string | null;
  is_active: boolean | null;
  last_login_at: string | null;
};

type AccountRow = {
  account_id: string;
  customer_id: string;
  account_name: string | null;
  account_number: string | null;
  account_type: string | null;
  balance: number | null;
  currency: string | null;
  status: string | null;
  created_at: string | null;
};

function normalizeDigits(value: string | null | undefined) {
  return (value || "").replace(/\D/g, "");
}

function getMaskedSSN(taxId: string | null | undefined) {
  const digits = normalizeDigits(taxId);
  const last4 = digits.slice(-4);
  return last4 ? `***-**-${last4}` : "N/A";
}

function getSSNLast4(taxId: string | null | undefined) {
  const digits = normalizeDigits(taxId);
  return digits.slice(-4);
}

function safePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(["admin", "manager"]);
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    const name = (req.nextUrl.searchParams.get("name") || "").trim().toLowerCase();
    const ssn = normalizeDigits(req.nextUrl.searchParams.get("ssn") || "");
    const page = safePositiveInteger(req.nextUrl.searchParams.get("page"), 1);
    const pageSize = safePositiveInteger(req.nextUrl.searchParams.get("pageSize"), 5);

    const [
      { data: customers, error: customersError },
      { data: users, error: usersError },
      { data: accounts, error: accountsError },
    ] = await Promise.all([
      supabase.from("customers").select(`
        customer_id,
        user_id,
        first_name,
        last_name,
        phone_number,
        tax_id,
        kyc_status
      `),
      supabase.from("users").select(`
        user_id,
        email,
        is_active,
        last_login_at
      `),
      supabase.from("accounts").select(`
        account_id,
        customer_id,
        account_name,
        account_number,
        account_type,
        balance,
        currency,
        status,
        created_at
      `),
    ]);

    if (customersError) {
      return NextResponse.json({ error: customersError.message }, { status: 500 });
    }

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    if (accountsError) {
      return NextResponse.json({ error: accountsError.message }, { status: 500 });
    }

    const customerRows = (customers || []) as CustomerRow[];
    const userRows = (users || []) as UserRow[];
    const accountRows = (accounts || []) as AccountRow[];

    const usersMap = new Map(userRows.map((user) => [user.user_id, user]));

    const filteredCustomers = customerRows.filter((customer) => {
      const firstName = (customer.first_name || "").toLowerCase();
      const lastName = (customer.last_name || "").toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      const ssnLast4 = getSSNLast4(customer.tax_id);

      const matchesName =
        !name ||
        firstName.includes(name) ||
        lastName.includes(name) ||
        fullName.includes(name);

      const matchesSSN = !ssn || ssnLast4 === ssn;

      return matchesName && matchesSSN;
    });

    const sortedCustomers = filteredCustomers.sort((a, b) => {
      const aName = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
      const bName = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
      return aName.localeCompare(bName);
    });

    const totalCustomers = sortedCustomers.length;
    const totalPages = Math.max(1, Math.ceil(totalCustomers / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const pagedCustomers = sortedCustomers.slice(startIndex, startIndex + pageSize);

    const results = pagedCustomers.map((customer) => {
      const user = usersMap.get(customer.user_id);

      const customerAccounts = accountRows
        .filter((account) => account.customer_id === customer.customer_id)
        .sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        });

      const totalBalance = customerAccounts.reduce(
        (sum, account) => sum + Number(account.balance || 0),
        0
      );

      return {
        customer_id: customer.customer_id,
        full_name:
          `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
          "Unnamed Customer",
        email: user?.email || "N/A",
        phone_number: customer.phone_number || "N/A",
        masked_ssn: getMaskedSSN(customer.tax_id),
        kyc_status: customer.kyc_status || "pending",
        is_active: user?.is_active ?? false,
        last_login_at: user?.last_login_at || null,
        total_accounts: customerAccounts.length,
        total_balance: totalBalance,
        accounts: customerAccounts.map((account) => ({
          account_id: account.account_id,
          account_name: account.account_name || "Unnamed Account",
          account_number: account.account_number || "N/A",
          account_type: account.account_type || "N/A",
          balance: Number(account.balance || 0),
          currency: account.currency || "USD",
          status: account.status || "active",
          created_at: account.created_at,
        })),
      };
    });

    return NextResponse.json({
      data: results,
      pagination: {
        page: safePage,
        pageSize,
        totalCustomers,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Customer search API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers." },
      { status: 500 }
    );
  }
}