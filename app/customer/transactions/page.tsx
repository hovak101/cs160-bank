import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/auth/login");

	return (
		<main className="p-6">
			<div className="flex items-center gap-3 mb-6">
				<div className="p-2 rounded bg-slate-100 text-slate-800">
					<ArrowLeftRight />
				</div>
				<h1 className="text-2xl font-semibold">Transactions</h1>
			</div>

			<p className="text-sm text-slate-500">Transaction history will appear here.</p>
		</main>
	);
}
