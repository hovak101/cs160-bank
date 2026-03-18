"use client";

import { useRef, useState, useTransition } from "react";
import {
  Upload,
  Landmark,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type Account = {
  account_id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
};

export function DepositChequeForm({ accounts }: { accounts: Account[] }) {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (selectedFile: File | null) => {
    setError("");
    setMessage("");

    if (!selectedFile) {
      setFile(null);
      setPreviewUrl("");
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!selectedAccount) {
      setError("Please select an account.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    if (!file) {
      setError("Please upload a cheque image.");
      return;
    }

    const formData = new FormData();
    formData.append("account_id", selectedAccount);
    formData.append("amount", amount);
    formData.append("cheque_image", file);

    startTransition(async () => {
      try {
        const res = await fetch("/api/customer/deposit-cheque", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Deposit failed.");
          return;
        }

        setMessage("Cheque deposit completed successfully.");
        setAmount("");
        setSelectedAccount("");
        setFile(null);
        setPreviewUrl("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch {
        setError("Something went wrong while processing the deposit.");
      }
    });
  };

  if (accounts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-[#0f172a] p-8 text-center">
        <h2 className="text-2xl font-bold text-white">No active account found</h2>
        <p className="mt-2 text-slate-400">
          You need to open an account before depositing a cheque.
        </p>
        <a
          href="/customer/accounts"
          className="mt-5 inline-flex rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
        >
          Go to Accounts
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-[#0f172a] p-6"
      >
        <div>
          <h2 className="text-xl font-bold text-white">Deposit Details</h2>
          <p className="mt-1 text-sm text-slate-400">
            Upload your cheque image and choose where the money should go.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Select Account
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
          >
            <option value="">Choose an account</option>
            {accounts.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.account_name} • {account.account_type} • ****
                {account.account_number?.slice(-4)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Amount</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter cheque amount"
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Cheque Image
          </label>
          <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-400/30 bg-slate-950/70 px-6 py-8 text-center hover:border-cyan-400/60">
            <Upload className="mb-3 text-cyan-400" size={28} />
            <p className="font-medium text-white">Click to upload cheque image</p>
            <p className="mt-1 text-sm text-slate-400">PNG, JPG, or JPEG</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300">
            <AlertCircle size={18} className="mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        ) : null}

        {message ? (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
            <CheckCircle2 size={18} className="mt-0.5" />
            <p className="text-sm">{message}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Deposit Cheque"
          )}
        </button>
      </form>

      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
          <h3 className="text-lg font-bold text-white">Preview</h3>
          <p className="mt-1 text-sm text-slate-400">
            Review the uploaded cheque image before submission.
          </p>

          <div className="mt-4 flex min-h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Cheque preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="px-6 text-center">
                <Upload className="mx-auto mb-3 text-slate-500" size={28} />
                <p className="text-slate-400">No cheque image uploaded yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0f172a] p-6">
          <div className="flex items-center gap-3">
            <Landmark className="text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Important Note</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            For this demo, the cheque amount is deposited immediately after
            submission. In a real banking system, cheque deposits should be
            reviewed and verified first.
          </p>
        </div>
      </div>
    </div>
  );
}