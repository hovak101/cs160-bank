import { redirect } from "next/navigation";
import DashboardLayout from "@/components/ui/dashboard-layout";
import { IdleLogoutProvider } from "@/components/auth/idle-logout-provider";
import { getAuthenticatedAppContext } from "@/lib/auth/get-authenticated-app-context";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, appUser, customer } = await getAuthenticatedAppContext();

  if (!user) redirect("/auth/login");

  if (appUser?.role !== "customer") redirect("/auth/login");

  const needsOnboarding =
    !customer ||
    !customer.first_name?.trim() ||
    !customer.last_name?.trim();

  if (needsOnboarding) {
    redirect("/auth/onboarding");
  }

  return (
    <IdleLogoutProvider>
      <DashboardLayout email={appUser?.email ?? user.email ?? ""}>
        {children}
      </DashboardLayout>
    </IdleLogoutProvider>
  );
}
