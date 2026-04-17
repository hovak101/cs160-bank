"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddManagerFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddManagerForm({ onClose, onSuccess }: AddManagerFormProps) {
  const [email, setEmail] = useState("");
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!first_name.trim()) {
      setError("First name is required");
      return;
    }

    if (!last_name.trim()) {
      setError("Last name is required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/managers/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email: email.trim(),
            first_name: first_name.trim(),
            last_name: last_name.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to add manager");
      }

      toast.success(`Manager ${first_name} ${last_name} created successfully with email ${email}`);
      setEmail("");
      setFirstName("");
      setLastName("");
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#081328] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Add New Manager</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              User Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter user email"
              className="w-full rounded-lg border border-slate-600 bg-[#0b1a33] px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={first_name}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter first name"
              className="w-full rounded-lg border border-slate-600 bg-[#0b1a33] px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={last_name}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter last name"
              className="w-full rounded-lg border border-slate-600 bg-[#0b1a33] px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </span>
              ) : (
                "Add Manager"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-600 bg-[#0b1a33] px-4 py-3 font-semibold text-white transition hover:border-slate-500 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
