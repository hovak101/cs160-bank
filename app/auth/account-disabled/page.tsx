interface AccountDisabledPageProps {
  searchParams: Promise<{
    reason?: string;
    until?: string;
    type?: string;
  }>;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AccountDisabledPage({
  searchParams,
}: AccountDisabledPageProps) {
  const params = await searchParams;
  const reason = params.reason || "Your account has been disabled.";
  const until = params.until;
  const type = params.type || "disabled";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020b1d] px-4 text-white">
      <div className="w-full max-w-xl rounded-[32px] border border-red-500/20 bg-[#081328] p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">
          Account Restricted
        </p>

        <h1 className="mt-3 text-4xl font-bold">
          {type === "locked" ? "Account Locked" : "Account Disabled"}
        </h1>

        <p className="mt-4 text-slate-300">
          Your account is currently unavailable. Please review the status below.
        </p>

        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
          <p className="text-sm uppercase tracking-wide text-red-200">Reason</p>
          <p className="mt-2 text-lg font-semibold text-white">{reason}</p>
        </div>

        {until ? (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
            <p className="text-sm uppercase tracking-wide text-amber-200">
              Available Again
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {formatDateTime(until)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}