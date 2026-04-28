"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { TransactionFilters, type TransactionFilters as TransactionFiltersType } from "@/components/admin/transaction-filters";

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

const ITEMS_PER_PAGE = 10;

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

function getTransactionTypeBadgeClass(type: string | null) {
  const value = (type || "").toLowerCase();

  if (value === "deposit") {
    return "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  }
  if (value === "withdrawal") {
    return "border border-orange-500/30 bg-orange-500/15 text-orange-300";
  }
  if (value === "transfer") {
    return "border border-cyan-500/30 bg-cyan-500/15 text-cyan-300";
  }
  if (value === "fee") {
    return "border border-red-500/30 bg-red-500/15 text-red-300";
  }
  if (value === "interest") {
    return "border border-purple-500/30 bg-purple-500/15 text-purple-300";
  }

  return "border border-slate-500/30 bg-slate-500/15 text-slate-300";
}

function getStatusBadgeClass(status: string | null) {
  const value = (status || "").toLowerCase();

  if (value === "completed") {
    return "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  }
  if (value === "pending") {
    return "border border-yellow-500/30 bg-yellow-500/15 text-yellow-300";
  }
  if (value === "failed") {
    return "border border-red-500/30 bg-red-500/15 text-red-300";
  }
  if (value === "reversed") {
    return "border border-slate-500/30 bg-slate-500/15 text-slate-300";
  }

  return "border border-slate-500/30 bg-slate-500/15 text-slate-300";
}

export default function AdminDepositsPage() {
  const [referenceNumber, setReferenceNumber] = useState("");
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<TransactionFiltersType>({
    dateSort: "desc",
    minAmount: 10000,
    minAmountDisplay: 10000,
    amountThreshold: 10000,
  });

  async function parseJsonResponse<T>(res: Response): Promise<T> {
    const contentType = res.headers.get("content-type") || "";
    const rawText = await res.text();

    if (!contentType.includes("application/json")) {
      console.error("Non-JSON response:", rawText);
      throw new Error("API returned HTML instead of JSON.");
    }

    return JSON.parse(rawText) as T;
  }

  async function loadTransactions(page = 1, options?: { referenceNumber?: string; filters?: TransactionFiltersType }) {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(ITEMS_PER_PAGE));
      params.set("transactionType", "deposit");

      const searchRef = (options?.referenceNumber ?? referenceNumber).trim();
      if (searchRef) params.set("referenceNumber", searchRef);

      const currentFilters = options?.filters || filters;
      
      // Add filter parameters
      if (currentFilters.dateSort) {
        params.set("dateSort", currentFilters.dateSort);
      }
      if (currentFilters.specificDate) {
        params.set("specificDate", currentFilters.specificDate);
      }
      if (currentFilters.minAmount) {
        params.set("minAmount", String(currentFilters.minAmount));
      }
      if (currentFilters.maxAmount) {
        params.set("maxAmount", String(currentFilters.maxAmount));
      }
      if (currentFilters.cashboxOnly) {
        params.set("cashboxOnly", "true");
      }
      if (currentFilters.transactionStatus && currentFilters.transactionStatus !== "all") {
        params.set("transactionStatus", currentFilters.transactionStatus);
      }

      const res = await fetch(`/api/admin/transactions/search?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await parseJsonResponse<TransactionResponse | { error?: string }>(res);

      if (!res.ok) {
        throw new Error(("error" in json && json.error) || "Failed to load deposits.");
      }

      const payload = json as TransactionResponse;

      setTransactions(payload.data || []);
      setCurrentPage(payload.pagination?.page || page);
      setTotalTransactions(payload.pagination?.totalTransactions || 0);
      setTotalPages(payload.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setTransactions([]);
      setCurrentPage(1);
      setTotalTransactions(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch() {
    await loadTransactions(1);
  }

  async function handleFiltersChange(newFilters: TransactionFiltersType) {
    setFilters(newFilters);
    await loadTransactions(1, { filters: newFilters });
  }

  async function handleClear() {
    const cleared = "";
    setReferenceNumber(cleared);
    setFilters({
      dateSort: "desc",
      minAmount: 10000,
      minAmountDisplay: 10000,
      amountThreshold: 10000,
    });

    await loadTransactions(1, {
      referenceNumber: cleared,
      filters: { dateSort: "desc", minAmount: 10000 },
    });
  }

  async function goToPage(page: number) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    await loadTransactions(page);
  }

  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <div className="mb-4">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#081328] px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-cyan-400/30 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <h1 className="text-4xl font-bold text-white">Deposits</h1>
        <p className="mt-2 text-slate-400">
          Review all deposit transactions across the bank.
        </p>
      </div>

      <div className="rounded-[24px] border border-cyan-500/10 bg-[#081328] p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Search by reference number"
            className="h-12 rounded-xl border border-slate-700 bg-[#0b1a33] px-4 text-white outline-none transition focus:border-cyan-400"
          />

          <div className="flex flex-wrap gap-3">
            <TransactionFilters
              onFiltersChange={handleFiltersChange}
              initialFilters={filters}
              showTransactionType={false}
              showCashboxFilter={false}
              minAmountThreshold={10000}
            />

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
          Total deposits: <span className="font-semibold text-white">{totalTransactions}</span>
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
        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/10 bg-[#081328] p-6 text-slate-300">
          <Loader2 className="animate-spin" size={18} />
          Loading deposits...
        </div>
      ) : null}

      {!loading && transactions.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-cyan-500/10 bg-[#081328] p-10 text-center text-slate-400">
          No deposits found.
        </div>
      ) : null}

      {!loading && transactions.length > 0 ? (
        <div className="mt-6 space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.transaction_id}
              className="rounded-[28px] border border-slate-800 bg-gradient-to-r from-[#081a33] to-[#0a1f3d] p-6"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">
                      {formatCurrency(transaction.amount)}
                    </h2>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTransactionTypeBadgeClass(
                        transaction.transaction_type
                      )}`}
                    >
                      {transaction.transaction_type}
                    </span>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                        transaction.status
                      )}`}
                    >
                      {transaction.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Reference #
                      </p>
                      <p
                        className="mt-2 break-all font-mono text-xs font-semibold text-white"
                        title={transaction.reference_number ?? ""}
                      >
                        {transaction.reference_number}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Executed
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {formatDateTime(transaction.executed_at)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Description
                      </p>
                      <p
                        className="mt-2 truncate text-sm font-semibold text-white"
                        title={transaction.description || ""}
                      >
                        {transaction.description || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    {transaction.destination_account_id && (
                      <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Destination Account
                        </p>
                        <p
                          className="mt-2 break-all font-mono text-xs font-semibold text-white"
                          title={transaction.destination_account_id ?? ""}
                        >
                          {transaction.destination_account_id}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
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