import { Suspense } from "react";

import { Dashboard, DashboardSkeleton } from "./_components/dashboard";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Upsun projects</h1>
        <p className="text-sm text-muted">Production status across all connected projects</p>
      </header>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
