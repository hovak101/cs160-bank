"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { AddManagerForm } from "@/components/admin/add-manager-form";

type ManagerItem = {
  manager_id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  employee_id: string | null;
  created_at: string | null;
  is_active: boolean | null;
  email: string | null;
  user_is_active: boolean | null;
  mfa_enabled: boolean | null;
  failed_login_attempts: number | null;
  account_locked_until: string | null;
  last_login_at: string | null;
  password_changed_at: string | null;
  deactivation_reason: string | null;
};

type LockType = "permanent" | "24h" | "7d";

const ITEMS_PER_PAGE = 8;

const DEACTIVATION_REASONS = [
  "Suspicious activity detected",
  "Too many failed login attempts",
  "Requested by administrator",
];

const LOCK_OPTIONS: { label: string; value: LockType }[] = [
  { label: "Permanent Disable", value: "permanent" },
  { label: "Lock 24 Hours", value: "24h" },
  { label: "Lock 7 Days", value: "7d" },
];

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

function isTemporarilyLocked(accountLockedUntil: string | null) {
  if (!accountLockedUntil) return false;
  return new Date(accountLockedUntil).getTime() > Date.now();
}

function getStatusLabel(manager: ManagerItem) {
  if (manager.is_active === false || manager.user_is_active === false) {
    return "Inactive";
  }
  if (isTemporarilyLocked(manager.account_locked_until)) return "Locked";
  return "Active";
}

function getStatusBadgeClass(manager: ManagerItem) {
  if (manager.is_active === false || manager.user_is_active === false) {
    return "border border-red-500/30 bg-red-500/15 text-red-300";
  }
  if (isTemporarilyLocked(manager.account_locked_until)) {
    return "border border-amber-500/30 bg-amber-500/15 text-amber-300";
  }
  return "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
}

export default function AdminManagersPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [managers, setManagers] = useState<ManagerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState<ManagerItem | null>(null);
  const [selectedReason, setSelectedReason] = useState(DEACTIVATION_REASONS[0]);
  const [selectedLockType, setSelectedLockType] = useState<LockType>("permanent");

  async function fetchManagers(searchValue = "") {
    try {
      setLoading(true);
      setError("");

      const url = searchValue
        ? `/api/admin/managers/search?q=${encodeURIComponent(searchValue)}`
        : `/api/admin/managers/search`;

      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch managers.");
      }

      setManagers(json.data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setManagers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchManagers();
  }, []);

  async function handleSearch() {
    const value = query.trim();
    setSubmittedQuery(value);
    await fetchManagers(value);
  }

  async function handleClear() {
    setQuery("");
    setSubmittedQuery("");
    await fetchManagers("");
  }

  function openDeactivateModal(manager: ManagerItem) {
    setSelectedManager(manager);
    setSelectedReason(DEACTIVATION_REASONS[0]);
    setSelectedLockType("permanent");
    setShowModal(true);
  }

  async function handleDeactivateConfirm() {
    if (!selectedManager) return;

    try {
      setUpdatingId(selectedManager.manager_id);
      setError("");

      const res = await fetch("/api/admin/managers/toggle-status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manager_id: selectedManager.manager_id,
          action: "deactivate",
          reason: selectedReason,
          lock_type: selectedLockType,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to update manager.");
      }

      setManagers((prev) =>
        prev.map((manager) =>
          manager.manager_id === selectedManager.manager_id
            ? { ...manager, ...(json.data as ManagerItem) }
            : manager
        )
      );

      setShowModal(false);
      setSelectedManager(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUpdatingId("");
    }
  }

  async function handleActivate(managerId: string) {
    try {
      setUpdatingId(managerId);
      setError("");

      const res = await fetch("/api/admin/managers/toggle-status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manager_id: managerId,
          action: "activate",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to update manager.");
      }

      setManagers((prev) =>
        prev.map((manager) =>
          manager.manager_id === managerId
            ? { ...manager, ...(json.data as ManagerItem) }
            : manager
        )
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUpdatingId("");
    }
  }

  const totalPages = Math.max(1, Math.ceil(managers.length / ITEMS_PER_PAGE));

  const paginatedManagers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return managers.slice(start, start + ITEMS_PER_PAGE);
  }, [managers, currentPage]);

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
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

        <h1 className="text-4xl font-bold text-white">Manager Management</h1>
        <p className="mt-2 text-slate-400">
          Browse managers, search by name or email, and manage their account status.
        </p>
      </div>

      <div className="rounded-[24px] border border-cyan-500/10 bg-[#081328] p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Search by email or name"
            className="h-12 rounded-xl border border-slate-700 bg-[#0b1a33] px-4 text-white outline-none transition focus:border-cyan-400"
          />

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="h-12 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-6 font-semibold text-emerald-300 transition hover:bg-emerald-500/25 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Manager
            </button>

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

      {submittedQuery ? (
        <div className="mt-4 text-sm text-slate-400">
          Current filter:{" "}
          <span className="font-medium text-white">{submittedQuery}</span>
        </div>
      ) : (
        <div className="mt-4 text-sm text-slate-400">Showing all managers</div>
      )}

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/10 bg-[#081328] p-6 text-slate-300">
          <Loader2 className="animate-spin" size={18} />
          Loading managers...
        </div>
      ) : null}

      {!loading && managers.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-cyan-500/10 bg-[#081328] p-10 text-center text-slate-400">
          No managers found.
        </div>
      ) : null}

      {!loading && managers.length > 0 ? (
        <>
          <div className="mt-6 space-y-6">
            {paginatedManagers.map((manager) => {
              const isLocked = isTemporarilyLocked(manager.account_locked_until);
              const isInactive =
                manager.is_active === false || manager.user_is_active === false;
              const showActivate = isInactive || isLocked;

              return (
                <div
                  key={manager.manager_id}
                  className="overflow-hidden rounded-[28px] border border-cyan-500/10 bg-[#081328]"
                >
                  <div className="border-b border-slate-800 bg-gradient-to-r from-[#081a33] to-[#0a1f3d] px-6 py-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-2xl font-bold text-white">
                            {manager.first_name} {manager.last_name}
                          </h2>

                          <span className="inline-flex rounded-full border border-violet-500/30 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-300">
                            manager
                          </span>

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                              manager
                            )}`}
                          >
                            {getStatusLabel(manager)}
                          </span>

                          <span className="inline-flex rounded-full border border-slate-700 bg-[#0b1a33] px-3 py-1 text-xs font-semibold text-slate-300">
                            MFA {manager.mfa_enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>

                        <p className="mt-3 break-all text-sm text-slate-400">
                          Email: {manager.email || "N/A"}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          Employee ID:{" "}
                          <span className="font-mono text-slate-300">
                            {manager.employee_id || "N/A"}
                          </span>
                        </p>

                        <p className="mt-2 break-all font-mono text-xs text-slate-500">
                          User ID: {manager.user_id}
                        </p>

                        {manager.deactivation_reason ? (
                          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            Reason: {manager.deactivation_reason}
                          </div>
                        ) : null}

                        {isLocked ? (
                          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                            Locked until:{" "}
                            {formatDateTime(manager.account_locked_until)}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {showActivate ? (
                          <button
                            onClick={() => handleActivate(manager.manager_id)}
                            disabled={updatingId === manager.manager_id}
                            className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-5 py-3 font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none"
                          >
                            {updatingId === manager.manager_id
                              ? "Updating..."
                              : "Activate"}
                          </button>
                        ) : (
                          <button
                            onClick={() => openDeactivateModal(manager)}
                            disabled={updatingId === manager.manager_id}
                            className="rounded-xl border border-red-500/30 bg-red-500/15 px-5 py-3 font-semibold text-red-300 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none"
                          >
                            {updatingId === manager.manager_id
                              ? "Updating..."
                              : "Deactivate"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Last Login
                        </p>
                        <p className="mt-2 text-base font-semibold text-white">
                          {formatDateTime(manager.last_login_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Failed Login Attempts
                        </p>
                        <p className="mt-2 text-base font-semibold text-white">
                          {manager.failed_login_attempts ?? 0}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Account Locked Until
                        </p>
                        <p className="mt-2 text-base font-semibold text-white">
                          {formatDateTime(manager.account_locked_until)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Created At
                        </p>
                        <p className="mt-2 text-base font-semibold text-white">
                          {formatDateTime(manager.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Password Changed At
                        </p>
                        <p className="mt-2 text-base font-semibold text-white">
                          {formatDateTime(manager.password_changed_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Current Status
                        </p>
                        <p className="mt-2 text-base font-semibold text-white">
                          {isInactive
                            ? "Account is permanently disabled"
                            : isLocked
                            ? "Account is temporarily locked"
                            : "Account is enabled"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-xl border border-slate-700 bg-[#0b1a33] px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
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
                )
              )}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-slate-700 bg-[#0b1a33] px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : null}

      {showAddForm && (
        <AddManagerForm
          onClose={() => setShowAddForm(false)}
          onSuccess={() => fetchManagers(submittedQuery)}
        />
      )}

      {showModal && selectedManager ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-cyan-500/10 bg-[#081328] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-2xl font-bold text-white">Deactivate Manager</h3>
            <p className="mt-2 text-slate-400">
              Choose a reason and lock type for{" "}
              <span className="font-semibold text-white">
                {selectedManager.first_name} {selectedManager.last_name}
              </span>
              .
            </p>

            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-slate-300">Reason</p>
              <div className="space-y-3">
                {DEACTIVATION_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 transition ${
                      selectedReason === reason
                        ? "border-cyan-400/40 bg-cyan-500/10"
                        : "border-slate-700 bg-[#0b1a33]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deactivation_reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="h-4 w-4"
                    />
                    <span className="text-white">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-slate-300">Lock Type</p>
              <div className="space-y-3">
                {LOCK_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 transition ${
                      selectedLockType === option.value
                        ? "border-cyan-400/40 bg-cyan-500/10"
                        : "border-slate-700 bg-[#0b1a33]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="lock_type"
                      value={option.value}
                      checked={selectedLockType === option.value}
                      onChange={() => setSelectedLockType(option.value)}
                      className="h-4 w-4"
                    />
                    <span className="text-white">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedManager(null);
                }}
                className="rounded-xl border border-slate-700 bg-[#0b1a33] px-5 py-3 font-semibold text-white transition hover:border-slate-500"
              >
                Cancel
              </button>

              <button
                onClick={handleDeactivateConfirm}
                disabled={updatingId === selectedManager.manager_id}
                className="rounded-xl border border-red-500/30 bg-red-500/15 px-5 py-3 font-semibold text-red-300 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none"
              >
                {updatingId === selectedManager.manager_id
                  ? "Updating..."
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
