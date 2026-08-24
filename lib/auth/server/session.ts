"use server";

import { cookies } from "next/headers";
import type { SessionData } from "@/types/auth/sessionData";
import type { User } from "@/types/auth/user";

const SESSION_COOKIE_NAME = "session";
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
const SESSION_COOKIE_DOMAIN = process.env.SESSION_COOKIE_DOMAIN || undefined;

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
