"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function TriggerPaymentsButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  async function handleTrigger() {
    setRunning(true);
    setResult(null);

    try {
      const res = await fetch("/api/cron/process-bill-payments", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ ok: true, message: data.message ?? "Payments processed." });
        toast.success(data.message ?? "Payments processed.");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setResult({
          ok: false,
          message: data.error ?? "Something went wrong.",
        });
        toast.error(data.error ?? "Something went wrong.");
      }
    } catch {
      setResult({ ok: false, message: "Network error" });
      toast.error("Network error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-400">
          For Demo Only
        </span>
        <Button
          onClick={handleTrigger}
          disabled={running}
          className="gap-2 border border-yellow-400/30 bg-yellow-400/10 text-xs font-bold uppercase tracking-wider text-yellow-400 hover:bg-yellow-400/20"
          variant="ghost"
        >
          {running ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap size={14} />
              Trigger Payments Now
            </>
          )}
        </Button>
      </div>

      {result && (
        <p
          className={`flex items-center gap-1.5 font-mono text-xs ${
            result.ok ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {result.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {result.message}
        </p>
      )}

      <p className="text-[11px] text-slate-600">
        Added for demo purposes. Manually runs the daily payment processor for
        signed-in users without exposing any client-side secret.
      </p>
    </div>
  );
}
