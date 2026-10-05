"use client";

import { useEffect, useRef, useState } from "react";

import { fetchIntegrations } from "@/app/actions";
import type { IntegrationSummary } from "@/lib/upsun/integrations";

type State =
  | { status: "loading" }
  | { status: "loaded"; integrations: IntegrationSummary[] }
  | { status: "error"; message: string };

export function IntegrationsButton({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ status: "loading" });

  // Bumped on every open/close so a slow response can't overwrite a newer one.
  const request = useRef(0);

  // Load on open so the overview doesn't pay for integrations it never shows.
  function show() {
    const id = ++request.current;
    setOpen(true);
    setState({ status: "loading" });
    fetchIntegrations(projectId)
      .then((res) => {
        if (request.current !== id) return;
        setState(res.ok ? { status: "loaded", integrations: res.integrations } : { status: "error", message: res.message });
      })
      .catch((err: unknown) => {
        if (request.current === id) setState({ status: "error", message: err instanceof Error ? err.message : "Request failed" });
      });
  }

  function close() {
    request.current++;
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="rounded-md border border-border bg-surface px-2.5 py-1 text-sm font-medium transition hover:bg-surface-hover"
      >
        Integrations
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`integrations-${projectId}`}
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-surface text-foreground shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 id={`integrations-${projectId}`} className="font-semibold">
                  Third-party integrations
                </h2>
                <p className="text-xs text-muted">{projectTitle}</p>
              </div>
              <button
                type="button"
                autoFocus
                onClick={close}
                className="rounded-md px-2 py-1 text-muted hover:bg-surface-hover hover:text-foreground"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              {state.status === "loading" ? (
                <p className="text-sm text-muted">Loading integrations…</p>
              ) : state.status === "error" ? (
                <p className="text-sm text-red-700 dark:text-red-400">{state.message}</p>
              ) : state.integrations.length === 0 ? (
                <p className="text-sm text-muted">This project has no integrations.</p>
              ) : (
                <ul className="space-y-3">
                  {state.integrations.map((i) => (
                    <li key={i.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{i.label}</span>
                        <span className="text-xs text-muted">{i.category}</span>
                      </div>
                      {i.warning && (
                        <p className="mt-2 rounded-md bg-amber-500/10 px-2 py-1 text-sm text-amber-700 dark:text-amber-400">
                          {i.warning}
                        </p>
                      )}
                      {i.details.length > 0 && (
                        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                          {i.details.map(([k, v]) => (
                            <div key={k} className="contents">
                              <dt className="text-muted">{k}</dt>
                              <dd className="break-all">{v}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
