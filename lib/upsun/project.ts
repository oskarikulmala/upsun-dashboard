import "server-only";

import { upsunFetch } from "./client";
import {
  environmentPath,
  NOTABLE_ACTIVITY_TYPES,
  ifPermitted,
  listActivities,
  listAllProjects,
  listEnvironments,
  pickProduction,
  type ProjectWithOrg,
} from "./common";
import type { Activity, Environment, ResourcesSummary, UsageGroup } from "./types";

const RESOURCE_WINDOW_SECONDS = 24 * 3600;

export type ServiceResources = {
  service: string;
  instances: number;
  cpuAvg: number | null;
  cpuMax: number | null;
  cpuLimit: number | null;
  memoryAvg: number | null;
  memoryMax: number | null;
  memoryLimit: number | null;
};

export type ProjectDetail = ProjectWithOrg & {
  environments: Environment[];
  production: Environment | null;
  // null = the token's role can't read it.
  activities: Activity[] | null;
  resources: ServiceResources[] | null;
  usage: UsageGroup[] | null;
  fetchedAt: string;
};

/** Looks the project up among the visible ones, so UPSUN_ORGANIZATION_IDS is respected. */
export async function findProject(projectId: string): Promise<ProjectWithOrg | null> {
  return (await listAllProjects()).find((p) => p.project.id === projectId) ?? null;
}

function sumOrNull(values: (number | null | undefined)[]): number | null {
  const present = values.filter((v): v is number => typeof v === "number");
  return present.length ? present.reduce((a, b) => a + b, 0) : null;
}

/** Collapses per-instance metrics into one row per service (summed across instances). */
function summarizeResources(summary: ResourcesSummary): ServiceResources[] {
  return Object.entries(summary.data.services ?? {})
    .map(([service, instances]) => {
      const list = Object.values(instances);
      return {
        service,
        instances: list.length,
        cpuAvg: sumOrNull(list.map((i) => i.cpu_used?.avg)),
        cpuMax: sumOrNull(list.map((i) => i.cpu_used?.max)),
        cpuLimit: sumOrNull(list.map((i) => i.cpu_limit?.max)),
        memoryAvg: sumOrNull(list.map((i) => i.memory_used?.avg)),
        memoryMax: sumOrNull(list.map((i) => i.memory_used?.max)),
        memoryLimit: sumOrNull(list.map((i) => i.memory_limit?.max)),
      };
    })
    .sort((a, b) => a.service.localeCompare(b.service));
}

export async function getProjectDetail(projectId: string): Promise<ProjectDetail | null> {
  const found = await findProject(projectId);
  if (!found) return null;
  const { project, organization } = found;

  const environments = await listEnvironments(project.id);
  const production = pickProduction(environments, project.default_branch);

  const to = Math.floor(Date.now() / 1000);
  const resourceQuery = new URLSearchParams({ from: String(to - RESOURCE_WINDOW_SECONDS), to: String(to) });
  for (const agg of ["avg", "max"]) resourceQuery.append("aggs[]", agg);
  for (const type of ["cpu", "memory"]) resourceQuery.append("types[]", type);

  const [activities, summary, usage] = await Promise.all([
    listActivities(project.id, NOTABLE_ACTIVITY_TYPES, 10),
    production
      ? ifPermitted(
          upsunFetch<ResourcesSummary>(
            `${environmentPath(project.id, production.id)}/observability/resources/summary?${resourceQuery}`,
          ),
        ).catch(() => null)
      : null,
    project.subscription_id
      ? ifPermitted(
          upsunFetch<Record<string, UsageGroup>>(
            `/organizations/${organization.id}/subscriptions/${project.subscription_id}/current_usage`,
          ),
        ).catch(() => null)
      : null,
  ]);

  return {
    project,
    organization,
    environments: [...environments].sort(
      (a, b) => Number(b === production) - Number(a === production) || a.name.localeCompare(b.name),
    ),
    production,
    activities: activities?.slice(0, 25) ?? null,
    resources: summary ? summarizeResources(summary) : null,
    usage: usage ? Object.values(usage).filter((g) => !g.not_charged) : null,
    fetchedAt: new Date().toISOString(),
  };
}
