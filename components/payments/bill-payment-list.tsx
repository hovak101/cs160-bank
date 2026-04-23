"use client";

import { useEffect, useState } from "react";
import { Trash2, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export function BillPaymentList() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bill-payments")
      .then(res => res.json())
      .then(data => {
        // Updated to match your backend's "schedules" key
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
        // I added this fix of filtering by s.schedule_id instead of s.id 
        setSchedules(prev => prev.filter(s => s.schedule_id !== id));
        toast.success("Schedule cancelled");
      } else {
        throw new Error("Failed to delete");
      }
    } catch (err) {
      toast.error("Could not cancel schedule");
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="animate-spin text-cyan-400" size={40} />
      <p className="text-slate-400 animate-pulse font-mono">RETRIEVING ENCRYPTED DATA...</p>
    </div>
  );

  return (
    <Card className="bg-white/5 border-white/10 text-white shadow-[0_0_40px_-8px_rgba(34,211,238,0.15)] overflow-hidden">
      <CardHeader className="border-b border-white/5">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="text-cyan-400" size={20} />
          Active Payment Schedules
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Label</th>
                <th className="px-6 py-4 text-left">Frequency</th>
                <th className="px-6 py-4 text-left">Next Payment</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {schedules.map((s) => (
                <tr key={s.schedule_id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-100">{s.nickname}</p>
                    <p className="text-[10px] font-mono text-slate-500 uppercase">
                      To account: {s.payee_id}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full bg-cyan-400/10 text-cyan-400 text-[10px] font-bold uppercase">
                      {s.frequency}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                    {s.next_payment_date ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-cyan-400 tabular-nums font-bold">
                    ${parseFloat(s.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(s.schedule_id)}
                      className="text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
              {schedules.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <p className="text-slate-500 italic">No automated payments scheduled.</p>
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
