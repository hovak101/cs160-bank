import ClientLayout from "./client-layout";

export default async function DashboardLayout({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  return <ClientLayout email={email}>{children}</ClientLayout>;
}
