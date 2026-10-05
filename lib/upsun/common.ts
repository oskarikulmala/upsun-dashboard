import "server-only";

import { cache } from "react";

import { UpsunApiError, upsunFetch, upsunFetchAll } from "./client";
import type { Activity, Environment, Organization, OrganizationProject, User } from "./types";

export const CONCURRENCY = 6;

export type ProjectWithOrg = { project: OrganizationProject; organization: Organization };

/** Resolves to null when the token's user lacks access (403) or the resource is missing (404). */
export async function ifPermitted<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (err) {
    if (err instanceof UpsunApiError && (err.status === 403 || err.status === 404)) return null;
    throw err;
  }
}

export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Organizations visible to the token, narrowed by UPSUN_ORGANIZATION_IDS. Deduped per request. */
export const listOrganizations = cache(async (): Promise<Organization[]> => {
  const filter = (process.env.UPSUN_ORGANIZATION_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const me = await upsunFetch<User>("/users/me");
  const orgs = await upsunFetchAll<Organization>(`/users/${me.id}/organizations`);
  return orgs.filter((o) => o.status !== "deleted" && (!filter.length || filter.includes(o.id)));
});

/** Every non-deleted project in the visible organizations, sorted by title. Deduped per request. */
export const listAllProjects = cache(async (): Promise<ProjectWithOrg[]> => {
  const organizations = await listOrganizations();
  const byOrg = await Promise.all(
    organizations.map(async (organization) => {
      const projects = await upsunFetchAll<OrganizationProject>(
        `/organizations/${organization.id}/projects?page[size]=100`,
      );
      return projects.filter((p) => p.status !== "deleted").map((project) => ({ project, organization }));
    }),
  );
  return byOrg.flat().sort((a, b) => a.project.title.localeCompare(b.project.title));
});

export function listEnvironments(projectId: string) {
  return upsunFetch<Environment[]>(`/projects/${projectId}/environments`);
}

export function environmentPath(projectId: string, environmentId: string) {
  return `/projects/${projectId}/environments/${encodeURIComponent(environmentId)}`;
}

export function pickProduction(envs: Environment[], defaultBranch: string): Environment | null {
  return (
    envs.find((e) => e.type === "production") ??
    envs.find((e) => e.is_main) ??
    envs.find((e) => e.name === defaultBranch) ??
    null
  );
}

export function environmentUrl(env: Environment): string | null {
  return env.default_domain ? `https://${env.default_domain}` : null;
}

/** Activities that change what's deployed. */
export const DEPLOY_ACTIVITY_TYPES = ["environment.push", "environment.merge", "environment.redeploy"];

/** Everything worth showing in a log; crons are left out because they drown out the rest. */
export const NOTABLE_ACTIVITY_TYPES = [
  ...DEPLOY_ACTIVITY_TYPES,
  "environment.backup",
  "environment.restore",
  "environment.branch",
  "environment.synchronize",
  "environment.source-operation",
  "environment.activate",
  "environment.deactivate",
  "environment.pause",
  "environment.resume",
];

/**
 * Project-level activities of the given types, newest first. The API filters by one
 * `type` per request, so types are fetched in parallel and merged. Resolves to null
 * when the token's role can't read the activity log at all.
 */
export async function listActivities(projectId: string, types: string[], count: number): Promise<Activity[] | null> {
  const results = await Promise.all(
    types.map((type) =>
      ifPermitted(
        upsunFetch<Activity[]>(`/projects/${projectId}/activities?${new URLSearchParams({ type, count: String(count) })}`),
      ),
    ),
  );
  if (results.every((r) => r === null)) return null;
  return results
    .flatMap((r) => r ?? [])
    .map((a) => ({ ...a, text: a.text.replaceAll("**", "") }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
