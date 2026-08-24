import { NextRequest, NextResponse } from "next/server";
import { normalizeApiBaseUrl } from "@/lib/api/base-url";
import {
  createSessionFromAccessToken,
  persistRefreshToken,
} from "@/lib/auth/server/session";

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);
const MARKETPLACE_URL = (
  process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://localhost:3000"
).replace(/\/$/, "");

function getSafeReturnUrl(request: NextRequest) {
  const fallback = new URL("/leiloes", request.url);
  const requested = request.nextUrl.searchParams.get("returnTo");
  if (!requested) return fallback;

  try {
    const target = new URL(requested);
    if (target.origin === new URL(MARKETPLACE_URL).origin) return target;
  } catch {
    // Retorna para a página de leilões quando o destino não for válido.
  }

  return fallback;
}

export async function GET(request: NextRequest) {
  const ticket = request.nextUrl.searchParams.get("ticket");
  if (!ticket) {
    return NextResponse.redirect(new URL("/login?sso=invalid", request.url));
  }

  try {
    const response = await fetch(`${API_URL}/auth/sso/tickets/consume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL("/login?sso=expired", request.url));
    }

    const data = (await response.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!data.accessToken) {
      return NextResponse.redirect(new URL("/login?sso=invalid", request.url));
    }

    await createSessionFromAccessToken(data.accessToken);
    if (data.refreshToken) await persistRefreshToken(data.refreshToken);

    return NextResponse.redirect(getSafeReturnUrl(request));
  } catch {
    return NextResponse.redirect(new URL("/login?sso=unavailable", request.url));
  }
}
