"use client";

import { useState, useTransition } from "react";

import { runEnvironmentAction, type ActionResult, type EnvironmentAction } from "@/app/actions";
import type { Environment } from "@/lib/upsun/types";

type Props = {
  projectId: string;
  projectTitle: string;
  environment: Pick<Environment, "id" | "name" | "type" | "status">;
  compact?: boolean;
};

const LABELS: Record<EnvironmentAction, string> = {
  redeploy: "Redeploy",
  backup: "Backup",
  pause: "Pause",
  resume: "Resume",
};

export function EnvironmentActions({ projectId, projectTitle, environment, compact }: Props) {
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<EnvironmentAction | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);

  const isProduction = environment.type === "production";
  const actions: EnvironmentAction[] = [];
  if (environment.status === "active") {
    actions.push("redeploy", "backup");
    if (!isProduction) actions.push("pause");
  } else if (environment.status === "paused") {
    actions.push("resume");
  }
  if (!actions.length) return null;

  function run(action: EnvironmentAction) {
    const target = `${projectTitle} / ${environment.name}`;
    const warning = isProduction ? "\n\nThis is a PRODUCTION environment." : "";
    if (!window.confirm(`${LABELS[action]} ${target}?${warning}`)) return;

    setResult(null);
    setRunning(action);
    startTransition(async () => {
      setResult(await runEnvironmentAction(projectId, environment.id, action));
      setRunning(null);
    });
  }

  const size = compact ? "px-2 py-1 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          disabled={pending}
          onClick={() => run(action)}
          className={`rounded-md border border-border bg-surface font-medium transition hover:bg-surface-hover disabled:opacity-50 ${size}`}
        >
          {running === action ? `${LABELS[action]}…` : LABELS[action]}
        </button>
      ))}
      {result && (
        <span
          role="status"
          className={`text-xs ${result.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
        >
          {result.message}
        </span>
      )}
    </div>
  );
}
