import Link from "next/link";
import { connection } from "next/server";

import { UpsunAuthError, UpsunConfigError } from "@/lib/upsun/auth";
import { getDashboardData, type Health } from "@/lib/upsun/dashboard";
import { actionsEnabled } from "@/lib/settings";

import { HEALTH_META } from "./health-badge";
import { ProjectCard } from "./project-card";
import { RefreshControls } from "./refresh-controls";

const HEALTH_ORDER: Health[] = ["failing", "deploying", "unknown", "healthy", "inactive"];

export async function Dashboard() {
  // Always render at request time: live data, and the token is read at runtime.
  await connection();

  let data;
  try {
    data = await getDashboardData();
  } catch (err) {
    // Setup problems are safe to show verbatim; anything else goes to error.tsx.
    if (err instanceof UpsunConfigError || err instanceof UpsunAuthError) {
      return <SetupNotice message={err.message} />;
    }
    throw err;
  }

  const { projects, organizations, fetchedAt } = data;
  const canAct = actionsEnabled();
  const activeEnvironments = projects.reduce((sum, p) => sum + p.activeEnvironmentCount, 0);
  const counts = Object.fromEntries(
    HEALTH_ORDER.map((h) => [h, projects.filter((p) => p.health === h).length]),
  ) as Record<Health, number>;

  // Problems first so they're seen at a glance.
  const sorted = [...projects].sort(
    (a, b) => HEALTH_ORDER.indexOf(a.health) - HEALTH_ORDER.indexOf(b.health),
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-muted">
          {projects.length} projects across {organizations.length}{" "}
          {organizations.length === 1 ? "organization" : "organizations"} ·{" "}
          <Link href="/environments" className="text-foreground hover:underline">
            {activeEnvironments} active environments →
          </Link>
        </p>
        <RefreshControls fetchedAt={fetchedAt} />
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {HEALTH_ORDER.map((h) => (
          <div key={h} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className={`size-2 rounded-full ${HEALTH_META[h].dot}`} />
              {HEALTH_META[h].label}
            </div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">{counts[h]}</div>
          </div>
        ))}
      </section>

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
          No projects found for this API token.
        </p>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((p) => (
            <ProjectCard key={p.project.id} overview={p} now={fetchedAt} actions={canAct} />
          ))}
        </section>
      )}
    </>
  );
}

function SetupNotice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-6">
      <h2 className="font-semibold">Connect to Upsun</h2>
      <p className="mt-2 text-sm">{message}</p>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">
        <li>
          Create an API token in the Upsun Console under <strong>My profile → API tokens</strong>.
        </li>
        <li>
          Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env.local</code>{" "}
          and set <code className="font-mono">UPSUN_API_TOKEN</code>.
        </li>
        <li>Restart the dev server.</li>
      </ol>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading projects">
      <div className="h-5 w-64 rounded bg-surface" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-20 rounded-xl bg-surface" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-72 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
