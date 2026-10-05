import "server-only";

import { upsunFetch } from "./client";
import {
  CONCURRENCY,
  DEPLOY_ACTIVITY_TYPES,
  environmentPath,
  environmentUrl,
  ifPermitted,
  listActivities,
  listAllProjects,
  listEnvironments,
  listOrganizations,
  mapWithConcurrency,
  pickProduction,
} from "./common";
import type { Activity, Environment, Organization, OrganizationProject, Route } from "./types";

export type Health = "healthy" | "deploying" | "failing" | "inactive" | "unknown";

export type ProjectOverview = {
  project: OrganizationProject;
  organization: Organization;
  environmentCount: number;
  activeEnvironmentCount: number;
  production: Environment | null;
  productionUrl: string | null;
  recentActivities: Activity[];
  // False when the token's role may not read the production activity log.
  canViewActivities: boolean;
  health: Health;
  // Set when per-project details could not be loaded; the card still renders.
  error: string | null;
};

export type DashboardData = {
  organizations: Organization[];
  projects: ProjectOverview[];
  fetchedAt: string;
};

export function deriveHealth(
  project: OrganizationProject,
  production: Environment | null,
  activities: Activity[],
): Health {
  if (project.status !== "active") return project.status === "requested" ? "deploying" : "inactive";
  if (!production) return "unknown";
  if (production.status === "inactive" || production.status === "paused") return "inactive";

  // Only deploy-type activities count; crons run constantly and would keep it "deploying".
  const deploys = activities.filter((a) => DEPLOY_ACTIVITY_TYPES.includes(a.type));
  if (deploys.some((a) => a.state === "in_progress" || a.state === "pending")) return "deploying";

  if (production.deployment_state?.last_deployment_successful === false) return "failing";
  if (deploys.find((a) => a.state === "complete")?.result === "failure") return "failing";

  return "healthy";
}

async function loadProjectOverview(
  project: OrganizationProject,
  organization: Organization,
): Promise<ProjectOverview> {
  const base: ProjectOverview = {
    project,
    organization,
    environmentCount: 0,
    activeEnvironmentCount: 0,
    production: null,
    productionUrl: null,
    recentActivities: [],
    canViewActivities: true,
    health: "unknown",
    error: null,
  };

  if (project.status !== "active") {
    return { ...base, health: deriveHealth(project, null, []) };
  }

  try {
    const envs = await listEnvironments(project.id);
    const production = pickProduction(envs, project.default_branch);

    const [activities, routes] = production
      ? await Promise.all([
          listActivities(project.id, [...DEPLOY_ACTIVITY_TYPES, "environment.backup"], 5),
          ifPermitted(upsunFetch<Route[]>(`${environmentPath(project.id, production.id)}/routes`)),
        ])
      : [[], []];

    const recentActivities = (activities ?? [])
      .filter((a) => production && a.environments.includes(production.id))
      .slice(0, 5);
    const primaryRoute = routes?.find((r) => r.primary) ?? routes?.find((r) => r.type === "upstream");

    return {
      ...base,
      environmentCount: envs.length,
      activeEnvironmentCount: envs.filter((e) => e.status === "active").length,
      production,
      productionUrl:
        primaryRoute?.id ?? (production ? environmentUrl(production) : null),
      recentActivities,
      canViewActivities: activities !== null,
      health: deriveHealth(project, production, recentActivities),
    };
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const [organizations, all] = await Promise.all([listOrganizations(), listAllProjects()]);
  const projects = await mapWithConcurrency(all, CONCURRENCY, ({ project, organization }) =>
    loadProjectOverview(project, organization),
  );
  return { organizations, projects, fetchedAt: new Date().toISOString() };
}
