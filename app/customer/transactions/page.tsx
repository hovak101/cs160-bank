import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ReceiptText } from "lucide-react";

export const dynamic = "force-dynamic";

type Account = {
  account_id: string;
  account_name: string;
  account_number: string;
};

type Transaction = {
  transaction_id: string;
  reference_number: string | null;
  source_account_id: string | null;
  destination_account_id: string | null;
  amount: number;
  transaction_type: string | null;
  status: string | null;
  description: string | null;
  executed_at: string | null;
};

export default async function CustomerTransactionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("customer_id, first_name, last_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!customer) redirect("/customer/onboarding");

  const { data: accountsData } = await supabase
    .from("accounts")
    .select("account_id, account_name, account_number")
    .eq("customer_id", customer.customer_id);

  const accounts: Account[] = accountsData ?? [];
  const accountIds = accounts.map((account) => account.account_id);

  let transactions: Transaction[] = [];

  if (accountIds.length > 0) {
    const orQuery = accountIds
      .map((id) => `source_account_id.eq.${id},destination_account_id.eq.${id}`)
      .join(",");

    const { data: txData } = await supabase
      .from("transactions")
      .select(`
        transaction_id,
        reference_number,
        source_account_id,
        destination_account_id,
        amount,
        transaction_type,
        status,
        description,
        executed_at
      `)
      .or(orQuery)
      .order("executed_at", { ascending: false });

    transactions = txData ?? [];
  }

  const accountMap = new Map(
    accounts.map((account) => [account.account_id, account])
  );

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0f172a] p-8 shadow-2xl">
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_-20%,#22d3ee33,transparent_70%)]" />
        <div className="relative z-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-400">
            Customer Banking
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Transactions
          </h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Review your deposits, withdrawals, transfers, and recent account activity.
          </p>
        </div>
      </section>

      {transactions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#0f172a] p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400">
            <ReceiptText size={26} />
          </div>
          <h2 className="text-2xl font-bold text-white">No transactions yet</h2>
          <p className="mt-2 text-slate-400">
            Your account activity will appear here once you make a deposit,
            withdrawal, or transfer.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0f172a]">
          <div className="border-b border-white/10 px-6 py-5">
            <h2 className="text-xl font-bold text-white">Transaction History</h2>
            <p className="mt-1 text-sm text-slate-400">
              Showing {transactions.length} transaction{transactions.length > 1 ? "s" : ""}.
            </p>
          </div>

          <div className="divide-y divide-white/10">
            {transactions.map((tx) => {
              const direction = getTransactionDirection(tx, accountMap);
              const icon = getTransactionIcon(tx.transaction_type, direction);
              const amountPrefix =
                direction === "incoming"
                  ? "+"
                  : direction === "outgoing"
                  ? "-"
                  : "";

              return (
                <div
                  key={tx.transaction_id}
                  className="grid gap-4 px-6 py-5 lg:grid-cols-[1.3fr_0.8fr_0.6fr_0.7fr]"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400">
                      {icon}
                    </div>

                    <div className="min-w-0">
                      <p className="text-base font-semibold capitalize text-white">
                        {tx.transaction_type || "Transaction"}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {tx.description || "No description provided"}
                      </p>

                      <div className="mt-2 space-y-1 text-xs text-slate-500">
                        <p>
                          Ref: {tx.reference_number || "N/A"}
                        </p>
                        <p>
                          From: {formatAccountLabel(tx.source_account_id, accountMap)}
                        </p>
                        <p>
                          To: {formatAccountLabel(tx.destination_account_id, accountMap)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-400">Date</p>
                    <p className="mt-1 text-sm text-white">
                      {formatDate(tx.executed_at)}
                    </p>
                  </div>

                  <div className="flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-400">Status</p>
                    <p className={`mt-1 text-sm font-semibold capitalize ${getStatusColor(tx.status)}`}>
                      {tx.status || "unknown"}
                    </p>
                  </div>

                  <div className="flex flex-col justify-center lg:items-end">
                    <p className="text-sm font-medium text-slate-400">Amount</p>
                    <p className="mt-1 text-lg font-bold text-white">
                      {amountPrefix}
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount || 0));
}

function formatDate(value: string | null) {
  if (!value) return "N/A";

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatAccountLabel(
  accountId: string | null,
  accountMap: Map<string, Account>
) {
  if (!accountId) return "External / Cash";

  const account = accountMap.get(accountId);
  if (!account) return "Other account";

  return `${account.account_name} • ****${account.account_number?.slice(-4)}`;
}

function getStatusColor(status: string | null) {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return "text-emerald-400";
    case "pending":
      return "text-amber-400";
    case "failed":
      return "text-red-400";
    default:
      return "text-slate-400";
  }
}

function getTransactionDirection(
  tx: Transaction,
  accountMap: Map<string, Account>
): "incoming" | "outgoing" | "internal" {
  const sourceOwned = !!(tx.source_account_id && accountMap.has(tx.source_account_id));
  const destinationOwned = !!(
    tx.destination_account_id && accountMap.has(tx.destination_account_id)
  );

  if (sourceOwned && destinationOwned) return "internal";
  if (destinationOwned) return "incoming";
  return "outgoing";
}

function getTransactionIcon(
  type: string | null,
  direction: "incoming" | "outgoing" | "internal"
) {
  const normalized = (type || "").toLowerCase();

  if (normalized === "deposit" || direction === "incoming") {
    return <ArrowDownLeft size={20} />;
  }

  if (normalized === "withdrawal" || normalized === "withdraw" || direction === "outgoing") {
    return <ArrowUpRight size={20} />;
  }

  return <ArrowLeftRight size={20} />;
}