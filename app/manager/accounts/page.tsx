"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

type AccountStatus = "active" | "frozen" | "closed";

type AccountItem = {
  account_id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
  created_at: string | null;
};

type CustomerItem = {
  customer_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  masked_ssn: string;
  kyc_status: string;
  is_active: boolean;
  last_login_at: string | null;
  total_accounts: number;
  total_balance: number;
  accounts: AccountItem[];
};

type CustomerSearchResponse = {
  data: CustomerItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalCustomers: number;
    totalPages: number;
  };
};

const CUSTOMER_PAGE_SIZE = 5;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

function formatDateTime(value: string | null) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getKycBadgeClass(status: string | null) {
  const value = (status || "").toLowerCase();

  if (value === "verified") {
    return "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  }
  if (value === "pending") {
    return "border border-yellow-500/30 bg-yellow-500/15 text-yellow-300";
  }
  if (value === "rejected") {
    return "border border-red-500/30 bg-red-500/15 text-red-300";
  }

  return "border border-slate-500/30 bg-slate-500/15 text-slate-300";
}

function getStatusBadgeClass(status: string | null) {
  const value = (status || "").toLowerCase();

  if (value === "active") {
    return "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  }
  if (value === "frozen") {
    return "border border-sky-500/30 bg-sky-500/15 text-sky-300";
  }
  if (value === "closed") {
    return "border border-slate-500/30 bg-slate-500/15 text-slate-300";
  }
  if (value === "pending") {
    return "border border-yellow-500/30 bg-yellow-500/15 text-yellow-300";
  }
  if (value === "suspended") {
    return "border border-red-500/30 bg-red-500/15 text-red-300";
  }

  return "border border-slate-500/30 bg-slate-500/15 text-slate-300";
}

export default function ManagerAccountsPage() {
  const [nameValue, setNameValue] = useState("");
  const [ssnValue, setSsnValue] = useState("");
  const [results, setResults] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});

  async function parseJsonResponse<T>(res: Response): Promise<T> {
    const contentType = res.headers.get("content-type") || "";
    const rawText = await res.text();

    if (!contentType.includes("application/json")) {
      console.error("Non-JSON response:", rawText);
      throw new Error("API returned HTML instead of JSON.");
    }

    return JSON.parse(rawText) as T;
  }

  async function loadCustomers(page = 1, options?: { name?: string; ssn?: string }) {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(CUSTOMER_PAGE_SIZE));

      const searchName = (options?.name ?? nameValue).trim();
      const searchSsn = (options?.ssn ?? ssnValue).trim();

      if (searchName) params.set("name", searchName);
      if (searchSsn) params.set("ssn", searchSsn);

      const res = await fetch(`/api/customer/search?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await parseJsonResponse<CustomerSearchResponse | { error?: string }>(res);

      if (!res.ok) {
        throw new Error(("error" in json && json.error) || "Failed to load customers.");
      }

      const payload = json as CustomerSearchResponse;

      setResults(payload.data || []);
      setCurrentPage(payload.pagination?.page || page);
      setTotalCustomers(payload.pagination?.totalCustomers || 0);
      setTotalPages(payload.pagination?.totalPages || 1);

      const nextExpanded: Record<string, boolean> = {};
      for (const customer of payload.data || []) {
        nextExpanded[customer.customer_id] = false;
      }
      setExpandedCustomers(nextExpanded);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setResults([]);
      setCurrentPage(1);
      setTotalCustomers(0);
      setTotalPages(1);
      setExpandedCustomers({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch() {
    await loadCustomers(1);
  }

  async function handleClear() {
    const clearedName = "";
    const clearedSsn = "";

    setNameValue(clearedName);
    setSsnValue(clearedSsn);

    await loadCustomers(1, {
      name: clearedName,
      ssn: clearedSsn,
    });
  }

  function toggleCustomer(customerId: string) {
    setExpandedCustomers((prev) => ({
      ...prev,
      [customerId]: !prev[customerId],
    }));
  }

  async function goToPage(page: number) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    await loadCustomers(page);
  }

  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <div className="mb-4">
          <Link
            href="/manager/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#081328] px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-cyan-400/30 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <h1 className="text-4xl font-bold text-white">Accounts</h1>
        <p className="mt-2 text-slate-400">
          Review all customers and their linked accounts.
        </p>
      </div>

      <div className="rounded-[24px] border border-cyan-500/10 bg-[#081328] p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_240px_auto]">
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Customer name"
            className="h-12 rounded-xl border border-slate-700 bg-[#0b1a33] px-4 text-white outline-none transition focus:border-cyan-400"
          />

          <input
            type="text"
            value={ssnValue}
            onChange={(e) => setSsnValue(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            maxLength={4}
            placeholder="Last 4 of SSN"
            className="h-12 rounded-xl border border-slate-700 bg-[#0b1a33] px-4 text-white outline-none transition focus:border-cyan-400"
          />

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSearch}
              className="h-12 rounded-xl bg-cyan-500 px-6 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Search
            </button>

            <button
              onClick={handleClear}
              className="h-12 rounded-xl border border-slate-700 bg-[#0b1a33] px-6 font-semibold text-white transition hover:border-slate-500"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-500/10 bg-[#081328] px-5 py-4">
        <div className="text-sm text-slate-400">
          Total customers: <span className="font-semibold text-white">{totalCustomers}</span>
        </div>
        <div className="text-sm text-slate-400">
          Page <span className="font-semibold text-white">{currentPage}</span> of{" "}
          <span className="font-semibold text-white">{totalPages}</span>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-cyan-500/10 bg-[#081328] p-6 text-slate-300">
          Loading customers...
        </div>
      ) : null}

      {!loading && results.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-cyan-500/10 bg-[#081328] p-10 text-center text-slate-400">
          No customers found.
        </div>
      ) : null}

      {!loading && results.length > 0 ? (
        <div className="mt-6 space-y-5">
          {results.map((customer) => {
            const isExpanded = !!expandedCustomers[customer.customer_id];

            return (
              <div
                key={customer.customer_id}
                className="overflow-hidden rounded-[28px] border border-cyan-500/10 bg-[#081328]"
              >
                <button
                  type="button"
                  onClick={() => toggleCustomer(customer.customer_id)}
                  className="w-full border-b border-slate-800 bg-gradient-to-r from-[#081a33] to-[#0a1f3d] px-6 py-6 text-left transition hover:bg-[#0b1c35]"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-3xl font-bold text-white">
                          {customer.full_name}
                        </h2>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getKycBadgeClass(
                            customer.kyc_status
                          )}`}
                        >
                          {customer.kyc_status}
                        </span>

                        <span className="inline-flex rounded-full border border-slate-700 bg-[#0b1a33] px-3 py-1 text-xs font-semibold text-slate-300">
                          {customer.masked_ssn}
                        </span>

                        <span className="inline-flex rounded-full border border-slate-700 bg-[#0b1a33] px-3 py-1 text-xs font-semibold text-slate-300">
                          {customer.is_active ? "Active User" : "Inactive User"}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-400">{customer.email}</p>

                      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Phone
                          </p>
                          <p className="mt-2 text-base font-semibold text-white">
                            {customer.phone_number}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Last Login
                          </p>
                          <p className="mt-2 text-base font-semibold text-white">
                            {formatDateTime(customer.last_login_at)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Email
                          </p>
                          <p className="mt-2 truncate text-base font-semibold text-white">
                            {customer.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex min-w-[280px] flex-col items-stretch gap-3 xl:w-[360px]">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-cyan-500/10 bg-[#0b1a33] p-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Total Accounts
                          </p>
                          <p className="mt-2 text-2xl font-bold text-white">
                            {customer.total_accounts}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-cyan-500/10 bg-[#0b1a33] p-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Total Balance
                          </p>
                          <p className="mt-2 text-2xl font-bold text-white">
                            {formatCurrency(customer.total_balance)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-[#09172d] px-4 py-3">
                        <span className="text-sm font-medium text-slate-300">
                          {isExpanded ? "Hide Accounts" : "Show Accounts"}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-300" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-300" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded ? (
                  <div className="px-6 py-6">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <h3 className="text-xl font-semibold text-white">
                        Linked Accounts
                      </h3>

                      <span className="text-sm text-slate-400">
                        {customer.accounts.length} account{customer.accounts.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {customer.accounts.length === 0 ? (
                      <div className="rounded-2xl border border-slate-800 bg-[#0b1a33] p-8 text-center text-slate-400">
                        No linked accounts found.
                      </div>
                    ) : (
                      <div className="grid gap-4 lg:grid-cols-2">
                        {customer.accounts.map((account) => (
                          <div
                            key={account.account_id}
                            className="rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0b1a33] to-[#09162a] p-5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="text-lg font-semibold text-white">
                                  {account.account_name}
                                </h4>
                                <p className="mt-1 text-sm text-slate-400">
                                  {account.account_number}
                                </p>
                              </div>

                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                                  account.status
                                )}`}
                              >
                                {account.status}
                              </span>
                            </div>

                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500">
                                  Account Type
                                </p>
                                <p className="mt-2 text-sm font-semibold text-white">
                                  {account.account_type}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500">
                                  Opened
                                </p>
                                <p className="mt-2 text-sm font-semibold text-white">
                                  {formatDateTime(account.created_at)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-6 rounded-2xl border border-cyan-500/10 bg-[#081a31] p-4">
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Current Balance
                              </p>
                              <p className="mt-2 text-3xl font-bold text-white">
                                {formatCurrency(account.balance)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {!loading && totalPages > 1 ? (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-xl border border-slate-700 bg-[#0b1a33] px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                page === currentPage
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-slate-700 bg-[#0b1a33] text-white hover:border-slate-500"
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded-xl border border-slate-700 bg-[#0b1a33] px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}