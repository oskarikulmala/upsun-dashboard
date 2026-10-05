"use server";

import { refresh } from "next/cache";

import { UpsunApiError, upsunFetch } from "@/lib/upsun/client";
import { environmentPath } from "@/lib/upsun/common";
import { getIntegrations, type IntegrationSummary } from "@/lib/upsun/integrations";
import { findProject } from "@/lib/upsun/project";
import type { Environment } from "@/lib/upsun/types";

export type EnvironmentAction = "redeploy" | "backup" | "pause" | "resume";

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

const SUCCESS: Record<EnvironmentAction, string> = {
  redeploy: "Redeploy started",
  backup: "Backup started",
  pause: "Pausing environment",
  resume: "Resuming environment",
};

function describe(err: unknown): string {
  if (err instanceof UpsunApiError) {
    if (err.status === 403) return "This API token's role is not allowed to do that.";
    if (err.status === 409) return "Another activity is already running on this environment.";
    return `Upsun API returned ${err.status}.`;
  }
  return err instanceof Error ? err.message : "Unknown error";
}

/**
 * Server Functions are reachable by direct POST, so everything is re-validated here:
 * actions must be enabled, and the project must be one this dashboard shows.
 */
export async function runEnvironmentAction(
  projectId: string,
  environmentId: string,
  action: EnvironmentAction,
): Promise<ActionResult> {
  if (process.env.UPSUN_ENABLE_ACTIONS !== "true") {
    return { ok: false, message: "Actions are disabled. Set UPSUN_ENABLE_ACTIONS=true to enable them." };
  }
  if (!(action in SUCCESS) || !/^[a-z0-9]+$/.test(projectId) || !environmentId) {
    return { ok: false, message: "Invalid request." };
  }

  try {
    if (!(await findProject(projectId))) return { ok: false, message: "Project not found." };

    const path = environmentPath(projectId, environmentId);
    if (action === "pause") {
      const env = await upsunFetch<Environment>(path);
      if (env.type === "production") return { ok: false, message: "Production environments can't be paused." };
    }

    await upsunFetch(`${path}/${action}`, {
      method: "POST",
      body: JSON.stringify(action === "backup" ? { safe: true } : {}),
    });
  } catch (err) {
    return { ok: false, message: describe(err) };
  }

  refresh();
  return { ok: true, message: SUCCESS[action] };
}

export async function fetchIntegrations(
  projectId: string,
): Promise<{ ok: true; integrations: IntegrationSummary[] } | { ok: false; message: string }> {
  if (!/^[a-z0-9]+$/.test(projectId)) return { ok: false, message: "Invalid project." };
  try {
    if (!(await findProject(projectId))) return { ok: false, message: "Project not found." };
    return { ok: true, integrations: await getIntegrations(projectId) };
  } catch (err) {
    return { ok: false, message: describe(err) };
  }
}
