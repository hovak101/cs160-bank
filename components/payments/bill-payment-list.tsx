"use client";

import { useEffect, useState } from "react";
import { Trash2, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type PaymentExecutionSummary = {
  status: string | null;
  failure_reason: string | null;
};

type BillPaymentSchedule = {
  schedule_id: string;
  nickname: string | null;
  frequency: string | null;
  next_payment_date: string | null;
  status: string | null;
  amount: number;
  last_execution: PaymentExecutionSummary | null;
};

export function BillPaymentList() {
  const [schedules, setSchedules] = useState<BillPaymentSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bill-payments")
      .then((res) => res.json())
      .then((data) => {
        setSchedules(data.schedules || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load schedules");
        setLoading(false);
      });
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to cancel this payment schedule?")) return;

    try {
      const res = await fetch(`/api/bill-payments/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSchedules((prev) =>
          prev.map((schedule) =>
            schedule.schedule_id === id
              ? { ...schedule, status: "cancelled" }
              : schedule
          )
        );
        toast.success("Schedule cancelled");
      } else {
        throw new Error("Failed to delete");
      }
    } catch {
      toast.error("Could not cancel schedule");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-20">
        <Loader2 className="animate-spin text-cyan-400" size={40} />
        <p className="animate-pulse font-mono text-slate-400">
          RETRIEVING ENCRYPTED DATA...
        </p>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-white/10 bg-white/5 text-white shadow-[0_0_40px_-8px_rgba(34,211,238,0.15)]">
      <CardHeader className="border-b border-white/5">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="text-cyan-400" size={20} />
          Bill Payment Schedules
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4 text-left">Label</th>
                <th className="px-6 py-4 text-left">Frequency</th>
                <th className="px-6 py-4 text-left">Next Payment</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {schedules.map((schedule) => (
                <tr
                  key={schedule.schedule_id}
                  className="group transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4">
                    <p className="max-w-[18rem] break-words font-semibold text-slate-100">
                      {schedule.nickname}
                    </p>
                    <p className="text-[10px] font-mono uppercase text-slate-500">
                      Schedule ID: {schedule.schedule_id}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-bold uppercase text-cyan-400">
                      {schedule.frequency}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">
                    {schedule.next_payment_date ?? "-"}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white">
                      {schedule.status}
                    </p>
                    <p className="mt-1 max-w-[14rem] break-words text-[11px] text-slate-400">
                      {formatExecutionStatus(schedule.last_execution)}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold tabular-nums text-cyan-400">
                    {formatCurrency(schedule.amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={schedule.status !== "active"}
                      onClick={() => handleDelete(schedule.schedule_id)}
                      className="text-slate-500 transition-all hover:bg-red-400/10 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
              {schedules.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <p className="italic text-slate-500">
                      No automated payments scheduled.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function formatExecutionStatus(lastExecution: PaymentExecutionSummary | null) {
  if (!lastExecution) {
    return "No payment attempts yet.";
  }

  if (lastExecution.status === "failed") {
    return `Last attempt failed: ${String(
      lastExecution.failure_reason ?? "unknown_error"
    )
      .replace(/_/g, " ")
      .trim()}`;
  }

  return "Last payment completed successfully.";
}

function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}
