"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server/session";
import type { ActionResult } from "@/types/common";
import type { AuctionParticipantSearchResult, EngineAuctionRegistration, EngineAuctionRegistrationPage, EngineAuctionSnapshot, EngineBidHistoryPage, EngineBidHistoryQuery, EngineBidManagementResult, EngineBidResult, EngineOwnProxyBid, EnginePendingBidsPage, EngineRealtimeTicket, EngineStream } from "@/lib/auctions/engine-types";
import { explainEngineError, getEngineErrorCode } from "@/lib/auctions/engine-errors";
import { normalizeApiBaseUrl } from "@/lib/api/base-url";

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

async function authenticatedHeaders() {
  const session = await getSession();
  if (!session?.accessToken) redirect("/login");
  return { Authorization: `Bearer ${session.accessToken}` };
}

async function optionalAuthenticatedHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  return session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

function authenticationRequired<T>(): ActionResult<T> {
  return {
    success: false,
    error: "Entre ou crie uma conta para participar deste leilão.",
    errorCode: "AUTH_REQUIRED",
  };
}

async function parse<T>(response: Response, fallback: string): Promise<ActionResult<T>> {
  const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string; code?: string; details?: Record<string, unknown> } | string; code?: string; message?: string; correlationId?: string };
  if (!response.ok) {
    const errorObject = typeof payload.error === "object" && payload.error !== null ? payload.error : undefined;
    const code = getEngineErrorCode(payload);
    const rawMessage = errorObject?.message || payload.message || (typeof payload.error === "string" ? payload.error : undefined) || fallback;
    return { success: false, error: explainEngineError(code, rawMessage, errorObject?.details), errorCode: code, errorDetails: errorObject?.details, correlationId: payload.correlationId };
  }
  return { success: true, data: payload as T };
}

export async function getEngineSnapshotAction(auctionId: string): Promise<ActionResult<EngineAuctionSnapshot>> {
  try {
    const response = await fetch(`${API_URL}/auction-engine/auctions/${encodeURIComponent(auctionId)}/snapshot`, { cache: "no-store" });
    return parse(response, "Não foi possível carregar o estado do leilão.");
  } catch { return { success: false, error: "O motor de leilão está indisponível." }; }
}

export async function registerAuctionAction(auctionId: string, termsVersion: string): Promise<ActionResult<EngineAuctionRegistration>> {
  try {
    const authHeaders = await optionalAuthenticatedHeaders();
    if (!authHeaders.Authorization) return authenticationRequired<EngineAuctionRegistration>();
    const response = await fetch(`${API_URL}/auction-engine/auctions/${encodeURIComponent(auctionId)}/registration`, { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: JSON.stringify({ termsVersion }), cache: "no-store" });
    return parse(response, "Não foi possível habilitar sua participação.");
  } catch { return { success: false, error: "Não foi possível conectar ao motor de leilão." }; }
}

export async function listAuctionRegistrationsAction(auctionId: string, query: { cursor?: string; limit?: string } = {}): Promise<ActionResult<EngineAuctionRegistrationPage>> {
  try {
    const params = new URLSearchParams();
    if (query.limit) params.set("limit", query.limit);
    if (query.cursor) params.set("cursor", query.cursor);
    const response = await fetch(`${API_URL}/auction-engine/manager/auctions/${encodeURIComponent(auctionId)}/registrations${params.size ? `?${params.toString()}` : ""}`, { headers: await authenticatedHeaders(), cache: "no-store" });
    return parse(response, "Não foi possível carregar as solicitações de participação.");
  } catch { return { success: false, error: "Não foi possível consultar as solicitações agora." }; }
}

export async function setAuctionRegistrationEnabledAction(auctionId: string, registrationId: string, enabled: boolean): Promise<ActionResult<EngineAuctionRegistration>> {
  try {
    const response = await fetch(`${API_URL}/auction-engine/manager/auctions/${encodeURIComponent(auctionId)}/registrations/${encodeURIComponent(registrationId)}`, { method: "PUT", headers: { ...(await authenticatedHeaders()), "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: JSON.stringify({ enabled }), cache: "no-store" });
    return parse(response, enabled ? "Não foi possível habilitar este participante." : "Não foi possível bloquear este participante.");
  } catch { return { success: false, error: "Não foi possível atualizar a habilitação agora." }; }
}

export async function getAuctionRegistrationAction(auctionId: string): Promise<ActionResult<EngineAuctionRegistration | null>> {
	try {
		const response = await fetch(`${API_URL}/auction-engine/auctions/${encodeURIComponent(auctionId)}/registration`, { headers: await optionalAuthenticatedHeaders(), cache: "no-store" });
		return parse(response, "Não foi possível verificar sua participação.");
	} catch { return { success: false, error: "Não foi possível verificar sua participação agora." }; }
}

export async function listManagerLotBidsAction(auctionId: string, lotId: string, query: EngineBidHistoryQuery = {}): Promise<ActionResult<EngineBidHistoryPage>> {
  try {
    const params = new URLSearchParams();
    if (query.limit) params.set("limit", query.limit);
    if (query.beforeSequence) params.set("beforeSequence", query.beforeSequence);
    const response = await fetch(`${API_URL}/auction-engine/manager/auctions/${encodeURIComponent(auctionId)}/lots/${encodeURIComponent(lotId)}/bids${params.size ? `?${params.toString()}` : ""}`, { headers: await authenticatedHeaders(), cache: "no-store" });
    return parse(response, "Não foi possível carregar o histórico de lances.");
  } catch { return { success: false, error: "Não foi possível consultar o histórico de lances agora." }; }
}

export async function updateManagerBidAction(bidId: string, input: { amountCents: string; reason: string; expectedVersion?: string }): Promise<ActionResult<EngineBidManagementResult>> {
  try {
    const response = await fetch(`${API_URL}/auction-engine/manager/bids/${encodeURIComponent(bidId)}`, { method: "PATCH", headers: { ...(await authenticatedHeaders()), "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: JSON.stringify(input), cache: "no-store" });
    return parse(response, "Não foi possível corrigir o lance.");
  } catch { return { success: false, error: "Não foi possível atualizar o lance agora." }; }
}

export async function deleteManagerBidAction(bidId: string, input: { reason: string; expectedVersion?: string }): Promise<ActionResult<EngineBidManagementResult>> {
  try {
    const response = await fetch(`${API_URL}/auction-engine/manager/bids/${encodeURIComponent(bidId)}`, { method: "DELETE", headers: { ...(await authenticatedHeaders()), "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: JSON.stringify(input), cache: "no-store" });
    return parse(response, "Não foi possível anular o lance.");
  } catch { return { success: false, error: "Não foi possível anular o lance agora." }; }
}

/** @deprecated The approval queue is legacy and intentionally disabled. */
export async function listManagerPendingBidsAction(auctionId: string): Promise<ActionResult<EnginePendingBidsPage>> {
  try {
    const response = await fetch(`${API_URL}/auction-engine/manager/auctions/${encodeURIComponent(auctionId)}/pending-bids?limit=100`, { headers: await authenticatedHeaders(), cache: "no-store" });
    return parse(response, "NÃ£o foi possÃ­vel carregar os prÃ©-lances pendentes.");
  } catch { return { success: false, error: "NÃ£o foi possÃ­vel consultar os prÃ©-lances pendentes agora." }; }
}

/** @deprecated The approval queue is legacy and intentionally disabled. */
export async function approveManagerBidAction(bidRequestId: string): Promise<ActionResult<EngineBidResult>> {
  try {
    const response = await fetch(`${API_URL}/auction-engine/manager/bids/${encodeURIComponent(bidRequestId)}/approve`, { method: "POST", headers: { ...(await authenticatedHeaders()), "Idempotency-Key": randomUUID() }, cache: "no-store" });
    return parse(response, "NÃ£o foi possÃ­vel aprovar o prÃ©-lance.");
  } catch { return { success: false, error: "NÃ£o foi possÃ­vel aprovar o prÃ©-lance agora." }; }
}

/** @deprecated The approval queue is legacy and intentionally disabled. */
export async function rejectManagerBidAction(bidRequestId: string, reason: string): Promise<ActionResult<EngineBidResult>> {
  try {
    const response = await fetch(`${API_URL}/auction-engine/manager/bids/${encodeURIComponent(bidRequestId)}/reject`, { method: "POST", headers: { ...(await authenticatedHeaders()), "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: JSON.stringify({ reason }), cache: "no-store" });
    return parse(response, "NÃ£o foi possÃ­vel rejeitar o prÃ©-lance.");
  } catch { return { success: false, error: "NÃ£o foi possÃ­vel rejeitar o prÃ©-lance agora." }; }
}

async function submitBid(path: string, body: Record<string, string>): Promise<ActionResult<EngineBidResult>> {
  try {
    const authHeaders = await optionalAuthenticatedHeaders();
    if (!authHeaders.Authorization) return authenticationRequired<EngineBidResult>();
    const response = await fetch(`${API_URL}${path}`, { method: path.endsWith("proxy-bid") ? "PUT" : "POST", headers: { ...authHeaders, "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: JSON.stringify(body), cache: "no-store" });
    return parse(response, "O lance não foi aceito.");
  } catch { return { success: false, error: "Não foi possível enviar o lance." }; }
}

export async function placeBidAction(auctionId: string, lotId: string, amountCents: string, expectedVersion?: string) { return submitBid(`/auction-engine/auctions/${encodeURIComponent(auctionId)}/lots/${encodeURIComponent(lotId)}/bids`, { amountCents, ...(expectedVersion ? { expectedVersion } : {}) }); }
export async function setProxyBidAction(auctionId: string, lotId: string, maxBidCents: string, expectedVersion?: string) { return submitBid(`/auction-engine/auctions/${encodeURIComponent(auctionId)}/lots/${encodeURIComponent(lotId)}/proxy-bid`, { amountCents: maxBidCents, ...(expectedVersion ? { expectedVersion } : {}) }); }

export async function getOwnProxyBidAction(auctionId: string, lotId: string): Promise<ActionResult<EngineOwnProxyBid>> {
	try {
		const response = await fetch(`${API_URL}/auction-engine/auctions/${encodeURIComponent(auctionId)}/lots/${encodeURIComponent(lotId)}/proxy-bid`, { headers: await optionalAuthenticatedHeaders(), cache: "no-store" });
		return parse(response, "Não foi possível consultar seu teto automático.");
	} catch { return { success: false, error: "Não foi possível consultar seu teto automático agora." }; }
}

export type SandboxAuction = {
  auctionId: string;
  externalAuctionId: string;
  title: string;
  status: string;
  mode: string;
  participantId: string;
  lots: Array<{ id: string; externalLotId: string; lotNumber: number; title: string; status?: string }>;
};

export async function createSandboxAuctionAction(input: { label?: string; lotCount?: number } = {}): Promise<ActionResult<SandboxAuction>> {
  try {
    const response = await fetch(`${API_URL}/auction-engine/sandbox/auctions`, { method: "POST", headers: { ...(await authenticatedHeaders()), "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: JSON.stringify(input), cache: "no-store" });
    return parse(response, "Não foi possível criar o leilão de teste.");
  } catch { return { success: false, error: "Não foi possível conectar ao ambiente de teste." }; }
}

export async function reserveShoppingLotAction(auctionId: string, lotId: string, quantity = 1): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const authHeaders = await optionalAuthenticatedHeaders();
    if (!authHeaders.Authorization) return authenticationRequired<Record<string, unknown>>();
    const response = await fetch(`${API_URL}/auction-engine/auctions/${encodeURIComponent(auctionId)}/lots/${encodeURIComponent(lotId)}/reservation`, { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: JSON.stringify({ quantity }), cache: "no-store" });
    return parse(response, "Não foi possível reservar este lote.");
  } catch { return { success: false, error: "Não foi possível enviar a reserva." }; }
}

export async function issueRealtimeTicketAction(auctionId: string): Promise<ActionResult<EngineRealtimeTicket>> {
  try {
		const response = await fetch(`${API_URL}/auction-engine/auctions/${encodeURIComponent(auctionId)}/realtime/tickets`, { method: "POST", headers: { ...(await optionalAuthenticatedHeaders()), "Idempotency-Key": randomUUID() }, cache: "no-store" });
    return parse(response, "Não foi possível conectar ao tempo real.");
  } catch { return { success: false, error: "Tempo real indisponível; atualize a página para consultar o snapshot." }; }
}

export async function managerAuctionCommandAction(auctionId: string, action: string, expectedVersion?: string): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const response = await fetch(`${API_URL}/auction-engine/manager/auctions/${encodeURIComponent(auctionId)}/${action}`, { method: "POST", headers: { ...(await authenticatedHeaders()), "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: JSON.stringify(expectedVersion ? { expectedVersion } : {}), cache: "no-store" });
    const result = await parse<Record<string, unknown>>(response, "Não foi possível executar o comando do manager.");
    if (result.success) revalidatePath(`/admin/leiloes/${auctionId}`);
    return result;
  } catch { return { success: false, error: "Não foi possível executar o comando do manager." }; }
}

export async function managerLotCommandAction(auctionId: string, lotId: string, action: string, expectedVersion?: string): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const response = await fetch(`${API_URL}/auction-engine/manager/auctions/${encodeURIComponent(auctionId)}/lots/${encodeURIComponent(lotId)}/${action}`, { method: "POST", headers: { ...(await authenticatedHeaders()), "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: JSON.stringify(expectedVersion ? { expectedVersion } : {}), cache: "no-store" });
    return parse(response, "Não foi possível alterar o estado do lote.");
  } catch { return { success: false, error: "Não foi possível conectar ao control room." }; }
}

export async function searchAuctionParticipantsAction(query: string): Promise<ActionResult<AuctionParticipantSearchResult[]>> {
  try {
    const response = await fetch(`${API_URL}/auction-engine/manager/participants?q=${encodeURIComponent(query)}`, { headers: await authenticatedHeaders(), cache: "no-store" });
    return parse(response, "Não foi possível pesquisar os usuários.");
  } catch { return { success: false, error: "Não foi possível pesquisar os usuários agora." }; }
}

export async function searchAuctionParticipantsFormAction(
  _previousState: ActionResult<AuctionParticipantSearchResult[]>,
  formData: FormData,
): Promise<ActionResult<AuctionParticipantSearchResult[]>> {
  const query = String(formData.get("query") ?? "").trim();
  if (query.length < 2) return { success: false, error: "Digite pelo menos 2 caracteres para pesquisar." };

  const result = await searchAuctionParticipantsAction(query);
  if (result.success && result.data?.length === 0) return { success: false, error: "Nenhum usuário cadastrado foi encontrado.", data: [] };
  return result;
}

export async function setAuctionParticipantEligibilityAction(userId: string, enabled: boolean): Promise<ActionResult<AuctionParticipantSearchResult>> {
  try {
    const response = await fetch(`${API_URL}/auction-engine/manager/participants/${encodeURIComponent(userId)}/eligibility`, {
      method: "PUT",
      headers: { ...(await authenticatedHeaders()), "Content-Type": "application/json", "Idempotency-Key": randomUUID() },
      body: JSON.stringify({ enabled }),
      cache: "no-store",
    });
    return parse(response, enabled ? "Não foi possível habilitar este usuário." : "Não foi possível bloquear este usuário.");
  } catch { return { success: false, error: "Não foi possível atualizar a habilitação global agora." }; }
}

export async function managerFloorBidAction(auctionId: string, lotId: string, input: { participantId: string; amountCents: string; origin: "FLOOR" | "PHONE"; expectedVersion?: string }): Promise<ActionResult<EngineBidResult>> {
  try {
    const response = await fetch(`${API_URL}/auction-engine/manager/auctions/${encodeURIComponent(auctionId)}/lots/${encodeURIComponent(lotId)}/floor-bids`, { method: "POST", headers: { ...(await authenticatedHeaders()), "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: JSON.stringify(input), cache: "no-store" });
    return parse(response, "Não foi possível registrar o lance assistido.");
  } catch { return { success: false, error: "Não foi possível enviar o lance assistido agora." }; }
}

function parseBidAmountToCents(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return `${BigInt(whole)}${fraction.padEnd(2, "0")}`.replace(/^0+(?=\d)/, "");
}

export async function managerFloorBidFormAction(
  auctionId: string,
  _previousState: ActionResult<EngineBidResult>,
  formData: FormData,
): Promise<ActionResult<EngineBidResult>> {
  const lotId = String(formData.get("lotId") ?? "").trim();
  const participantId = String(formData.get("participantId") ?? "").trim();
  const amountCents = parseBidAmountToCents(String(formData.get("amount") ?? ""));
  const origin = formData.get("origin");
  const expectedVersion = String(formData.get("expectedVersion") ?? "").trim();

  if (!lotId) return { success: false, error: "Escolha um lote aberto." };
  if (!participantId) return { success: false, error: "Escolha o usuário que está ofertando o lance." };
  if (!amountCents) return { success: false, error: "Informe um valor de lance válido." };
  if (origin !== "FLOOR" && origin !== "PHONE") return { success: false, error: "Escolha uma origem de lance válida." };

  return managerFloorBidAction(auctionId, lotId, {
    participantId,
    amountCents,
    origin,
    ...(expectedVersion ? { expectedVersion } : {}),
  });
}

export async function managerStreamAction(auctionId: string, input: { provider: string; status: string; playbackUrl?: string; providerStreamId?: string }): Promise<ActionResult<EngineStream>> {
  try {
    const response = await fetch(`${API_URL}/auction-engine/manager/auctions/${encodeURIComponent(auctionId)}/stream`, { method: "PUT", headers: { ...(await authenticatedHeaders()), "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: JSON.stringify(input), cache: "no-store" });
    return parse(response, "Não foi possível atualizar a transmissão.");
  } catch { return { success: false, error: "Não foi possível conectar ao control room." }; }
}
