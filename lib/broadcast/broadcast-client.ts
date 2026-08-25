import type {
  BroadcastConfig,
  BroadcastState,
} from "@/lib/broadcast/broadcast-types";

function getApiBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
  return (configured || "http://localhost:4000/api").replace(/\/+$/, "");
}

function getApiOrigin() {
  return getApiBaseUrl().replace(/\/api$/i, "");
}

export function getBroadcastStateUrl(auctionId: string, token: string) {
  const url = new URL(
    `${getApiBaseUrl()}/broadcast/auctions/${encodeURIComponent(auctionId)}/state`,
  );
  url.searchParams.set("token", token);
  return url.toString();
}

export function getBroadcastWebSocketUrl(
  auctionId: string,
  token: string,
  clientId: string,
) {
  const protocol = getApiOrigin().startsWith("https") ? "wss:" : "ws:";
  const url = new URL(
    "/broadcast",
    `${protocol}//${new URL(getApiOrigin()).host}`,
  );
  url.searchParams.set("auctionId", auctionId);
  url.searchParams.set("token", token);
  url.searchParams.set("clientId", clientId);
  return url.toString();
}

export async function fetchBroadcastState(
  auctionId: string,
  token: string,
): Promise<BroadcastState> {
  const response = await fetch(getBroadcastStateUrl(auctionId, token), {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Token do overlay inválido ou expirado."
        : "Não foi possível recuperar o estado do leilão.",
    );
  }
  return (await response.json()) as BroadcastState;
}

export function parseBroadcastConfig(value: unknown): BroadcastConfig | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<BroadcastConfig>;
  if (
    typeof input.overlayDelayMs !== "number" ||
    typeof input.maxRecentBids !== "number"
  ) {
    return null;
  }
  return {
    overlayDelayMs: Math.max(0, input.overlayDelayMs),
    maxRecentBids: Math.max(1, Math.round(input.maxRecentBids)),
  };
}
