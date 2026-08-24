import { NextRequest, NextResponse } from "next/server";
import { normalizeApiBaseUrl } from "@/lib/api/base-url";
import {
  createSessionFromAccessToken,
  persistRefreshToken,
} from "@/lib/auth/server/session";
import {
  getAuctionAppUrl,
  getMarketplaceUrl,
} from "@/lib/config/urls";

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

function getSafeReturnUrl(request: NextRequest) {
  const auctionUrl = getAuctionAppUrl();
  const fallback = new URL("/leiloes", auctionUrl);
  const requested = request.nextUrl.searchParams.get("returnTo");
  if (!requested) return fallback;

  try {
    const target = new URL(requested);
    const allowedOrigins = new Set([
      new URL(auctionUrl).origin,
      new URL(getMarketplaceUrl()).origin,
    ]);
    if (allowedOrigins.has(target.origin)) return target;
  } catch {
    // Retorna para a página de leilões quando o destino não for válido.
  }

  return fallback;
}

function getSsoErrorUrl(error: "invalid" | "expired" | "unavailable") {
  const loginUrl = new URL("/login", getAuctionAppUrl());
  loginUrl.searchParams.set("sso", error);
  return loginUrl;
}

export async function GET(request: NextRequest) {
  const ticket = request.nextUrl.searchParams.get("ticket");
  if (!ticket) {
    return NextResponse.redirect(getSsoErrorUrl("invalid"));
  }

  try {
    const response = await fetch(`${API_URL}/auth/sso/tickets/consume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.redirect(
        getSsoErrorUrl(response.status === 401 ? "expired" : "unavailable"),
      );
    }

    const data = (await response.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!data.accessToken) {
      return NextResponse.redirect(getSsoErrorUrl("invalid"));
    }

    await createSessionFromAccessToken(data.accessToken);
    if (data.refreshToken) await persistRefreshToken(data.refreshToken);

    return NextResponse.redirect(getSafeReturnUrl(request));
  } catch {
    return NextResponse.redirect(getSsoErrorUrl("unavailable"));
  }
}
