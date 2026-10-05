import "server-only";

/**
 * Exchanges the long-lived UPSUN_API_TOKEN for a short-lived (~15 min) OAuth
 * access token and caches it in memory until shortly before it expires.
 *
 * See https://developer.upsun.com/api/rest/authentication
 */

const TOKEN_URL = "https://auth.upsun.com/oauth2/token";
// Refresh this many ms before the token actually expires.
const EXPIRY_MARGIN_MS = 60_000;

type CachedToken = { value: string; expiresAt: number };

let cached: CachedToken | null = null;
let inFlight: Promise<CachedToken> | null = null;

export class UpsunConfigError extends Error {}

export class UpsunAuthError extends Error {}

function getApiToken(): string {
  const token = process.env.UPSUN_API_TOKEN;
  if (!token) {
    throw new UpsunConfigError(
      "UPSUN_API_TOKEN is not set. Copy .env.example to .env.local and add your token.",
    );
  }
  return token;
}

async function requestToken(): Promise<CachedToken> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      // Basic auth with the fixed client id "platform-api-user" and no secret.
      Authorization: `Basic ${Buffer.from("platform-api-user:").toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "api_token",
      api_token: getApiToken(),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new UpsunAuthError(
      `Token exchange failed (${res.status}). Check that UPSUN_API_TOKEN is valid. ${detail}`.trim(),
    );
  }

  const body = (await res.json()) as { access_token: string; expires_in: number };
  return {
    value: body.access_token,
    expiresAt: Date.now() + body.expires_in * 1000 - EXPIRY_MARGIN_MS,
  };
}

export async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  // Share one exchange between concurrent callers.
  inFlight ??= requestToken().finally(() => {
    inFlight = null;
  });
  cached = await inFlight;
  return cached.value;
}

export function invalidateAccessToken(): void {
  cached = null;
}
