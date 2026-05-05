import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TransferWorkspace } from "@/components/transfer-workspace";

export const dynamic = "force-dynamic";

type TransfersPageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

export default async function TransfersPage({
  searchParams,
}: TransfersPageProps) {
  const supabase = await createClient();
  const params = await searchParams;

  type CashboxRow = {
    cashbox_id: string;
    balance: number;
  };
  type CashboxMutationResult = {
    data: CashboxRow | null;
    error: { message: string } | null;
  };
  type CashboxClient = {
    from: (table: "cashboxes") => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<CashboxMutationResult>;
        };
      };
      insert: (values: { customer_id: string; balance: number }) => {
        select: (columns: string) => {
          single: () => Promise<CashboxMutationResult>;
        };
      };
    };
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!customer) redirect("/auth/onboarding");

  const { data: accounts } = await supabase
    .from("accounts")
    .select(
      "account_id, account_name, account_number, account_type, balance, currency, status"
    )
    .eq("customer_id", customer.customer_id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  let cashbox: CashboxRow | null = null;

  const cashboxClient = supabase as unknown as CashboxClient;

  const { data: cashboxData } = await cashboxClient
    .from("cashboxes")
    .select("cashbox_id, balance")
    .eq("customer_id", customer.customer_id)
    .maybeSingle();

  cashbox = cashboxData as CashboxRow | null;

  if (!cashbox) {
    const { data: createdCashbox, error: createCashboxError } = await cashboxClient
      .from("cashboxes")
      .insert({
        customer_id: customer.customer_id,
        balance: 0,
      })
      .select("cashbox_id, balance")
      .single();

    if (createCashboxError) {
      throw new Error(createCashboxError.message);
    }

    cashbox = createdCashbox as CashboxRow;
  }

  const isSandboxPlaid =
    (process.env.PLAID_ENV || "sandbox").toLowerCase() === "sandbox";

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0f172a] p-8 shadow-2xl">
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_-20%,#22d3ee33,transparent_70%)]" />
        <div className="relative z-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-400">
            Customer Banking
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Transfer Money
          </h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Move money between your own accounts, use CashBox by phone number, or send funds through linked Plaid accounts from one workspace.
          </p>
        </div>
      </section>

      <TransferWorkspace
        accounts={accounts ?? []}
        cashboxBalance={Number(cashbox?.balance ?? 0)}
        initialMode={params.mode}
        isSandboxDemo={isSandboxPlaid}
      />
    </div>
  );
}
