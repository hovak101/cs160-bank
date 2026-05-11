"use client";

import React, { useEffect, useState } from "react";
import { Trash2, Loader2, Calendar, AlertTriangle } from "lucide-react";
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
              {schedules.map((schedule) => {
                const isCancelledDueToFailure =
                  schedule.status === "cancelled" &&
                  schedule.last_execution?.status === "failed";
                const failureMessage = isCancelledDueToFailure
                  ? formatFailureReason(schedule.last_execution?.failure_reason ?? null)
                  : null;

                return (
                  <React.Fragment key={schedule.schedule_id}>
                    <tr
                      key={schedule.schedule_id}
                      className={`group transition-colors ${
                        isCancelledDueToFailure
                          ? "bg-red-500/5 hover:bg-red-500/10"
                          : "hover:bg-white/[0.02]"
                      }`}
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
                        <p
                          className={`text-xs font-semibold uppercase tracking-wide ${
                            schedule.last_execution?.status === "failed" || schedule.status === "cancelled" ? "text-red-400" : "text-white"
                          }`}
                        >
                          {schedule.last_execution?.status === "failed" || schedule.status === "cancelled" ? "failed" : schedule.status}
                        </p>
                        <p className="mt-1 max-w-[14rem] break-words text-[11px] text-slate-400">
                          {formatExecutionStatus(schedule)}
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
                    {isCancelledDueToFailure && failureMessage && (
                      <tr
                        key={`${schedule.schedule_id}-error`}
                        className="bg-red-500/5"
                      >
                        <td colSpan={6} className="px-6 pb-4 pt-0">
                          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                            <AlertTriangle
                              size={14}
                              className="mt-0.5 shrink-0 text-red-400"
                            />
                            <p className="text-xs text-red-300">
                              <span className="font-bold">Payment failed: </span>
                              {failureMessage} This schedule has been cancelled and no funds were transferred. Please review your account and set up a new payment schedule if needed.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
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

function formatExecutionStatus(schedule: BillPaymentSchedule) {
  const { status, last_execution } = schedule;

  if (last_execution?.status === "failed") {
    switch (last_execution.failure_reason) {
      case "source_account_inactive":
        return "Last attempt failed: account has closed";
      case "insufficient_funds":
        return "Last attempt failed: insufficient funds";
      case "payee_account_inactive":
        return "Last attempt failed: payee account is closed";
      default:
        return `Last attempt failed: ${String(last_execution.failure_reason ?? "unknown error").replace(/_/g, " ").trim()}`;
    }
  }

  if (status === "cancelled") {
    return "Last attempt failed: account has closed";
  }

  if (!last_execution) {
    return "No payment attempts yet.";
  }

  return "Last payment completed successfully.";
}

function formatFailureReason(reason: string | null): string {
  switch (reason) {
    case "source_account_inactive":
      return "The source account is closed or inactive.";
    case "payee_account_inactive":
      return "The payee account is closed or inactive.";
    case "insufficient_funds":
      return "Insufficient funds in the source account.";
    case "invalid_schedule":
      return "The payment schedule was missing required fields.";
    default:
      return reason ? reason.replace(/_/g, " ") : "An unknown error occurred.";
  }
}

function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}
