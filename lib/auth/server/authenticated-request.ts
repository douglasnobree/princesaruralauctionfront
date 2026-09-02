import { SESSION_REFRESH_WINDOW_MS } from "./refresh-coordinator.ts";

export type AuthSession = {
  accessToken: string;
  expiresAt: number;
};

export type SessionRefreshResult<TSession extends AuthSession = AuthSession> =
  | { status: "success"; session: TSession }
  | { status: "missing" | "invalid" | "unavailable"; session: null };

export type AuthenticatedRequestOptions = {
  auth?: "required" | "optional";
};

type AuthenticatedRequesterDependencies<TSession extends AuthSession> = {
  getSession: () => Promise<TSession | null>;
  refreshSession: () => Promise<SessionRefreshResult<TSession>>;
  clearSession: () => Promise<void>;
  fetch?: typeof fetch;
  now?: () => number;
};

function authenticationRequiredResponse() {
  return Response.json(
    {
      code: "AUTH_REQUIRED",
      message: "Sua sessão expirou. Entre novamente para continuar.",
    },
    { status: 401 },
  );
}

/**
 * Central retry policy for authenticated backend requests. A request is sent
 * at most twice: once with the current access token and once after one refresh.
 */
export function createAuthenticatedRequester<TSession extends AuthSession>({
  getSession,
  refreshSession,
  clearSession,
  fetch: fetchImpl = fetch,
  now = Date.now,
}: AuthenticatedRequesterDependencies<TSession>) {
  async function safelyClearSession() {
    try {
      await clearSession();
    } catch {
      // Cookie mutation is only available in Server Functions and Route Handlers.
    }
  }

  function requestWithToken(
    input: string | URL,
    init: RequestInit,
    accessToken?: string,
  ) {
    const headers = new Headers(init.headers);
    headers.delete("authorization");
    if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
    return fetchImpl(input, { ...init, headers, cache: "no-store" });
  }

  return async function authenticatedRequest(
    input: string | URL,
    init: RequestInit = {},
    options: AuthenticatedRequestOptions = {},
  ): Promise<Response> {
    const auth = options.auth ?? "required";
    const currentSession = await getSession();
    const currentIsFresh = Boolean(
      currentSession &&
        Number.isFinite(currentSession.expiresAt) &&
        currentSession.expiresAt > now() + SESSION_REFRESH_WINDOW_MS,
    );

    let refreshAttempted = false;
    let session = currentIsFresh ? currentSession : null;

    if (!session) {
      refreshAttempted = true;
      const refreshed = await refreshSession();
      session = refreshed.status === "success" ? refreshed.session : null;
      if (refreshed.status === "invalid" || (refreshed.status === "missing" && currentSession)) {
        await safelyClearSession();
      }
    }

    if (!session) {
      return auth === "optional"
        ? requestWithToken(input, init)
        : authenticationRequiredResponse();
    }

    let response = await requestWithToken(input, init, session.accessToken);
    if (response.status !== 401) return response;

    if (refreshAttempted) {
      await safelyClearSession();
      return response;
    }

    refreshAttempted = true;
    const refreshed = await refreshSession();
    if (refreshed.status !== "success") {
      if (refreshed.status === "invalid" || refreshed.status === "missing") {
        await safelyClearSession();
      }
      return response;
    }

    response = await requestWithToken(input, init, refreshed.session.accessToken);
    if (response.status === 401) await safelyClearSession();
    return response;
  };
}
