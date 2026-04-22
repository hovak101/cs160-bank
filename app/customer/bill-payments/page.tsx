import { BillPaymentForm } from "@/components/payments/bill-payment-form";
import { BillPaymentList } from "@/components/payments/bill-payment-list";
import { TriggerPaymentsButton } from "@/components/payments/trigger-payments-button";

export default function BillPaymentsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0f172a] p-8 shadow-2xl">
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_-20%,#22d3ee33,transparent_70%)]" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-400">
              Customer Banking
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Automated Bill Payments
            </h1>
            <p className="mt-2 max-w-2xl text-slate-400 leading-relaxed">
              Schedule and manage your recurring bills to ensure seamless payments and maintain perfect financial health.
            </p>
          </div>

          {/* Demo trigger — bottom-right of the header */}
          <div className="shrink-0">
            <TriggerPaymentsButton />
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className="xl:col-span-4">
          <BillPaymentForm />
        </div>
        <div className="xl:col-span-8">
          <BillPaymentList />
        </div>
      </div>
    </div>
  );
}
