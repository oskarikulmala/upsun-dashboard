import Link from "next/link";

import { formatDateTime, timeAgo } from "@/lib/format";
import { environmentUrl } from "@/lib/upsun/common";
import type { Environment, OrganizationProject } from "@/lib/upsun/types";

import { EnvironmentActions } from "./environment-actions";

const STATUS_STYLE: Record<Environment["status"], string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  dirty: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  paused: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  inactive: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  deleting: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const TYPE_STYLE: Record<Environment["type"], string> = {
  production: "text-violet-700 dark:text-violet-400",
  staging: "text-sky-700 dark:text-sky-400",
  development: "text-muted",
};

export function EnvironmentStatus({ status }: { status: Environment["status"] }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[status]}`}
      title={status === "dirty" ? "Active, with an activity (e.g. a cron) currently running" : undefined}
    >
      {status === "dirty" ? "busy" : status}
    </span>
  );
}

export type EnvironmentTableRow = {
  project: Pick<OrganizationProject, "id" | "title">;
  environment: Environment;
};

export function EnvironmentsTable({
  rows,
  now,
  showProject,
  actions,
}: {
  rows: EnvironmentTableRow[];
  now: string;
  showProject?: boolean;
  actions: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[56rem] text-left text-sm">
        <thead className="border-b border-border text-xs text-muted">
          <tr>
            {showProject && <th className="px-4 py-2.5 font-medium">Project</th>}
            <th className="px-4 py-2.5 font-medium">Environment</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Last deployment</th>
            <th className="px-4 py-2.5 font-medium">Last backup</th>
            <th className="px-4 py-2.5 font-medium">URL</th>
            {actions && <th className="px-4 py-2.5 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(({ project, environment: env }) => {
            const deploy = env.deployment_state;
            const url = environmentUrl(env);
            return (
              <tr key={`${project.id}/${env.id}`} className="align-middle">
                {showProject && (
                  <td className="px-4 py-2.5">
                    <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                      {project.title || project.id}
                    </Link>
                  </td>
                )}
                <td className="px-4 py-2.5">
                  <div className="font-mono">{env.name}</div>
                  <div className="text-xs">
                    <span className={`capitalize ${TYPE_STYLE[env.type]}`}>{env.type}</span>
                    {env.parent && <span className="text-muted"> · from {env.parent}</span>}
                    {env.is_pr && <span className="text-muted"> · PR</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <EnvironmentStatus status={env.status} />
                </td>
                <td className="px-4 py-2.5" title={formatDateTime(deploy?.last_deployment_at)}>
                  {timeAgo(deploy?.last_deployment_at, now)}
                  {deploy?.last_deployment_successful === false && (
                    <span className="text-red-700 dark:text-red-400"> · failed</span>
                  )}
                </td>
                <td className="px-4 py-2.5" title={formatDateTime(env.last_backup_at)}>
                  {env.last_backup_at ? timeAgo(env.last_backup_at, now) : <span className="text-muted">Never</span>}
                </td>
                <td className="max-w-[16rem] truncate px-4 py-2.5">
                  {url && (env.status === "active" || env.status === "dirty") ? (
                    <a href={url} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline dark:text-sky-400">
                      {url.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                {actions && (
                  <td className="px-4 py-2.5">
                    <EnvironmentActions
                      projectId={project.id}
                      projectTitle={project.title}
                      environment={{ id: env.id, name: env.name, type: env.type, status: env.status }}
                      compact
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
