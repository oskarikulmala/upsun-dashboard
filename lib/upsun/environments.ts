import "server-only";

import { CONCURRENCY, listAllProjects, listEnvironments, mapWithConcurrency, type ProjectWithOrg } from "./common";
import type { Environment } from "./types";

export type EnvironmentRow = ProjectWithOrg & { environment: Environment };

export type AllEnvironments = {
  rows: EnvironmentRow[];
  // Projects whose environment list could not be loaded.
  failed: { projectTitle: string; error: string }[];
  fetchedAt: string;
};

const TYPE_ORDER: Environment["type"][] = ["production", "staging", "development"];

/** Every environment across all visible projects, production first. */
export async function getAllEnvironments(): Promise<AllEnvironments> {
  const projects = (await listAllProjects()).filter((p) => p.project.status === "active");
  const failed: AllEnvironments["failed"] = [];

  const perProject = await mapWithConcurrency(projects, CONCURRENCY, async (p) => {
    try {
      const envs = await listEnvironments(p.project.id);
      return envs.map((environment) => ({ ...p, environment }));
    } catch (err) {
      failed.push({ projectTitle: p.project.title, error: err instanceof Error ? err.message : String(err) });
      return [];
    }
  });

  const rows = perProject.flat().sort(
    (a, b) =>
      TYPE_ORDER.indexOf(a.environment.type) - TYPE_ORDER.indexOf(b.environment.type) ||
      a.project.title.localeCompare(b.project.title) ||
      a.environment.name.localeCompare(b.environment.name),
  );

  return { rows, failed, fetchedAt: new Date().toISOString() };
}
