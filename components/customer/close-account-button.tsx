"use client";

import { useState } from "react";

export function CloseAccountButton({ accountId, status }: { accountId: string; status: string }) {
  const [loading, setLoading] = useState(false);

  if (status === "closed") return null;

  async function handleCloseAccount() {
    const confirmed = confirm("Are you sure you want to close this account? Cannot undo this");
    if (!confirmed) return;

    setLoading(true);

    const res = await fetch(`/api/accounts/${accountId}/close`, {
      method: "POST",
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
    } else {
      window.location.reload();
    }

    setLoading(false);
  }

  return (
    <button
      onClick={handleCloseAccount}
      disabled={loading}
      className="text-xs text-red-400 hover:text-red-600 font-semibold uppercase tracking-widest disabled:opacity-50"
    >
      {loading ? "Closing..." : "Close Account"}
    </button>
  );
}
