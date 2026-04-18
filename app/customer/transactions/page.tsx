import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ReceiptText,
} from "lucide-react";

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

type TransactionQueryResult = {
  data: Transaction[];
  error: null;
};

export default async function CustomerTransactionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("customer_id, first_name, last_name, phone_number")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!customer) redirect("/customer/onboarding");

  const currentPhoneDigits = normalizePhone(customer.phone_number);

  const { data: accountsData } = await supabase
    .from("accounts")
    .select("account_id, account_name, account_number")
    .eq("customer_id", customer.customer_id);

  const accounts: Account[] = accountsData ?? [];
  const accountIds = accounts.map((account) => account.account_id);

  let transactions: Transaction[] = [];

  const accountOrQuery =
    accountIds.length > 0
      ? accountIds
          .map(
            (id) =>
              `source_account_id.eq.${id},destination_account_id.eq.${id}`
          )
          .join(",")
      : "";

  const accountTxPromise =
    accountOrQuery.length > 0
      ? supabase
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
          .or(accountOrQuery)
          .order("executed_at", { ascending: false })
      : Promise.resolve<TransactionQueryResult>({ data: [], error: null });

  const incomingCashboxPromise = currentPhoneDigits
    ? supabase
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
        .eq("transaction_type", "cashbox_send")
        .ilike("description", `%${currentPhoneDigits}%`)
        .order("executed_at", { ascending: false })
      : Promise.resolve<TransactionQueryResult>({ data: [], error: null });

  const [accountTxResult, incomingCashboxResult] = await Promise.all([
    accountTxPromise,
    incomingCashboxPromise,
  ]);

  const mergedMap = new Map<string, Transaction>();

  for (const tx of accountTxResult.data ?? []) {
    mergedMap.set(tx.transaction_id, {
      transaction_id: tx.transaction_id,
      reference_number: tx.reference_number ?? null,
      source_account_id: tx.source_account_id,
      destination_account_id: tx.destination_account_id,
      amount: Number(tx.amount ?? 0),
      transaction_type: tx.transaction_type,
      status: tx.status,
      description: tx.description,
      executed_at: tx.executed_at,
    });
  }

  for (const tx of incomingCashboxResult.data ?? []) {
    mergedMap.set(tx.transaction_id, {
      transaction_id: tx.transaction_id,
      reference_number: tx.reference_number ?? null,
      source_account_id: tx.source_account_id,
      destination_account_id: tx.destination_account_id,
      amount: Number(tx.amount ?? 0),
      transaction_type: tx.transaction_type,
      status: tx.status,
      description: tx.description,
      executed_at: tx.executed_at,
    });
  }

  transactions = Array.from(mergedMap.values()).sort((a, b) => {
    const aTime = a.executed_at ? new Date(a.executed_at).getTime() : 0;
    const bTime = b.executed_at ? new Date(b.executed_at).getTime() : 0;
    return bTime - aTime;
  });

  const accountMap = new Map(
    accounts.map((account) => [account.account_id, account] as const)
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
            Review your deposits, withdrawals, transfers, CashBox activity, and
            recent account history.
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
            withdrawal, transfer, or CashBox transaction.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0f172a]">
          <div className="border-b border-white/10 px-6 py-5">
            <h2 className="text-xl font-bold text-white">Transaction History</h2>
            <p className="mt-1 text-sm text-slate-400">
              Showing {transactions.length} transaction
              {transactions.length > 1 ? "s" : ""}.
            </p>
          </div>

          <div className="divide-y divide-white/10">
            {transactions.map((tx) => {
              const meta = getTransactionMeta(
                tx,
                accountMap,
                currentPhoneDigits
              );
              const icon = getTransactionIcon(meta.direction);
              const amountPrefix =
                meta.direction === "incoming"
                  ? "+"
                  : meta.direction === "outgoing"
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
                      <p className="text-base font-semibold text-white">
                        {meta.title}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {meta.subtitle}
                      </p>

                      <div className="mt-2 space-y-1 text-xs text-slate-500">
                        <p>Ref: {tx.reference_number || "N/A"}</p>
                        <p>From: {meta.fromLabel}</p>
                        <p>To: {meta.toLabel}</p>
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
                    <p
                      className={`mt-1 text-sm font-semibold capitalize ${getStatusColor(
                        tx.status
                      )}`}
                    >
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

function normalizePhone(phone: string | null) {
  return (phone ?? "").replace(/\D/g, "");
}

function formatPhone(phone: string | null) {
  if (!phone) return "N/A";

  const digits = normalizePhone(phone);

  if (digits.length !== 10) return phone;

  return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function parseCashboxDescription(description: string | null) {
  const text = description ?? "";

  let match = text.match(
    /(?:sent|cashbox)\s+from\s+(\d{10})\s+to\s+(\d{10})/i
  );
  if (match) {
    return {
      senderPhone: match[1],
      receiverPhone: match[2],
    };
  }

  match = text.match(/sent\s+to\s+cashbox\s*\(?(\d{10})\)?/i);
  if (match) {
    return {
      senderPhone: null,
      receiverPhone: match[1],
    };
  }

  const phones = text.match(/\b\d{10}\b/g) ?? [];
  return {
    senderPhone: phones[0] ?? null,
    receiverPhone: phones[1] ?? phones[0] ?? null,
  };
}

function getAccountLabel(
  accountId: string | null,
  accountMap: Map<string, Account>
) {
  if (!accountId) return null;
  const account = accountMap.get(accountId);
  if (!account) return null;
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

function getTransactionIcon(direction: "incoming" | "outgoing" | "internal") {
  if (direction === "incoming") {
    return <ArrowDownLeft size={20} />;
  }

  if (direction === "outgoing") {
    return <ArrowUpRight size={20} />;
  }

  return <ArrowLeftRight size={20} />;
}

function getTransactionMeta(
  tx: Transaction,
  accountMap: Map<string, Account>,
  currentPhoneDigits: string
) {
  const sourceOwned = !!(
    tx.source_account_id && accountMap.has(tx.source_account_id)
  );
  const destinationOwned = !!(
    tx.destination_account_id && accountMap.has(tx.destination_account_id)
  );

  const sourceLabel = getAccountLabel(tx.source_account_id, accountMap);
  const destinationLabel = getAccountLabel(tx.destination_account_id, accountMap);
  const normalizedType = (tx.transaction_type || "").toLowerCase();
  const parsed = parseCashboxDescription(tx.description);

  if (normalizedType === "cashbox_send") {
    const isIncomingCashbox =
      !!currentPhoneDigits &&
      normalizePhone(parsed.receiverPhone) === currentPhoneDigits &&
      !sourceOwned;

    if (isIncomingCashbox) {
      return {
        direction: "incoming" as const,
        title: "Received in CashBox",
        subtitle: `Received from ${formatPhone(parsed.senderPhone)}`,
        fromLabel: formatPhone(parsed.senderPhone),
        toLabel: "Your CashBox",
      };
    }

    return {
      direction: "outgoing" as const,
      title: "Sent to CashBox",
      subtitle: `Sent to ${formatPhone(parsed.receiverPhone)}`,
      fromLabel: sourceLabel || formatPhone(parsed.senderPhone) || "Your CashBox",
      toLabel: formatPhone(parsed.receiverPhone),
    };
  }

  if (normalizedType === "cashbox_withdraw") {
    return {
      direction: "incoming" as const,
      title: "Withdraw from CashBox",
      subtitle: `Moved from CashBox to ${destinationLabel || "your account"}`,
      fromLabel: "Your CashBox",
      toLabel: destinationLabel || "Your account",
    };
  }

  if (normalizedType === "deposit") {
    return {
      direction: "incoming" as const,
      title: "Deposit",
      subtitle: tx.description || "Deposit completed",
      fromLabel: "External Source",
      toLabel: destinationLabel || "Your account",
    };
  }

  if (normalizedType === "withdraw" || normalizedType === "withdrawal") {
    return {
      direction: "outgoing" as const,
      title: "Withdrawal",
      subtitle: tx.description || "Withdrawal completed",
      fromLabel: sourceLabel || "Your account",
      toLabel: "External / Cash",
    };
  }

  if (normalizedType === "credit_payment") {
    return {
      direction: "internal" as const,
      title: "Credit Card Payment",
      subtitle: tx.description || "Payment sent to your card balance",
      fromLabel: sourceLabel || "Deposit account",
      toLabel: destinationLabel || "Credit card",
    };
  }

  if (normalizedType === "credit_purchase") {
    return {
      direction: "outgoing" as const,
      title: "Credit Card Purchase",
      subtitle: tx.description || "Card purchase posted",
      fromLabel: sourceLabel || "Credit card",
      toLabel: "Merchant",
    };
  }

  if (normalizedType === "fee") {
    return {
      direction: "outgoing" as const,
      title: "Fee Charged",
      subtitle: tx.description || "Bank fee posted",
      fromLabel: sourceLabel || "Account",
      toLabel: "Bank",
    };
  }

  if (normalizedType === "interest") {
    return {
      direction: "incoming" as const,
      title: "Interest Credit",
      subtitle: tx.description || "Interest credited",
      fromLabel: "Bank",
      toLabel: destinationLabel || "Your account",
    };
  }

  if (sourceOwned && destinationOwned) {
    return {
      direction: "internal" as const,
      title: "Internal Transfer",
      subtitle: tx.description || "Transfer between your accounts",
      fromLabel: sourceLabel || "Your account",
      toLabel: destinationLabel || "Your account",
    };
  }

  if (destinationOwned) {
    return {
      direction: "incoming" as const,
      title: "Incoming Transfer",
      subtitle: tx.description || "Money received",
      fromLabel: sourceLabel || "External Source",
      toLabel: destinationLabel || "Your account",
    };
  }

  if (sourceOwned) {
    return {
      direction: "outgoing" as const,
      title: "Outgoing Transfer",
      subtitle: tx.description || "Money sent",
      fromLabel: sourceLabel || "Your account",
      toLabel: "External Destination",
    };
  }

  return {
    direction: "internal" as const,
    title: formatTransactionType(tx.transaction_type),
    subtitle: tx.description || "Transaction",
    fromLabel: sourceLabel || "External Source",
    toLabel: destinationLabel || "External Destination",
  };
}

function formatTransactionType(type: string | null) {
  const normalized = (type || "").toLowerCase();

  switch (normalized) {
    case "cashbox_send":
      return "CashBox Send";
    case "cashbox_withdraw":
      return "CashBox Withdraw";
    case "bill_payment":
      return "Bill Payment";
    case "deposit":
      return "Deposit";
    case "withdraw":
    case "withdrawal":
      return "Withdrawal";
    case "credit_payment":
      return "Credit Card Payment";
    case "credit_purchase":
      return "Credit Card Purchase";
    case "loan_disbursement":
      return "Loan Disbursement";
    case "loan_payment":
      return "Loan Payment";
    case "fee":
      return "Fee";
    case "interest":
      return "Interest Credit";
    case "transfer":
      return "Transfer";
    default:
      if (!type) return "Transaction";
      return type
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
  }
}
