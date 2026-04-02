"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

type UserItem = {
  user_id: string;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
  mfa_enabled: boolean | null;
  failed_login_attempts: number | null;
  account_locked_until: string | null;
  last_login_at: string | null;
  password_changed_at: string | null;
  created_at: string | null;
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

function getRoleBadgeClass(role: string | null) {
  const value = (role || "").toLowerCase();

  if (value === "customer") {
    return "border border-cyan-500/30 bg-cyan-500/15 text-cyan-300";
  }

  return "border border-slate-500/30 bg-slate-500/15 text-slate-300";
}

function getStatusLabel(user: UserItem) {
  if (user.is_active === false) return "Inactive";
  if (isTemporarilyLocked(user.account_locked_until)) return "Locked";
  return "Active";
}

function getStatusBadgeClass(user: UserItem) {
  if (user.is_active === false) {
    return "border border-red-500/30 bg-red-500/15 text-red-300";
  }

  if (isTemporarilyLocked(user.account_locked_until)) {
    return "border border-amber-500/30 bg-amber-500/15 text-amber-300";
  }

  return "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
}

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [selectedReason, setSelectedReason] = useState(DEACTIVATION_REASONS[0]);
  const [selectedLockType, setSelectedLockType] = useState<LockType>("permanent");

  async function fetchUsers(searchValue = "") {
    try {
      setLoading(true);
      setError("");

      const url = searchValue
        ? `/api/admin/users/search?q=${encodeURIComponent(searchValue)}`
        : `/api/admin/users/search`;

      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch users.");
      }

      setUsers(json.data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleSearch() {
    const value = query.trim();
    setSubmittedQuery(value);
    await fetchUsers(value);
  }

  async function handleClear() {
    setQuery("");
    setSubmittedQuery("");
    await fetchUsers("");
  }

  function openDeactivateModal(user: UserItem) {
    setSelectedUser(user);
    setSelectedReason(DEACTIVATION_REASONS[0]);
    setSelectedLockType("permanent");
    setShowModal(true);
  }

  async function handleDeactivateConfirm() {
    if (!selectedUser) return;

    try {
      setUpdatingId(selectedUser.user_id);
      setError("");

      const res = await fetch("/api/admin/users/toggle-status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: selectedUser.user_id,
          action: "deactivate",
          reason: selectedReason,
          lock_type: selectedLockType,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to update user.");
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.user_id === selectedUser.user_id
            ? {
                ...user,
                ...(json.data as UserItem),
              }
            : user
        )
      );

      setShowModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUpdatingId("");
    }
  }

  async function handleActivate(userId: string) {
    try {
      setUpdatingId(userId);
      setError("");

      const res = await fetch("/api/admin/users/toggle-status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          action: "activate",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to update user.");
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.user_id === userId
            ? {
                ...user,
                ...(json.data as UserItem),
              }
            : user
        )
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUpdatingId("");
    }
  }

  const totalPages = Math.max(1, Math.ceil(users.length / ITEMS_PER_PAGE));

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return users.slice(start, start + ITEMS_PER_PAGE);
  }, [users, currentPage]);

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

        <h1 className="text-4xl font-bold text-white">User Management</h1>
        <p className="mt-2 text-slate-400">
          Browse customer users, search by email, and manage account status.
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
            placeholder="Search by email"
            className="h-12 rounded-xl border border-slate-700 bg-[#0b1a33] px-4 text-white outline-none transition focus:border-cyan-400"
          />

          <div className="flex gap-3">
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
        <div className="mt-4 text-sm text-slate-400">Showing all customer users</div>
      )}

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-cyan-500/10 bg-[#081328] p-6 text-slate-300">
          Loading users...
        </div>
      ) : null}

      {!loading && users.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-cyan-500/10 bg-[#081328] p-10 text-center text-slate-400">
          No matching users found.
        </div>
      ) : null}

      {!loading && users.length > 0 ? (
        <>
          <div className="mt-6 space-y-6">
            {paginatedUsers.map((user) => (
              <div
                key={user.user_id}
                className="overflow-hidden rounded-[28px] border border-cyan-500/10 bg-[#081328]"
              >
                <div className="border-b border-slate-800 bg-gradient-to-r from-[#081a33] to-[#0a1f3d] px-6 py-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-bold text-white">
                          {user.email || "No Email"}
                        </h2>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(
                            user.role
                          )}`}
                        >
                          {user.role || "unknown"}
                        </span>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                            user
                          )}`}
                        >
                          {getStatusLabel(user)}
                        </span>

                        <span className="inline-flex rounded-full border border-slate-700 bg-[#0b1a33] px-3 py-1 text-xs font-semibold text-slate-300">
                          MFA {user.mfa_enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-400">
                        User ID: {user.user_id}
                      </p>

                      {user.deactivation_reason ? (
                        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                          Reason: {user.deactivation_reason}
                        </div>
                      ) : null}

                      {isTemporarilyLocked(user.account_locked_until) ? (
                        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                          Locked until: {formatDateTime(user.account_locked_until)}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex gap-3">
                      {user.is_active === false || isTemporarilyLocked(user.account_locked_until) ? (
                        <button
                          onClick={() => handleActivate(user.user_id)}
                          disabled={updatingId === user.user_id}
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-5 py-3 font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-60"
                        >
                          {updatingId === user.user_id ? "Updating..." : "Activate"}
                        </button>
                      ) : (
                        <button
                          onClick={() => openDeactivateModal(user)}
                          disabled={updatingId === user.user_id}
                          className="rounded-xl border border-red-500/30 bg-red-500/15 px-5 py-3 font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-60"
                        >
                          {updatingId === user.user_id ? "Updating..." : "Deactivate"}
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
                        {formatDateTime(user.last_login_at)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Failed Login Attempts
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">
                        {user.failed_login_attempts ?? 0}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Account Locked Until
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">
                        {formatDateTime(user.account_locked_until)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Created At
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">
                        {formatDateTime(user.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Password Changed At
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">
                        {formatDateTime(user.password_changed_at)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-[#09172d] p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Current Status
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">
                        {user.is_active === false
                          ? "Account is permanently disabled"
                          : isTemporarilyLocked(user.account_locked_until)
                          ? "Account is temporarily locked"
                          : "Account is enabled"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-[#081328] px-6 py-4">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <div className="text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      ) : null}

      {showModal && selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-cyan-500/10 bg-[#081328] p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-white">Deactivate User</h3>
            <p className="mt-2 text-slate-400">
              Choose a reason and lock type for{" "}
              <span className="font-semibold text-white">{selectedUser.email}</span>.
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

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedUser(null);
                }}
                className="rounded-xl border border-slate-700 bg-[#0b1a33] px-5 py-3 font-semibold text-white transition hover:border-slate-500"
              >
                Cancel
              </button>

              <button
                onClick={handleDeactivateConfirm}
                disabled={updatingId === selectedUser.user_id}
                className="rounded-xl border border-red-500/30 bg-red-500/15 px-5 py-3 font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-60"
              >
                {updatingId === selectedUser.user_id
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