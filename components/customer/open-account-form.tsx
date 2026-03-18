"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function OpenAccountForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      account_name: formData.get("account_name"),
      account_type: formData.get("account_type"),
      currency: "USD", // You can add a select for this later
    };

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsOpen(false);
        router.refresh(); // Refreshes the server component data
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create account");
      }
    } catch (err) {
      console.error("Submission error:", err);
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
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setIsOpen(false)} className="absolute right-6 top-6 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            
            <h2 className="text-2xl font-bold text-slate-900">New Account</h2>
            <p className="text-slate-500 mb-6 text-sm">Fill in the details to open a new account.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Account Nickname</label>
                <input 
                  name="account_name" 
                  placeholder="e.g. My Savings"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Account Type</label>
                <select 
                  name="account_type" 
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-teal"
                  required
                >
                  <option value="Checking Account">Checking Account</option>
                  <option value="Savings Account">Savings Account</option>
                </select>
              </div>

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