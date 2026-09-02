import { NextRequest, NextResponse } from "next/server";
import { normalizeApiBaseUrl } from "@/lib/api/base-url";
import {
  decodeAccessToken,
  REFRESH_TOKEN_COOKIE_NAME,
  requestRefreshSingleFlight,
  SESSION_COOKIE_NAME,
  SESSION_REFRESH_WINDOW_MS,
} from "@/lib/auth/server/refresh-coordinator";

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);
const DOMAIN = process.env.SESSION_COOKIE_DOMAIN || undefined;
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  ...(DOMAIN ? { domain: DOMAIN } : {}),
};

function loginUrl(request: NextRequest) {
  const login = new URL("/login", request.url);
  login.searchParams.set(
    "returnTo",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return login;
}

function expireAuthCookies(response: NextResponse) {
  const expired = { ...cookieOptions, expires: new Date(0), maxAge: 0 };
  response.cookies.set(SESSION_COOKIE_NAME, "", expired);
  response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, "", expired);
  return response;
}

function nextWithSession(
  request: NextRequest,
  sessionValue: string,
  expiresAt: number,
  refreshToken?: string,
) {
  request.cookies.set(SESSION_COOKIE_NAME, sessionValue);
  if (refreshToken) request.cookies.set(REFRESH_TOKEN_COOKIE_NAME, refreshToken);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("cookie", request.cookies.toString());
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(SESSION_COOKIE_NAME, sessionValue, {
    ...cookieOptions,
    expires: new Date(expiresAt),
  });
  if (refreshToken) {
    response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      ...cookieOptions,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value;

  let expiresAt = 0;
  try {
    expiresAt = Number(
      (JSON.parse(sessionCookie || "{}") as { expiresAt?: number }).expiresAt || 0,
    );
  } catch {
    expiresAt = 0;
  }

  if (sessionCookie && expiresAt > Date.now() + SESSION_REFRESH_WINDOW_MS) {
    return NextResponse.next();
  }

  if (!refreshToken) {
    if (request.method === "GET" || request.method === "HEAD") {
      return expireAuthCookies(NextResponse.redirect(loginUrl(request)));
    }
    return expireAuthCookies(NextResponse.next());
  }

  const refreshed = await requestRefreshSingleFlight({
    endpoint: `${API_URL}/auth/refresh`,
    refreshToken,
  });

  if (refreshed.status === "success") {
    const payload = decodeAccessToken(refreshed.accessToken);
    const refreshedExpiresAt = (payload.exp ?? 0) * 1000;
    const sessionValue = JSON.stringify({
      user: {
        id: payload.id,
        email: payload.email,
        accountType: payload.accountType,
        roles: Array.isArray(payload.roles) ? payload.roles : [payload.accountType],
      },
      accessToken: refreshed.accessToken,
      expiresAt: refreshedExpiresAt,
    });
    return nextWithSession(
      request,
      sessionValue,
      refreshedExpiresAt,
      refreshed.refreshToken,
    );
  }

  if (refreshed.status === "invalid") {
    if (request.method === "GET" || request.method === "HEAD") {
      return expireAuthCookies(NextResponse.redirect(loginUrl(request)));
    }
    return expireAuthCookies(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
