import "server-only";

import { upsunFetch } from "./client";
import type { Integration } from "./types";

export type IntegrationSummary = {
  id: string;
  type: string;
  label: string;
  category: "Source code" | "Notifications" | "Webhooks" | "Log forwarding" | "Performance" | "CDN" | "Other";
  details: [string, string][];
  // e.g. a Git token that has expired or expires soon.
  warning: string | null;
  createdAt: string;
};

const TOKEN_WARNING_DAYS = 30;

// Integrations can hold secrets (tokens, routing keys, shared keys, auth headers,
// scripts), so we only ever pass an allow-listed, sanitised subset to the browser.
const LABELS: Record<string, [string, IntegrationSummary["category"]]> = {
  github: ["GitHub", "Source code"],
  gitlab: ["GitLab", "Source code"],
  bitbucket: ["Bitbucket", "Source code"],
  bitbucket_server: ["Bitbucket Server", "Source code"],
  email: ["Email", "Notifications"],
  slack: ["Slack", "Notifications"],
  pagerduty: ["PagerDuty", "Notifications"],
  "health.email": ["Health email", "Notifications"],
  "health.slack": ["Health Slack", "Notifications"],
  "health.pagerduty": ["Health PagerDuty", "Notifications"],
  "health.webhook": ["Health webhook", "Notifications"],
  webhook: ["Webhook", "Webhooks"],
  script: ["Activity script", "Webhooks"],
  httplog: ["HTTP log forwarding", "Log forwarding"],
  otlplog: ["OTLP log forwarding", "Log forwarding"],
  newrelic: ["New Relic", "Log forwarding"],
  splunk: ["Splunk", "Log forwarding"],
  sumologic: ["Sumo Logic", "Log forwarding"],
  syslog: ["Syslog", "Log forwarding"],
  blackfire: ["Blackfire", "Performance"],
  fastly: ["Fastly", "CDN"],
  "fastly.cdn": ["Fastly CDN", "CDN"],
};

function str(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

/** Host only: URLs for webhooks/log sinks often embed tokens in paths or query strings. */
function host(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  try {
    return new URL(s).host;
  } catch {
    return null;
  }
}

function list(v: unknown): string | null {
  return Array.isArray(v) && v.length ? v.map(String).join(", ") : null;
}

function yesNo(v: unknown): string | null {
  return typeof v === "boolean" ? (v ? "Yes" : "No") : null;
}

function tokenExpiry(v: unknown): { label: string; warning: string | null } | null {
  const iso = str(v);
  if (!iso) return null;
  const expires = new Date(iso);
  if (Number.isNaN(expires.getTime())) return null;
  const days = Math.floor((expires.getTime() - Date.now()) / 86_400_000);
  const label = expires.toLocaleDateString("en-GB", { dateStyle: "medium", timeZone: "UTC" });
  if (days < 0) return { label: `${label} (expired)`, warning: "The Git token has expired; pushes and syncs will fail." };
  if (days <= TOKEN_WARNING_DAYS) return { label: `${label} (in ${days} days)`, warning: `The Git token expires in ${days} days.` };
  return { label, warning: null };
}

const TOKEN_TYPES: Record<string, string> = {
  classic_personal_token: "Personal access token",
  github_app: "GitHub App",
};

function summarize(i: Integration): IntegrationSummary {
  const [label, category] = LABELS[i.type] ?? [i.type, "Other"];
  const expiry = tokenExpiry(i.token_expires_at);
  const rotation =
    i.rotate_token === true
      ? `Yes${typeof i.rotate_token_validity_in_weeks === "number" ? `, ${i.rotate_token_validity_in_weeks}-week validity` : ""}`
      : yesNo(i.rotate_token);
  const candidates: [string, string | null][] = [
    ["Repository", str(i.repository) ?? (typeof i.project === "string" ? i.project : null)],
    ["Server", host(i.base_url) ?? (category === "Source code" ? host(i.url) : null)],
    ["Token type", typeof i.token_type === "string" ? (TOKEN_TYPES[i.token_type] ?? i.token_type) : null],
    ["Token expires", expiry?.label ?? (i.type === "gitlab" ? "No expiry date reported" : null)],
    ["Token auto-rotation", rotation],
    ["Build pull requests", yesNo(i.build_pull_requests ?? i.build_merge_requests)],
    ["Fetch branches", yesNo(i.fetch_branches)],
    ["Prune branches", yesNo(i.prune_branches)],
    ["Channel", str(i.channel)],
    ["Recipients", list(i.recipients)],
    ["From", str(i.from_address)],
    ["Endpoint host", category !== "Source code" ? host(i.url) : null],
    ["Host", str(i.host)],
    ["Index", str(i.index)],
    ["Events", list(i.events)],
    ["Environments", list(i.environments)],
    ["Excluded environments", list(i.excluded_environments)],
    ["Fastly service", str(i.service_id)],
    ["Continuous profiling", yesNo(i.continuous_profiling)],
  ];
  return {
    id: i.id,
    type: i.type,
    label,
    category,
    details: candidates.filter((c): c is [string, string] => c[1] !== null),
    warning: expiry?.warning ?? null,
    createdAt: i.created_at,
  };
}

export async function getIntegrations(projectId: string): Promise<IntegrationSummary[]> {
  const integrations = await upsunFetch<Integration[]>(`/projects/${projectId}/integrations`);
  return integrations.map(summarize).sort((a, b) => a.category.localeCompare(b.category));
}
