"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { AddManagerForm } from "@/components/admin/add-manager-form";

type ManagerItem = {
  manager_id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  employee_id: string | null;
  created_at: string | null;
  is_active: boolean | null;
  email?: string | null;
};

const ITEMS_PER_PAGE = 8;

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

function getStatusBadgeClass(isActive: boolean | null) {
  if (isActive === false) {
    return "border border-red-500/30 bg-red-500/15 text-red-300";
  }

  return "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
}

function getStatusLabel(isActive: boolean | null) {
  if (isActive === false) return "Inactive";
  return "Active";
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

  async function handleDeactivate(managerId: string) {
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
          action: "deactivate",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to update manager.");
      }

      setManagers((prev) =>
        prev.map((manager) =>
          manager.manager_id === managerId
            ? {
                ...manager,
                ...(json.data as ManagerItem),
              }
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
            ? {
                ...manager,
                ...(json.data as ManagerItem),
              }
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
          Browse managers, search by name or email, and manage their accounts.
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

          <div className="flex gap-3">
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
        <div className="mt-6 rounded-2xl border border-cyan-500/10 bg-[#081328] p-6 text-slate-300">
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
            {paginatedManagers.map((manager) => (
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

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                            manager.is_active
                          )}`}
                        >
                          {getStatusLabel(manager.is_active)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-400">
                        Email: {manager.email || "N/A"}
                      </p>

                      <p className="mt-2 text-sm text-slate-400">
                        Employee ID: {manager.employee_id}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        Created: {formatDateTime(manager.created_at)}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      {manager.is_active === false ? (
                        <button
                          onClick={() => handleActivate(manager.manager_id)}
                          disabled={updatingId === manager.manager_id}
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-5 py-3 font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-60"
                        >
                          {updatingId === manager.manager_id ? "Updating..." : "Activate"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeactivate(manager.manager_id)}
                          disabled={updatingId === manager.manager_id}
                          className="rounded-xl border border-red-500/30 bg-red-500/15 px-5 py-3 font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-60"
                        >
                          {updatingId === manager.manager_id ? "Updating..." : "Deactivate"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
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
          )}
        </>
      ) : null}

      {showAddForm && (
        <AddManagerForm
          onClose={() => setShowAddForm(false)}
          onSuccess={() => fetchManagers(submittedQuery)}
        />
      )}
    </div>
  );
}