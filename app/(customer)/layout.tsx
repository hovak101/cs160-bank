import BankShell from "@/components/bank-shell";

export default function BankLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="min-h-screen bg-slate-50"><BankShell>{children}</BankShell></main>;
}