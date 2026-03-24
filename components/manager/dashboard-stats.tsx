import { createClient } from "@/lib/supabase/server";
import { StatsCard } from "./stats-card";
import {
  Users,
  DollarSign,
  TrendingUp,
  CreditCard,
  BarChart3,
} from "lucide-react";

export async function ManagerDashboardStats() {
  const supabase = await createClient();

  // Fetch total number of accounts
  const { count: totalAccounts } = await supabase
    .from("accounts")
    .select("*", { count: "exact", head: true });

  // Fetch total balance across all accounts
  const { data: accountBalances } = await supabase
    .from("accounts")
    .select("balance");

  const totalBalance =
    accountBalances?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

  // Fetch number of customers
  const { count: totalCustomers } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });
      
  const accountsRes = await supabase
  .from("accounts")
  .select("*", { count: "exact" });

console.log("accountsRes", accountsRes);

  // Fetch transactions from the past month
  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  
  const { data: recentTransactions, count: totalTransactionsThisMonth } =
    await supabase
      .from("transactions")
      .select("amount", { count: "exact" })
      .eq("status", "completed")
      .gte("executed_at", oneMonthAgo.toISOString());

  const transactionVolumeThisMonth =
    recentTransactions?.reduce((sum, txn) => sum + (txn.amount || 0), 0) || 0;

  // Fetch transactions from the previous month for comparison
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
  
  const { data: previousTransactions } = await supabase
    .from("transactions")
    .select("amount")
    .eq("status", "completed")
    .gte("executed_at", twoMonthsAgo.toISOString())
    .lt("executed_at", oneMonthAgo.toISOString());

  const transactionVolumePreviousMonth =
    previousTransactions?.reduce((sum, txn) => sum + (txn.amount || 0), 0) || 0;

  const transactionTrendPercent =
    transactionVolumePreviousMonth > 0
      ? Math.round(
          ((transactionVolumeThisMonth - transactionVolumePreviousMonth) /
            transactionVolumePreviousMonth) *
            100
        )
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <StatsCard
        title="Total Customers"
        value={totalCustomers || 0}
        description="Active customer accounts"
        icon={Users}
      />
      <StatsCard
        title="Total Accounts"
        value={totalAccounts || 0}
        description="All account types combined"
        icon={CreditCard}
      />
      <StatsCard
        title="Total Assets"
        value={`$${(totalBalance / 100).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`}
        description="Combined balance across all accounts"
        icon={DollarSign}
      />
      <StatsCard
        title="Transaction Volume (This Month)"
        value={`$${(transactionVolumeThisMonth / 100).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`}
        description={`${totalTransactionsThisMonth || 0} completed transactions`}
        icon={TrendingUp}
        trend={{
          value: Math.abs(transactionTrendPercent),
          isPositive: transactionTrendPercent >= 0,
        }}
      />
      <StatsCard
        title="Average Account Balance"
        value={`$${(
          (totalBalance / 100) /
          (totalAccounts || 1)
        ).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`}
        description="Per account average"
        icon={BarChart3}
      />
    </div>
  );
}
