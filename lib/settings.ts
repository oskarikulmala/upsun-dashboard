import "server-only";

/** Whether mutating actions (redeploy, backup, pause, resume) are shown and allowed. */
export function actionsEnabled(): boolean {
  return process.env.UPSUN_ENABLE_ACTIONS === "true";
}
