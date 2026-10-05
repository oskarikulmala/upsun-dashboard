"use client";

import { useEffect } from "react";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16">
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6">
        <h2 className="font-semibold">Could not load data from Upsun</h2>
        <p className="mt-2 text-sm">{error.message}</p>
        {error.digest && <p className="mt-1 font-mono text-xs text-muted">Ref: {error.digest}</p>}
        <button
          type="button"
          onClick={() => retry()}
          className="mt-4 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-hover"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
