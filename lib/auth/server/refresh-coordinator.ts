import { createHash } from "node:crypto";

export const SESSION_COOKIE_NAME = "session";
export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
export const SESSION_REFRESH_WINDOW_MS = 30_000;

export type AccessTokenPayload = {
  id: string;
  email: string;
  accountType: string;
  roles?: string[];
  exp?: number;
};

export type RefreshExchangeResult =
  | {
      status: "success";
      accessToken: string;
      refreshToken?: string;
    }
  | { status: "invalid" | "unavailable" };

type RefreshRequest = {
  endpoint: string;
  refreshToken: string;
};

type RefreshResponsePayload = {
  accessToken?: string;
  refreshToken?: string;
};

export function decodeAccessToken(accessToken: string): AccessTokenPayload {
  const encodedPayload = accessToken.split(".")[1];
  if (!encodedPayload) throw new Error("Token de acesso inválido.");

  return JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf8"),
  ) as AccessTokenPayload;
}

function extractRefreshToken(response: Response) {
  const value = response.headers
    .get("set-cookie")
    ?.match(/(?:^|;\s*)refreshToken=([^;]+)/)?.[1];
  return value ? decodeURIComponent(value) : undefined;
}

function refreshFlightKey(endpoint: string, refreshToken: string) {
  return createHash("sha256")
    .update(endpoint)
    .update("\0")
    .update(refreshToken)
    .digest("base64url");
}

/**
 * Deduplicates simultaneous refreshes inside one frontend instance. The raw
 * refresh token is never used as a map key and is never logged.
 */
export function createRefreshCoordinator(fetchImpl: typeof fetch = fetch) {
  const flights = new Map<string, Promise<RefreshExchangeResult>>();

  async function exchange({
    endpoint,
    refreshToken,
  }: RefreshRequest): Promise<RefreshExchangeResult> {
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${REFRESH_TOKEN_COOKIE_NAME}=${refreshToken}`,
        },
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        return { status: "invalid" };
      }
      if (!response.ok) return { status: "unavailable" };

      const data = (await response.json().catch(() => ({}))) as RefreshResponsePayload;
      if (!data.accessToken) return { status: "unavailable" };

      try {
        const payload = decodeAccessToken(data.accessToken);
        if (!payload.id || !payload.email || !payload.accountType || !payload.exp) {
          return { status: "unavailable" };
        }
      } catch {
        return { status: "unavailable" };
      }

      return {
        status: "success",
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || extractRefreshToken(response),
      };
    } catch {
      return { status: "unavailable" };
    }
  }

  return async function requestRefresh(
    request: RefreshRequest,
  ): Promise<RefreshExchangeResult> {
    const key = refreshFlightKey(request.endpoint, request.refreshToken);
    const current = flights.get(key);
    if (current) return current;

    const flight = exchange(request);
    flights.set(key, flight);
    try {
      return await flight;
    } finally {
      if (flights.get(key) === flight) flights.delete(key);
    }
  };
}

export const requestRefreshSingleFlight = createRefreshCoordinator();
