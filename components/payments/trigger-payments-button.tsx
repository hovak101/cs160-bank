"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function TriggerPaymentsButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleTrigger() {
    setRunning(true);
    setResult(null);

    try {
      const res = await fetch("/api/cron/process-bill-payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ ok: true, message: data.message ?? "Payments processed." });
        toast.success(data.message ?? "Payments processed.");
        // Reload after a short delay so the list reflects updated statuses
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setResult({ ok: false, message: data.error ?? "Something went wrong." });
        toast.error(data.error ?? "Something went wrong.");
      }
    } catch (err) {
      setResult({ ok: false, message: "Network error" });
      toast.error("Network error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {/* DEV label */}
        <span className="px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 text-[10px] font-bold uppercase tracking-wider border border-yellow-400/20">
          For Demo Only
        </span>
        <Button
          onClick={handleTrigger}
          disabled={running}
          className="bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 font-bold uppercase tracking-wider text-xs gap-2"
          variant="ghost"
        >
          {running ? (
            <><Loader2 size={14} className="animate-spin" /> Processing...</>
          ) : (
            <><Zap size={14} /> Trigger Payments Now</>
          )}
        </Button>
      </div>

      {result && (
        <p className={`text-xs font-mono flex items-center gap-1.5 ${result.ok ? "text-emerald-400" : "text-red-400"}`}>
          {result.ok
            ? <CheckCircle2 size={12} />
            : <XCircle size={12} />}
          {result.message}
        </p>
      )}

      <p className="text-[11px] text-slate-600">
        Added for demo purposes. Manually runs the daily payment processor, sets a schedule's start date to today.
      </p>
    </div>
  );
}
