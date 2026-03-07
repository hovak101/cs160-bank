import { TransactionsList } from "@/components/transactions-list";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-slate-500">
          View your account transaction history.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <TransactionsList />
      </div>
    </div>
  );
}