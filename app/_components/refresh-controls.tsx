"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

const AUTO_REFRESH_MS = 60_000;

export function RefreshControls({ fetchedAt }: { fetchedAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") startTransition(() => router.refresh());
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="flex items-center gap-3 text-sm text-muted">
      <span suppressHydrationWarning>
        Updated {new Date(fetchedAt).toLocaleTimeString("en-GB", { timeStyle: "short" })}
      </span>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        className="rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-foreground transition hover:bg-surface-hover disabled:opacity-60"
      >
        {pending ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}
