"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface TransactionFilters {
  transactionType?: string;
  transactionStatus?: string;
  cashboxOnly?: boolean;
  dateSort?: "asc" | "desc";
  specificDate?: string;
  minAmount?: number;
  maxAmount?: number;
  minAmountDisplay?: number;
  amountThreshold?: number;
}

interface TransactionFiltersProps {
  onFiltersChange: (filters: TransactionFilters) => void;
  initialFilters?: TransactionFilters;
  showTransactionType?: boolean;
  showCashboxFilter?: boolean;
  minAmountThreshold?: number;
}

export function TransactionFilters({
  onFiltersChange,
  initialFilters,
  showTransactionType = false,
  showCashboxFilter = true,
  minAmountThreshold = 0,
}: TransactionFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateSort, setDateSort] = useState<"asc" | "desc">(initialFilters?.dateSort || "desc");
  const [specificDate, setSpecificDate] = useState(initialFilters?.specificDate || "");
  const [minAmount, setMinAmount] = useState(initialFilters?.minAmountDisplay ? String(initialFilters.minAmountDisplay) : "");
  const [maxAmount, setMaxAmount] = useState(initialFilters?.maxAmount || "");
  const [transactionType, setTransactionType] = useState(initialFilters?.transactionType || "");
  const [transactionStatus, setTransactionStatus] = useState(initialFilters?.transactionStatus || "");
  const [cashboxOnly, setCashboxOnly] = useState(initialFilters?.cashboxOnly || false);
  const [amountError, setAmountError] = useState("");

  // Keep internal state in sync when the parent resets/updates initialFilters
  // (e.g. the page-level Clear button), so hasActiveFilters reflects reality.
  useEffect(() => {
    setDateSort(initialFilters?.dateSort || "desc");
    setSpecificDate(initialFilters?.specificDate || "");
    setMinAmount(initialFilters?.minAmountDisplay ? String(initialFilters.minAmountDisplay) : "");
    setMaxAmount(initialFilters?.maxAmount ? String(initialFilters.maxAmount) : "");
    setTransactionType(initialFilters?.transactionType || "");
    setTransactionStatus(initialFilters?.transactionStatus || "");
    setCashboxOnly(initialFilters?.cashboxOnly || false);
  }, [
    initialFilters?.dateSort,
    initialFilters?.specificDate,
    initialFilters?.minAmountDisplay,
    initialFilters?.maxAmount,
    initialFilters?.transactionType,
    initialFilters?.transactionStatus,
    initialFilters?.cashboxOnly,
    minAmountThreshold,
  ]);

  const handleApplyFilters = () => {
    const minParsed = parseFloat(minAmount as string);
    const maxParsed = parseFloat(maxAmount as string);
    if (Number.isFinite(minParsed) && Number.isFinite(maxParsed) && minParsed > maxParsed) {
      setAmountError("Minimum amount cannot be greater than maximum amount.");
      return;
    }
    setAmountError("");
    const filters: TransactionFilters = {
      dateSort,
    };

    if (specificDate) filters.specificDate = specificDate;
    const minAmountParsed = parseFloat(minAmount as string);
    if (Number.isFinite(minAmountParsed) && minAmountParsed > 0) {
      filters.minAmountDisplay = minAmountParsed;
      filters.minAmount = minAmountParsed;
    }
    if (cashboxOnly) filters.cashboxOnly = true;
    if (showTransactionType && transactionType) filters.transactionType = transactionType;
    if (transactionStatus) filters.transactionStatus = transactionStatus;

    onFiltersChange(filters);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    setDateSort("desc");
    setSpecificDate("");
    setMinAmount(minAmountThreshold > 0 ? String(minAmountThreshold) : "");
    setMaxAmount("");
    setTransactionStatus("");
    setCashboxOnly(false);
    if (showTransactionType) setTransactionType("");

    onFiltersChange({
      dateSort: "desc",
      minAmount: minAmountThreshold > 0 ? minAmountThreshold : undefined,
      minAmountDisplay: minAmountThreshold,
      amountThreshold: minAmountThreshold,
      cashboxOnly: false,
    });
    setIsOpen(false);
  };

  const hasActiveFilters =
    specificDate ||
    maxAmount ||
    cashboxOnly ||
    transactionStatus ||
    (showTransactionType && transactionType) ||
    (minAmount !== "" && Number(minAmount) > minAmountThreshold);
    parseFloat(minAmount as string) > minAmountThreshold;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-12 rounded-xl px-4 py-2 font-semibold transition flex items-center gap-2 border ${
          hasActiveFilters
            ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/30"
            : "border-slate-700 bg-[#0b1a33] text-white hover:border-slate-500"
        }`}
      >
        <span>Filters</span>
        {hasActiveFilters && <span className="text-xs px-2 py-0.5 bg-cyan-500/40 rounded-full">Active</span>}
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-700 bg-[#0b1a33] p-4 shadow-lg z-50 sm:left-auto sm:right-0">
          <div className="space-y-4">
            {/* Date Sort */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                Sort by Date
              </label>
              <select
                value={dateSort}
                onChange={(e) => setDateSort(e.target.value as "asc" | "desc")}
                className="w-full rounded-lg border border-slate-600 bg-[#081328] px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="desc">Newest First (Descending)</option>
                <option value="asc">Oldest First (Ascending)</option>
              </select>
            </div>

            {/* Specific Date */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                Filter by Date
              </label>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-[#081328] px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </div>

            {/* Amount Range */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                Minimum Amount {minAmountThreshold > 0 && `(Min: $${minAmountThreshold.toLocaleString()})`}
              </label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => { setMinAmount(e.target.value); setAmountError(""); }}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isFinite(v)) setMinAmount((Math.round(v * 100) / 100).toString());
                }}
                min={minAmountThreshold}
                step="0.01"
                placeholder="Min amount"
                className="w-full rounded-lg border border-slate-600 bg-[#081328] px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                Maximum Amount
              </label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => { setMaxAmount(e.target.value); setAmountError(""); }}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isFinite(v)) setMaxAmount((Math.round(v * 100) / 100).toString());
                }}
                min="0"
                step="0.01"
                placeholder="Max amount"
                className="w-full rounded-lg border border-slate-600 bg-[#081328] px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </div>

            {amountError && (
              <p className="text-xs text-red-400">{amountError}</p>
            )}

            {/* Cashbox Only Checkbox */}
            {showCashboxFilter && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-600 bg-[#081328]">
                <input
                  type="checkbox"
                  id="cashboxOnly"
                  checked={cashboxOnly}
                  onChange={(e) => setCashboxOnly(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="cashboxOnly" className="text-sm font-semibold text-white cursor-pointer">
                  Show Cashbox Transactions Only
                </label>
              </div>
            )}

            {/* Transaction Type */}
            {showTransactionType && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                  Transaction Type
                </label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-[#081328] px-3 py-2 text-white outline-none focus:border-cyan-400"
                >
                  <option value="">All Types</option>
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                  <option value="atm_deposit">ATM Deposit</option>
                  <option value="atm_withdrawal">ATM Withdrawal</option>
                  <option value="transfer">Transfer</option>
                  <option value="fee">Fee</option>
                  <option value="interest">Interest</option>
                </select>
              </div>
            )}

            {/* Transaction Status */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                Status
              </label>
              <select
                value={transactionStatus}
                onChange={(e) => setTransactionStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-[#081328] px-3 py-2 text-white outline-none focus:border-cyan-400"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleApplyFilters}
                className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Apply Filters
              </button>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="flex-1 rounded-lg border border-slate-600 bg-[#081328] px-3 py-2 font-semibold text-white transition hover:border-slate-500"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
