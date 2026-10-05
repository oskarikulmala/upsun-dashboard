import "server-only";

import { getAccessToken, invalidateAccessToken } from "./auth";

export const API_BASE = "https://api.upsun.com";

export class UpsunApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
  }
}

/**
 * Authenticated GET/POST against the Upsun REST API. Accepts either a path
 * ("/projects/abc") or an absolute URL (as returned in HAL `_links`).
 * Retries once with a fresh access token on 401.
 */
export async function upsunFetch<T>(pathOrUrl: string, init: RequestInit = {}): Promise<T> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_BASE}${pathOrUrl}`;

  const send = async () =>
    fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
        Authorization: `Bearer ${await getAccessToken()}`,
      },
      cache: "no-store",
    });

  let res = await send();
  if (res.status === 401) {
    invalidateAccessToken();
    res = await send();
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new UpsunApiError(
      `Upsun API ${res.status} on ${pathOrUrl}: ${detail.slice(0, 300)}`,
      res.status,
      pathOrUrl,
    );
  }

  return (await res.json()) as T;
}

type Paginated<T> = { items: T[]; _links?: { next?: { href: string } } };

/** Follows `_links.next` until every page of a list endpoint is collected. */
export async function upsunFetchAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let next: string | undefined = path;
  while (next) {
    const page: Paginated<T> = await upsunFetch<Paginated<T>>(next);
    items.push(...page.items);
    next = page._links?.next?.href;
  }
  return items;
}
