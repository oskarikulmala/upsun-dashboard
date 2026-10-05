import Link from "next/link";

import { formatDateTime, hoursSince, timeAgo } from "@/lib/format";
import type { ProjectOverview } from "@/lib/upsun/dashboard";
import type { Activity } from "@/lib/upsun/types";

import { EnvironmentActions } from "./environment-actions";
import { EnvironmentStatus } from "./environments-table";
import { HealthBadge } from "./health-badge";
import { IntegrationsButton } from "./integrations-button";

// Flag production backups older than this.
const STALE_BACKUP_HOURS = 48;

function ActivityState({ activity }: { activity: Activity }) {
  if (activity.state === "in_progress" || activity.state === "pending") {
    return <span className="text-sky-600 dark:text-sky-400">{activity.completion_percent}%</span>;
  }
  if (activity.result === "failure") return <span className="text-red-600 dark:text-red-400">Failed</span>;
  if (activity.state === "cancelled") return <span className="text-muted">Cancelled</span>;
  return null;
}

function Stat({ label, children, warn }: { label: string; children: React.ReactNode; warn?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`truncate text-sm ${warn ? "text-amber-700 dark:text-amber-400" : ""}`}>{children}</dd>
    </div>
  );
}

export function ProjectCard({
  overview,
  now,
  actions,
}: {
  overview: ProjectOverview;
  now: string;
  actions: boolean;
}) {
  const { project, organization, production, productionUrl, recentActivities, health, error } = overview;
  const deploy = production?.deployment_state;
  const backupAge = hoursSince(production?.last_backup_at, now);
  const latest = recentActivities[0];

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">
            <Link href={`/projects/${project.id}`} className="hover:underline">
              {project.title || project.id}
            </Link>
          </h2>
          <p className="truncate text-xs text-muted">
            {organization.label} · {project.region} · <span className="font-mono">{project.id}</span>
          </p>
        </div>
        <HealthBadge health={health} />
      </header>

      {error ? (
        <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
          Could not load project details: {error}
        </p>
      ) : production ? (
        <>
          <div className="rounded-lg bg-background/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">
                Production · <span className="font-mono">{production.name}</span>
              </span>
              <EnvironmentStatus status={production.status} />
            </div>
            {productionUrl && (
              <a
                href={productionUrl}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm text-sky-700 hover:underline dark:text-sky-400"
              >
                {productionUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Stat label="Last deployment" warn={deploy?.last_deployment_successful === false}>
              <span title={formatDateTime(deploy?.last_deployment_at)}>
                {timeAgo(deploy?.last_deployment_at, now)}
              </span>
              {deploy?.last_deployment_successful === false && " · failed"}
            </Stat>
            <Stat label="Last backup" warn={backupAge === null || backupAge > STALE_BACKUP_HOURS}>
              <span title={formatDateTime(production.last_backup_at)}>
                {production.last_backup_at ? timeAgo(production.last_backup_at, now) : "Never"}
              </span>
            </Stat>
            <Stat label="Environments">
              {overview.activeEnvironmentCount} active / {overview.environmentCount}
            </Stat>
            <Stat label="Head commit">
              <span className="font-mono">{production.head_commit?.slice(0, 7) ?? "—"}</span>
            </Stat>
          </dl>

          {!overview.canViewActivities && (
            <p className="border-t border-border pt-3 text-xs text-muted">
              Activity log not available with this token&apos;s project role.
            </p>
          )}

          {latest && (
            <div className="border-t border-border pt-3">
              <p className="mb-1.5 text-xs text-muted">Recent activity</p>
              <ul className="space-y-1.5">
                {recentActivities.slice(0, 3).map((a) => (
                  <li key={a.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate" title={a.text}>
                      {a.text}
                    </span>
                    <span className="flex shrink-0 gap-2 text-xs text-muted">
                      <ActivityState activity={a} />
                      {timeAgo(a.created_at, now)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted">
          {project.status === "active" ? "No production environment found." : `Project is ${project.status}.`}
        </p>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
        {actions && production && (
          <EnvironmentActions
            projectId={project.id}
            projectTitle={project.title}
            environment={{ id: production.id, name: production.name, type: production.type, status: production.status }}
            compact
          />
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {project.status === "active" && <IntegrationsButton projectId={project.id} projectTitle={project.title} />}
          <a
            href={project.project_ui}
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-2 py-1 text-sm text-muted hover:bg-surface-hover hover:text-foreground"
          >
            Console ↗
          </a>
        </div>
      </footer>
    </article>
  );
}
