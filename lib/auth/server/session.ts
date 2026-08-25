"use server";

import { cookies } from "next/headers";
import type { SessionData } from "@/types/auth/sessionData";
import type { User } from "@/types/auth/user";
import { normalizeApiBaseUrl } from "@/lib/api/base-url";

const SESSION_COOKIE_NAME = "session";
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
const SESSION_COOKIE_DOMAIN = process.env.SESSION_COOKIE_DOMAIN || undefined;
const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

const sharedCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  ...(SESSION_COOKIE_DOMAIN ? { domain: SESSION_COOKIE_DOMAIN } : {}),
  path: "/",
};

/**
 * Reads the session created by the main Princesa Rural frontend.
 * The auction app deliberately does not own login or account management.
 */
export async function getSession(): Promise<SessionData | null> {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME);
  if (!sessionCookie) return null;

  try {
    return JSON.parse(sessionCookie.value) as SessionData;
  } catch {
    return null;
  }
}

export async function getUser(): Promise<User | null> {
  return (await getSession())?.user ?? null;
}

export async function getAccessToken(): Promise<string | null> {
  return (await getSession())?.accessToken ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  return (await cookies()).get(REFRESH_TOKEN_COOKIE_NAME)?.value ?? null;
}

type AccessTokenPayload = {
  id: string;
  email: string;
  accountType: string;
  roles?: string[];
  exp?: number;
};

function decodeAccessToken(accessToken: string): AccessTokenPayload {
  const encodedPayload = accessToken.split(".")[1];
  if (!encodedPayload) throw new Error("Token de acesso inválido.");

  return JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf8"),
  ) as AccessTokenPayload;
}

/** Persists the same session cookie used by the marketplace frontend. */
export async function createSessionFromAccessToken(accessToken: string) {
  const payload = decodeAccessToken(accessToken);
  if (!payload.id || !payload.email || !payload.accountType) {
    throw new Error("Token de acesso sem dados de usuário.");
  }

  const expiresAt = (payload.exp ?? Math.floor(Date.now() / 1000) + 300) * 1000;
  const session: SessionData = {
    user: {
      id: payload.id,
      email: payload.email,
      accountType: payload.accountType,
      roles: Array.isArray(payload.roles) ? payload.roles : [payload.accountType],
    },
    accessToken,
    expiresAt,
  };

  (await cookies()).set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    ...sharedCookieOptions,
    expires: new Date(expiresAt),
  });

  return session;
}

export async function persistRefreshToken(refreshToken: string) {
  (await cookies()).set(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    ...sharedCookieOptions,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

function extractRefreshToken(response: Response) {
  const value = response.headers.get("set-cookie")?.match(/(?:^|;\s*)refreshToken=([^;]+)/)?.[1];
  return value ? decodeURIComponent(value) : null;
}

/** Renova a sessão no backend sem expor refresh/access tokens ao navegador. */
export async function refreshSession(): Promise<SessionData | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${REFRESH_TOKEN_COOKIE_NAME}=${refreshToken}`,
      },
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data = (await response.json().catch(() => ({}))) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!data.accessToken) return null;

    const session = await createSessionFromAccessToken(data.accessToken);
    const rotatedRefreshToken = data.refreshToken || extractRefreshToken(response);
    if (rotatedRefreshToken) await persistRefreshToken(rotatedRefreshToken);
    return session;
  } catch {
    return null;
  }
}

/** Usado por Server Actions antes de chamadas protegidas. */
export async function getFreshSession(): Promise<SessionData | null> {
  const session = await getSession();
  const refreshWindow = 30_000;
  if (session && session.expiresAt > Date.now() + refreshWindow) return session;
  return refreshSession();
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(REFRESH_TOKEN_COOKIE_NAME);
}
