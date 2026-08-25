import { NextRequest, NextResponse } from "next/server";
import { normalizeApiBaseUrl } from "@/lib/api/base-url";

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);
const SESSION_COOKIE = "session";
const REFRESH_COOKIE = "refreshToken";
const DOMAIN = process.env.SESSION_COOKIE_DOMAIN || undefined;

function decodePayload(token: string) {
  try {
    const encoded = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!encoded) return null;
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as { id?: string; email?: string; accountType?: string; roles?: string[]; exp?: number };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.next();

  let expiresAt = 0;
  try { expiresAt = Number((JSON.parse(sessionCookie || "{}") as { expiresAt?: number }).expiresAt || 0); } catch { /* A rota protegida fará o redirect. */ }
  if (sessionCookie && expiresAt > Date.now() + 30_000) return NextResponse.next();

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: `${REFRESH_COOKIE}=${refreshToken}` }, cache: "no-store" });
    if (!response.ok) return NextResponse.next();
    const data = await response.json().catch(() => ({})) as { accessToken?: string; refreshToken?: string };
    const payload = data.accessToken ? decodePayload(data.accessToken) : null;
    if (!data.accessToken || !payload?.id || !payload.email || !payload.accountType || !payload.exp) return NextResponse.next();

    const next = NextResponse.next();
    const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", ...(DOMAIN ? { domain: DOMAIN } : {}) };
    next.cookies.set(SESSION_COOKIE, JSON.stringify({ user: { id: payload.id, email: payload.email, accountType: payload.accountType, roles: Array.isArray(payload.roles) ? payload.roles : [payload.accountType] }, accessToken: data.accessToken, expiresAt: payload.exp * 1000 }), { ...cookieOptions, expires: new Date(payload.exp * 1000) });
    const setCookie = response.headers.get("set-cookie")?.match(/(?:^|;\s*)refreshToken=([^;]+)/)?.[1];
    if (data.refreshToken || setCookie) next.cookies.set(REFRESH_COOKIE, data.refreshToken || decodeURIComponent(setCookie || ""), { ...cookieOptions, expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    return next;
  } catch {
    return NextResponse.next();
  }
}

export const config = { matcher: ["/admin/:path*"] };


