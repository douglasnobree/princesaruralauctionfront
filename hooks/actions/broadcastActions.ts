"use server";

import { normalizeApiBaseUrl } from "@/lib/api/base-url";
import { authenticatedFetch } from "@/lib/auth/server/authenticated-fetch";
import type {
  BroadcastClientInfo,
  BroadcastConfig,
  BroadcastState,
} from "@/lib/broadcast/broadcast-types";
import type { ActionResult } from "@/types/common";

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

export type BroadcastTokenResult = {
  tokenId: string;
  token: string;
  auctionId: string;
  scope: "broadcast:read";
  expiresAt: string;
  clientLabel: string | null;
};

export type BroadcastTokenSummary = {
  id: string;
  clientLabel: string | null;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<ActionResult<T>> {
  try {
    const response = await authenticatedFetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as T & {
      message?: string;
      error?: string | { message?: string };
    };
    if (!response.ok) {
      if (response.status === 401) return { success: false, error: "Sua sessão expirou. Entre novamente para continuar.", errorCode: "AUTH_REQUIRED" };
      if (response.status === 403) return { success: false, error: "Você não possui permissão para operar a transmissão.", errorCode: "FORBIDDEN" };
      const error =
        typeof payload.error === "object" ? payload.error.message : payload.error;
      return {
        success: false,
        error: error || payload.message || "Não foi possível concluir a operação.",
      };
    }
    return { success: true, data: payload as T };
  } catch {
    return { success: false, error: "Não foi possível conectar ao backend." };
  }
}

export async function getBroadcastAdminStateAction(auctionId: string) {
  return request<BroadcastState>(
    `/broadcast/auctions/${encodeURIComponent(auctionId)}/admin-state`,
  );
}

export async function getBroadcastConfigAction(auctionId: string) {
  return request<BroadcastConfig>(
    `/broadcast/auctions/${encodeURIComponent(auctionId)}/config`,
  );
}

export async function getBroadcastClientsAction(auctionId: string) {
  return request<BroadcastClientInfo[]>(
    `/broadcast/auctions/${encodeURIComponent(auctionId)}/clients`,
  );
}

export async function updateBroadcastConfigAction(
  auctionId: string,
  input: Partial<BroadcastConfig>,
) {
  return request<BroadcastConfig>(
    `/broadcast/auctions/${encodeURIComponent(auctionId)}/config`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export async function rebroadcastAuctionStateAction(auctionId: string) {
  return request<BroadcastState>(
    `/broadcast/auctions/${encodeURIComponent(auctionId)}/rebroadcast`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function createBroadcastTokenAction(
  auctionId: string,
  input: { clientLabel?: string; expiresInDays?: number },
) {
  return request<BroadcastTokenResult>(
    `/broadcast/auctions/${encodeURIComponent(auctionId)}/tokens`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function listBroadcastTokensAction(auctionId: string) {
  return request<BroadcastTokenSummary[]>(
    `/broadcast/auctions/${encodeURIComponent(auctionId)}/tokens`,
  );
}

export async function revokeBroadcastTokenAction(auctionId: string, tokenId: string) {
  return request<{ success: boolean }>(
    `/broadcast/auctions/${encodeURIComponent(auctionId)}/tokens/${encodeURIComponent(tokenId)}`,
    { method: "DELETE" },
  );
}
