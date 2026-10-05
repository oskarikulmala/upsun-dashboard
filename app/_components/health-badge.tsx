import type { Health } from "@/lib/upsun/dashboard";

export const HEALTH_META: Record<Health, { label: string; dot: string; badge: string }> = {
  healthy: {
    label: "Healthy",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  deploying: {
    label: "Deploying",
    dot: "bg-sky-500 animate-pulse",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  failing: {
    label: "Failing",
    dot: "bg-red-500",
    badge: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
  inactive: {
    label: "Inactive",
    dot: "bg-zinc-400",
    badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  },
  unknown: {
    label: "Unknown",
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
};

export function HealthBadge({ health }: { health: Health }) {
  const meta = HEALTH_META[health];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}
    >
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
