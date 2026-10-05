import { connection } from "next/server";
import { Suspense } from "react";

import { getOrganizationCosts, type OrganizationCosts } from "@/lib/upsun/costs";

export const metadata = { title: "Costs · Upsun Dashboard" };

export default function CostsPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Costs</h1>
        <p className="text-sm text-muted">Estimated spend for the current billing period, per organization</p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}>
        <CostsList />
      </Suspense>
    </main>
  );
}

async function CostsList() {
  await connection();
  const orgs = await getOrganizationCosts();
  if (!orgs.length) return <p className="text-muted">No organizations found for this API token.</p>;
  return orgs.map((o) => <OrganizationCostsCard key={o.organization.id} costs={o} />);
}

function Tile({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="rounded-lg bg-background/60 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value || "—"}</div>
    </div>
  );
}

function OrganizationCostsCard({ costs }: { costs: OrganizationCosts }) {
  const { organization, estimate, error } = costs;
  const subscriptions = [...(estimate?.subscriptions?.list ?? [])].sort(
    (a, b) => parseFloat(b.total.replace(/[^\d.]/g, "")) - parseFloat(a.total.replace(/[^\d.]/g, "")),
  );

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{organization.label}</h2>
        <span className="font-mono text-xs text-muted">{organization.name}</span>
      </header>

      {error ? (
        <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">{error}</p>
      ) : !estimate ? (
        <p className="text-sm text-muted">Billing data is not available with this API token&apos;s role.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="Estimated total" value={estimate.total} />
            <Tile label="Projects" value={estimate.subscriptions?.total} />
            <Tile label="User licenses" value={estimate.user_licenses?.base?.total} />
            <Tile label="Support" value={estimate.support_level} />
          </div>

          {subscriptions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="border-b border-border text-xs text-muted">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Project</th>
                    <th className="px-4 py-2 text-right font-medium">CPU</th>
                    <th className="px-4 py-2 text-right font-medium">Memory</th>
                    <th className="px-4 py-2 text-right font-medium">Storage</th>
                    <th className="px-4 py-2 text-right font-medium">Environments</th>
                    <th className="py-2 pl-4 text-right font-medium">Estimate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subscriptions.map((s) => (
                    <tr key={s.license_id}>
                      <td className="py-2 pr-4">{s.project_title}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{s.usage?.cpu ?? "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{s.usage?.memory ?? "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{s.usage?.storage ?? "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{s.usage?.environments ?? "—"}</td>
                      <td className="py-2 pl-4 text-right font-medium tabular-nums">{s.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
