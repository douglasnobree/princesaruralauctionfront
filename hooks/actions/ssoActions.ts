"use server";

import { normalizeApiBaseUrl } from "@/lib/api/base-url";
import { getAccessToken } from "@/lib/auth/server/session";

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);
const MARKETPLACE_URL = (
  process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://localhost:3000"
).replace(/\/$/, "");

function getMarketplaceDestination(pathname: string) {
  const fallback = new URL("/busca", MARKETPLACE_URL);

  try {
    const destination = new URL(pathname, MARKETPLACE_URL);
    if (destination.origin === fallback.origin && pathname.startsWith("/")) {
      return destination;
    }
  } catch {
    // Usa o destino padrão quando o caminho recebido não for válido.
  }

  return fallback;
}

export async function createMarketplaceHandoffAction(pathname = "/busca") {
  const destination = getMarketplaceDestination(pathname);
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { success: true, url: destination.toString() };
  }

  try {
    const response = await fetch(`${API_URL}/auth/sso/tickets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) throw new Error("SSO ticket could not be created");

    const data = (await response.json()) as { ticket?: string };
    if (!data.ticket) throw new Error("SSO ticket was not returned");

    const callbackUrl = new URL(`${MARKETPLACE_URL}/api/auth/sso/callback`);
    callbackUrl.searchParams.set("ticket", data.ticket);
    callbackUrl.searchParams.set("returnTo", destination.toString());

    return { success: true, url: callbackUrl.toString() };
  } catch {
    // A falha no handoff não impede a navegação para a área pública.
    return { success: true, url: destination.toString() };
  }
}
