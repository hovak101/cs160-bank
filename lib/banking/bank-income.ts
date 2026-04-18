import { supabaseAdmin } from "@/lib/supabase/admin";

export type BankIncomeCategory = "fee" | "interest_charge";

export type BankIncomeSourceTransaction = {
  transaction_id?: string | null;
  source_account_id?: string | null;
  reference_number?: string | null;
  amount?: number | null;
  transaction_type?: string | null;
  description?: string | null;
  executed_at?: string | null;
  status?: string | null;
};

export function resolveBankIncomeCategory(
  transaction: Pick<BankIncomeSourceTransaction, "transaction_type" | "description">
): BankIncomeCategory | null {
  const type = String(transaction.transaction_type || "").trim().toLowerCase();
  const description = String(transaction.description || "").trim().toLowerCase();

  if (type === "fee") {
    return "fee";
  }

  if (type === "interest" && description.includes("charge") && !description.includes("credit")) {
    return "interest_charge";
  }

  return null;
}

export async function recordBankIncomeTransactions(
  transactions: BankIncomeSourceTransaction[]
) {
  const rows = transactions.flatMap((transaction) => {
    const category = resolveBankIncomeCategory(transaction);
    const transactionId = transaction.transaction_id ?? null;

    if (!category || !transactionId) {
      return [];
    }

    return [
      {
        source_transaction_id: transactionId,
        source_account_id: transaction.source_account_id ?? null,
        reference_number: transaction.reference_number ?? null,
        income_category: category,
        amount: Number(transaction.amount || 0),
        description: transaction.description ?? null,
        recognized_at: transaction.executed_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  });

  if (rows.length === 0) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any)
    .from("bank_income")
    .upsert(rows, { onConflict: "source_transaction_id" });

  if (error) {
    throw new Error(error.message || "Failed to record bank income.");
  }
}
