"use server";

import { cookies } from "next/headers";
import { normalizeApiBaseUrl } from "@/lib/api/base-url";
import {
  decodeAccessToken,
  REFRESH_TOKEN_COOKIE_NAME,
  requestRefreshSingleFlight,
  SESSION_COOKIE_NAME,
  SESSION_REFRESH_WINDOW_MS,
} from "@/lib/auth/server/refresh-coordinator";
import type { SessionRefreshResult } from "@/lib/auth/server/authenticated-request";
import type { SessionData } from "@/types/auth/sessionData";
import type { User } from "@/types/auth/user";

const SESSION_COOKIE_DOMAIN = process.env.SESSION_COOKIE_DOMAIN || undefined;
const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

const sharedCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  ...(SESSION_COOKIE_DOMAIN ? { domain: SESSION_COOKIE_DOMAIN } : {}),
  path: "/",
};

function sessionFromAccessToken(accessToken: string): SessionData {
  const payload = decodeAccessToken(accessToken);
  if (!payload.id || !payload.email || !payload.accountType || !payload.exp) {
    throw new Error("Token de acesso sem dados de usuário.");
  }

  return {
    user: {
      id: payload.id,
      email: payload.email,
      accountType: payload.accountType,
      roles: Array.isArray(payload.roles) ? payload.roles : [payload.accountType],
    },
    accessToken,
    expiresAt: payload.exp * 1000,
  };
}

async function persistSession(session: SessionData) {
  (await cookies()).set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    ...sharedCookieOptions,
    expires: new Date(session.expiresAt),
  });
}

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

export async function createSessionFromAccessToken(accessToken: string) {
  const session = sessionFromAccessToken(accessToken);
  await persistSession(session);
  return session;
}

export async function persistRefreshToken(refreshToken: string) {
  (await cookies()).set(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    ...sharedCookieOptions,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

export async function refreshSessionResult(): Promise<SessionRefreshResult<SessionData>> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return { status: "missing", session: null };

  const refreshed = await requestRefreshSingleFlight({
    endpoint: `${API_URL}/auth/refresh`,
    refreshToken,
  });

  if (refreshed.status !== "success") {
    if (refreshed.status === "invalid") {
      try {
        await destroySession();
      } catch {
        // Server Components cannot mutate cookies. Their access guard still
        // receives the definitive invalid result and sends the user to login.
      }
    }
    return { status: refreshed.status, session: null };
  }

  try {
    const session = await createSessionFromAccessToken(refreshed.accessToken);
    if (refreshed.refreshToken) await persistRefreshToken(refreshed.refreshToken);
    return { status: "success", session };
  } catch {
    return { status: "unavailable", session: null };
  }
}

export async function refreshSession(): Promise<SessionData | null> {
  const result = await refreshSessionResult();
  return result.status === "success" ? result.session : null;
}

export async function getFreshSession(): Promise<SessionData | null> {
  const session = await getSession();
  if (session && session.expiresAt > Date.now() + SESSION_REFRESH_WINDOW_MS) {
    return session;
  }
  return refreshSession();
}

export async function destroySession() {
  const cookieStore = await cookies();
  const expired = {
    ...sharedCookieOptions,
    expires: new Date(0),
    maxAge: 0,
  };
  cookieStore.set(SESSION_COOKIE_NAME, "", expired);
  cookieStore.set(REFRESH_TOKEN_COOKIE_NAME, "", expired);
}
