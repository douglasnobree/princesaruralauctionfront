"use server";

import { normalizeApiBaseUrl } from "@/lib/api/base-url";
import { authenticatedFetch } from "@/lib/auth/server/authenticated-fetch";
import { getMarketplaceUrl } from "@/lib/config/urls";

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

function getMarketplaceDestination(pathname: string) {
  const marketplaceUrl = getMarketplaceUrl();
  const fallback = new URL("/busca", marketplaceUrl);

  try {
    const destination = new URL(pathname, marketplaceUrl);
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
  const marketplaceUrl = getMarketplaceUrl();

  try {
    const response = await authenticatedFetch(`${API_URL}/auth/sso/tickets`, {
      method: "POST",
      cache: "no-store",
    });

    if (!response.ok) throw new Error("SSO ticket could not be created");

    const data = (await response.json()) as { ticket?: string };
    if (!data.ticket) throw new Error("SSO ticket was not returned");

    const callbackUrl = new URL(`${marketplaceUrl}/sso`);
    callbackUrl.searchParams.set("ticket", data.ticket);
    callbackUrl.searchParams.set("returnTo", destination.toString());

    return { success: true, url: callbackUrl.toString() };
  } catch {
    // A falha no handoff não impede a navegação para a área pública.
    return { success: true, url: destination.toString() };
  }
}
