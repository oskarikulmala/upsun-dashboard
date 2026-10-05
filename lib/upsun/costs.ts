import "server-only";

import { upsunFetch } from "./client";
import { ifPermitted, listOrganizations } from "./common";
import type { Organization, OrganizationEstimate } from "./types";

export type OrganizationCosts = {
  organization: Organization;
  // null = the token's role can't see billing for this organization.
  estimate: OrganizationEstimate | null;
  error: string | null;
};

export async function getOrganizationCosts(): Promise<OrganizationCosts[]> {
  const organizations = await listOrganizations();
  return Promise.all(
    organizations.map(async (organization) => {
      try {
        const estimate = await ifPermitted(
          upsunFetch<OrganizationEstimate>(`/organizations/${organization.id}/estimate`),
        );
        return { organization, estimate, error: null };
      } catch (err) {
        return { organization, estimate: null, error: err instanceof Error ? err.message : String(err) };
      }
    }),
  );
}
