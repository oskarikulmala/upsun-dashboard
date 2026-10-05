import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { EnvironmentsTable } from "@/app/_components/environments-table";
import { RefreshControls } from "@/app/_components/refresh-controls";
import { getAllEnvironments } from "@/lib/upsun/environments";
import type { Environment } from "@/lib/upsun/types";
import { actionsEnabled } from "@/lib/settings";

export const metadata = { title: "Environments · Upsun Dashboard" };

const STATUS_FILTERS = ["active", "paused", "inactive", "all"] as const;
const TYPE_FILTERS = ["all", "production", "staging", "development"] as const;

type Filters = { status: (typeof STATUS_FILTERS)[number]; type: (typeof TYPE_FILTERS)[number] };

function parseFilters(params: Record<string, string | string[] | undefined>): Filters {
  const pick = <T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] =>
    typeof value === "string" && allowed.includes(value) ? value : fallback;
  return {
    status: pick(params.status, STATUS_FILTERS, "active"),
    type: pick(params.type, TYPE_FILTERS, "all"),
  };
}

export default function EnvironmentsPage({ searchParams }: PageProps<"/environments">) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Environments</h1>
        <p className="text-sm text-muted">Every environment across all connected projects</p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}>
        <EnvironmentsList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function FilterLinks<T extends string>({
  label,
  options,
  current,
  hrefFor,
  counts,
}: {
  label: string;
  options: readonly T[];
  current: T;
  hrefFor: (value: T) => string;
  counts: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      <span className="mr-1 text-muted">{label}</span>
      {options.map((option) => (
        <Link
          key={option}
          href={hrefFor(option)}
          className={`rounded-md px-2.5 py-1 capitalize transition ${
            option === current ? "bg-foreground text-background" : "text-muted hover:bg-surface-hover hover:text-foreground"
          }`}
        >
          {option} <span className="tabular-nums opacity-70">{counts[option] ?? 0}</span>
        </Link>
      ))}
    </div>
  );
}

async function EnvironmentsList({ searchParams }: { searchParams: PageProps<"/environments">["searchParams"] }) {
  await connection();
  const filters = parseFilters(await searchParams);
  const { rows, failed, fetchedAt } = await getAllEnvironments();

  // "dirty" means an activity is running on an otherwise active environment.
  const statusIs = (env: Environment, status: Filters["status"]) =>
    status === "all" || env.status === status || (status === "active" && env.status === "dirty");
  const typeIs = (env: Environment, type: Filters["type"]) => type === "all" || env.type === type;
  const matchesStatus = (env: Environment) => statusIs(env, filters.status);
  const matchesType = (env: Environment) => typeIs(env, filters.type);

  const statusCounts = Object.fromEntries(
    STATUS_FILTERS.map((s) => [s, rows.filter((r) => matchesType(r.environment) && statusIs(r.environment, s)).length]),
  );
  const typeCounts = Object.fromEntries(
    TYPE_FILTERS.map((t) => [t, rows.filter((r) => matchesStatus(r.environment) && typeIs(r.environment, t)).length]),
  );

  const visible = rows.filter((r) => matchesStatus(r.environment) && matchesType(r.environment));
  const href = (next: Partial<Filters>) => {
    const merged = { ...filters, ...next };
    return `/environments?${new URLSearchParams(merged)}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <FilterLinks
            label="Status"
            options={STATUS_FILTERS}
            current={filters.status}
            hrefFor={(status) => href({ status })}
            counts={statusCounts}
          />
          <FilterLinks
            label="Type"
            options={TYPE_FILTERS}
            current={filters.type}
            hrefFor={(type) => href({ type })}
            counts={typeCounts}
          />
        </div>
        <RefreshControls fetchedAt={fetchedAt} />
      </div>

      {failed.length > 0 && (
        <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
          Could not load environments for: {failed.map((f) => f.projectTitle).join(", ")}
        </p>
      )}

      {visible.length ? (
        <EnvironmentsTable rows={visible} now={fetchedAt} showProject actions={actionsEnabled()} />
      ) : (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
          No environments match these filters.
        </p>
      )}
    </>
  );
}
