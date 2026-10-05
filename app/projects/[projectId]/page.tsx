import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { EnvironmentActions } from "@/app/_components/environment-actions";
import { EnvironmentsTable } from "@/app/_components/environments-table";
import { IntegrationsButton } from "@/app/_components/integrations-button";
import { RefreshControls } from "@/app/_components/refresh-controls";
import { formatBytes, formatCores, formatDateTime, timeAgo } from "@/lib/format";
import { actionsEnabled } from "@/lib/settings";
import { getProjectDetail, type ServiceResources } from "@/lib/upsun/project";
import type { Activity } from "@/lib/upsun/types";

export default function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← All projects
      </Link>
      <Suspense fallback={<div className="h-[40rem] animate-pulse rounded-xl bg-surface" />}>
        <ProjectDetailView params={params} />
      </Suspense>
    </main>
  );
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Unavailable({ what }: { what: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
      {what} not available with this API token&apos;s role.
    </p>
  );
}

async function ProjectDetailView({ params }: { params: PageProps<"/projects/[projectId]">["params"] }) {
  await connection();
  const { projectId } = await params;
  const detail = await getProjectDetail(projectId);
  if (!detail) notFound();

  const { project, organization, environments, production, activities, resources, usage, fetchedAt } = detail;
  const canAct = actionsEnabled();

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.title || project.id}</h1>
          <p className="text-sm text-muted">
            {organization.label} · {project.region} · plan {project.plan} ·{" "}
            <span className="font-mono">{project.id}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IntegrationsButton projectId={project.id} projectTitle={project.title} />
          <a
            href={project.project_ui}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-sm font-medium hover:bg-surface-hover"
          >
            Open in Console ↗
          </a>
          <RefreshControls fetchedAt={fetchedAt} />
        </div>
      </header>

      {production && canAct && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
          <span className="text-sm">
            Production <span className="font-mono">{production.name}</span>
          </span>
          <EnvironmentActions
            projectId={project.id}
            projectTitle={project.title}
            environment={{ id: production.id, name: production.name, type: production.type, status: production.status }}
          />
        </div>
      )}

      <Section title={`Environments (${environments.length})`}>
        <EnvironmentsTable
          rows={environments.map((environment) => ({ project, environment }))}
          now={fetchedAt}
          actions={canAct}
        />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Production resources" aside={<span className="text-xs text-muted">last 24 hours</span>}>
          {resources === null ? <Unavailable what="Resource metrics" /> : <ResourcesTable resources={resources} />}
        </Section>

        <Section title="Usage this billing period">
          {usage === null ? (
            <Unavailable what="Usage data" />
          ) : usage.length === 0 ? (
            <p className="text-sm text-muted">No billable usage reported.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Resource</th>
                    <th className="px-4 py-2.5 text-right font-medium">Current</th>
                    <th className="px-4 py-2.5 text-right font-medium">Daily avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usage.map((g) => (
                    <tr key={g.title}>
                      <td className="px-4 py-2">{g.title}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{g.current_usage_formatted ?? "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{g.daily_average_formatted ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      <Section title="Activity log">
        {activities === null ? (
          <Unavailable what="The activity log" />
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted">No recent activity.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {activities.map((a) => (
              <li key={a.id} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate" title={a.text}>
                  {a.text}
                </span>
                <span className="flex shrink-0 items-baseline gap-3 text-xs text-muted">
                  <ActivityOutcome activity={a} />
                  <span title={formatDateTime(a.created_at)}>{timeAgo(a.created_at, fetchedAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

function ActivityOutcome({ activity }: { activity: Activity }) {
  if (activity.state === "in_progress" || activity.state === "pending")
    return <span className="text-sky-600 dark:text-sky-400">Running {activity.completion_percent}%</span>;
  if (activity.state === "cancelled") return <span>Cancelled</span>;
  if (activity.result === "failure") return <span className="text-red-600 dark:text-red-400">Failed</span>;
  if (activity.result === "success") return <span className="text-emerald-600 dark:text-emerald-400">Success</span>;
  return <span className="capitalize">{activity.state}</span>;
}

function Meter({ value, limit }: { value: number | null; limit: number | null }) {
  const pct = value != null && limit ? Math.min(100, (value / limit) * 100) : null;
  if (pct == null) return null;
  const color = pct > 85 ? "bg-red-500" : pct > 65 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="mt-1 h-1.5 w-full rounded-full bg-surface-hover" title={`${pct.toFixed(0)}% of limit`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ResourcesTable({ resources }: { resources: ServiceResources[] }) {
  if (!resources.length) return <p className="text-sm text-muted">No metrics reported for this period.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs text-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">Service</th>
            <th className="px-4 py-2.5 font-medium">CPU avg / max / limit</th>
            <th className="px-4 py-2.5 font-medium">Memory avg / max / limit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {resources.map((r) => (
            <tr key={r.service}>
              <td className="px-4 py-2.5">
                <span className="font-mono">{r.service}</span>
                {r.instances > 1 && <span className="text-xs text-muted"> ×{r.instances}</span>}
              </td>
              <td className="px-4 py-2.5 tabular-nums">
                {formatCores(r.cpuAvg)} / {formatCores(r.cpuMax)} / {formatCores(r.cpuLimit)}
                <Meter value={r.cpuMax} limit={r.cpuLimit} />
              </td>
              <td className="px-4 py-2.5 tabular-nums">
                {formatBytes(r.memoryAvg)} / {formatBytes(r.memoryMax)} / {formatBytes(r.memoryLimit)}
                <Meter value={r.memoryMax} limit={r.memoryLimit} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
