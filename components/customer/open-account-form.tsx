"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  isValidSecurityCodeFormat,
  normalizeSecurityCode,
} from "@/lib/banking/security-code";

const ACCOUNT_OPTIONS = [
  {
    value: "Checking Account",
    title: "Checking Account",
    description: "Everyday spending account with flexible deposits and withdrawals.",
  },
  {
    value: "Savings Account",
    title: "Savings Account",
    description: "Earns interest monthly, with withdrawals limited to 10% of the month-opening balance.",
  },
  {
    value: "Credit Card",
    title: "Credit Card",
    description: "Comes with a limit, monthly payment due, rewards, and cash advances with fees.",
  },
] as const;

export function OpenAccountForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>(ACCOUNT_OPTIONS[0].value);
  const [securityCode, setSecurityCode] = useState("");
  const [formError, setFormError] = useState("");
  const router = useRouter();

  const activeOption =
    ACCOUNT_OPTIONS.find((option) => option.value === selectedType) ??
    ACCOUNT_OPTIONS[0];
  const isCreditCard = activeOption.value === "Credit Card";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    if (isCreditCard && !isValidSecurityCodeFormat(securityCode)) {
      setFormError("Credit cards require a valid 3-digit security code.");
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      account_name: formData.get("account_name"),
      account_type: formData.get("account_type"),
      currency: "USD",
      security_code: isCreditCard ? securityCode : undefined,
    };

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsOpen(false);
        setSecurityCode("");
        setFormError("");
        router.refresh();
      } else {
        const error = await res.json();
        setFormError(error.error || "Failed to create account.");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setFormError("Something went wrong while opening the account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-slate-900 hover:bg-slate-800 text-white gap-2 rounded-xl"
      >
        <Plus size={18} /> Open New Account
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-8 text-slate-900 shadow-2xl animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold text-slate-900">Open a New Product</h2>
            <p className="text-slate-500 mb-6 text-sm">
              Choose the account type you want to add to your banking profile.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Account Nickname
                </label>
                <input
                  name="account_name"
                  placeholder="e.g. Daily Bills, Emergency Savings, Travel Card"
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Account Type
                </label>
                <select
                  name="account_type"
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setFormError("");

                    if (e.target.value !== "Credit Card") {
                      setSecurityCode("");
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  required
                >
                  {ACCOUNT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {activeOption.title}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {activeOption.description}
                </p>
              </div>

              {isCreditCard ? (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      Security Code
                    </label>
                    <input
                      name="security_code"
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={3}
                      value={securityCode}
                      onChange={(e) => {
                        setSecurityCode(normalizeSecurityCode(e.target.value));
                        setFormError("");
                      }}
                      placeholder="3-digit code"
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none placeholder:text-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                      required
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      This demo now requires a 3-digit security code for credit
                      card purchases and cash advances. In the production app,
                      changing or resetting this code will move to a verified
                      email flow.
                    </p>
                  </div>
                </div>
              ) : null}

              {formError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 rounded-xl mt-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Confirm & Open"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
