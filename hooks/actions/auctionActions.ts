"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { normalizeApiBaseUrl } from "@/lib/api/base-url";
import { authenticatedFetch } from "@/lib/auth/server/authenticated-fetch";
import type { ActionResult } from "@/types/common";
import type { AuctionReport } from "@/types/auction-report";
import type { AuctionAdmin, AuctionAdminLot, AuctionAdminStatus, AuctionInput, AuctionLotAdminStatus, AuctionLotInput } from "@/types/auction-admin";
import type { AuctionWhatsAppMessage, AuctionWhatsAppMessagePage, AuctionWhatsAppSettings } from "@/types/auction-whatsapp";

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);
type AuctionFetchOptions = RequestInit & { headers?: HeadersInit };

async function auctionFetch(path: string, options: AuctionFetchOptions = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return authenticatedFetch(`${API_URL}${path}`, { ...options, headers });
}

async function responseError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => ({}))) as { message?: string | string[]; error?: string | { message?: string } };
  if (response.status === 401) return "Sua sessão expirou. Entre novamente para continuar.";
  if (response.status === 403) return "Você não possui permissão para esta operação.";
  const error = typeof payload.error === "object" ? payload.error?.message : payload.error;
  const message = Array.isArray(payload.message) ? payload.message.join(" ") : payload.message || error;
  if (!message || /^Cannot (GET|POST|PATCH|DELETE)/i.test(message) || /Prisma|stack trace|ECONNREFUSED/i.test(message)) return fallback;
  return message;
}

async function parseResponse<T>(response: Response, fallback: string): Promise<ActionResult<T>> {
  if (!response.ok) return { success: false, error: await responseError(response, fallback), errorCode: response.status === 401 ? "AUTH_REQUIRED" : response.status === 403 ? "FORBIDDEN" : undefined };
  const raw = await response.text();
  return { success: true, data: raw ? JSON.parse(raw) as T : undefined };
}

function revalidateAuctions() {
  revalidatePath("/admin/leiloes");
  revalidatePath("/admin/leiloes/novo");
  revalidatePath("/admin/leiloes/[id]", "page");
  revalidatePath("/admin/leiloes/[id]/lotes", "page");
  revalidatePath("/leiloes");
}

export async function getAdminAuctionsAction(status?: AuctionAdminStatus): Promise<ActionResult<AuctionAdmin[]>> {
  try { return parseResponse(await auctionFetch(`/auctions/manage${status ? `?status=${encodeURIComponent(status)}` : ""}`), "Não foi possível carregar os leilões."); }
  catch { return { success: false, error: "Não foi possível conectar ao serviço de leilões." }; }
}
export async function getAdminAuctionAction(id: string): Promise<ActionResult<AuctionAdmin>> {
  try { return parseResponse(await auctionFetch(`/auctions/manage/${encodeURIComponent(id)}`), "Leilão não encontrado."); }
  catch { return { success: false, error: "Não foi possível carregar o leilão." }; }
}
export async function getAdminAuctionReportAction(id: string): Promise<ActionResult<AuctionReport>> {
  try { return parseResponse(await auctionFetch(`/auctions/manage/${encodeURIComponent(id)}/report`), "Não foi possível carregar o relatório do leilão."); }
  catch { return { success: false, error: "Não foi possível conectar ao relatório do leilão." }; }
}
export async function createAuctionAction(data: AuctionInput): Promise<ActionResult<AuctionAdmin>> {
  try { const result = await parseResponse<AuctionAdmin>(await auctionFetch("/auctions", { method:"POST", body:JSON.stringify(data) }), "Não foi possível criar o leilão."); if (result.success) revalidateAuctions(); return result; }
  catch { return { success:false, error:"Não foi possível criar o leilão." }; }
}
export async function updateAuctionAction(id: string, data: Partial<AuctionInput>): Promise<ActionResult<AuctionAdmin>> {
  try { const result = await parseResponse<AuctionAdmin>(await auctionFetch(`/auctions/${encodeURIComponent(id)}`, { method:"PATCH", body:JSON.stringify(data) }), "Não foi possível atualizar o leilão."); if (result.success) revalidateAuctions(); return result; }
  catch { return { success:false, error:"Não foi possível atualizar o leilão." }; }
}
export async function publishAuctionAction(id: string): Promise<ActionResult<AuctionAdmin>> {
  try { const result = await parseResponse<AuctionAdmin>(await auctionFetch(`/auctions/${encodeURIComponent(id)}/publish`, { method:"PATCH" }), "Não foi possível publicar o leilão."); if (result.success) revalidateAuctions(); return result; }
  catch { return { success:false, error:"Não foi possível publicar o leilão." }; }
}
export async function cancelAuctionAction(id: string): Promise<ActionResult<AuctionAdmin>> {
  try { const result = await parseResponse<AuctionAdmin>(await auctionFetch(`/auctions/${encodeURIComponent(id)}/status`, { method:"PATCH", body:JSON.stringify({ status:"CANCELLED" }) }), "Não foi possível cancelar o leilão."); if (result.success) revalidateAuctions(); return result; }
  catch { return { success:false, error:"Não foi possível cancelar o leilão." }; }
}
export async function deleteAuctionAction(id: string): Promise<ActionResult<{message:string}>> {
  try { const result = await parseResponse<{message:string}>(await auctionFetch(`/auctions/${encodeURIComponent(id)}`, { method:"DELETE" }), "Não foi possível excluir o leilão."); if (result.success) revalidateAuctions(); return result; }
  catch { return { success:false, error:"Não foi possível excluir o leilão." }; }
}
export async function uploadAuctionCoverImageAction(id: string, file: File): Promise<ActionResult<AuctionAdmin>> {
  try { const form = new FormData(); form.append("image", file); const result = await parseResponse<AuctionAdmin>(await auctionFetch(`/auctions/${encodeURIComponent(id)}/cover-image`, { method:"POST", body:form }), "Não foi possível enviar a capa."); if (result.success) revalidateAuctions(); return result; }
  catch { return { success:false, error:"Não foi possível enviar a capa." }; }
}
export async function getAuctionLotsAction(auctionId: string): Promise<ActionResult<AuctionAdminLot[]>> {
  try { return parseResponse(await auctionFetch(`/auctions/${encodeURIComponent(auctionId)}/lots`), "Não foi possível carregar os lotes."); }
  catch { return { success:false, error:"Não foi possível carregar os lotes." }; }
}
export async function createAuctionLotAction(auctionId: string, data: AuctionLotInput): Promise<ActionResult<AuctionAdminLot>> {
  try { const result = await parseResponse<AuctionAdminLot>(await auctionFetch(`/auctions/${encodeURIComponent(auctionId)}/lots`, { method:"POST", body:JSON.stringify(data) }), "Não foi possível criar o lote."); if (result.success) revalidateAuctions(); return result; }
  catch { return { success:false, error:"Não foi possível criar o lote." }; }
}
export async function updateAuctionLotAction(auctionId: string, lotId: string, data: Partial<AuctionLotInput>): Promise<ActionResult<AuctionAdminLot>> {
  try { const result = await parseResponse<AuctionAdminLot>(await auctionFetch(`/auctions/${encodeURIComponent(auctionId)}/lots/${encodeURIComponent(lotId)}`, { method:"PATCH", body:JSON.stringify(data) }), "Não foi possível atualizar o lote."); if (result.success) revalidateAuctions(); return result; }
  catch { return { success:false, error:"Não foi possível atualizar o lote." }; }
}
export async function updateAuctionLotStatusAction(auctionId: string, lotId: string, status: AuctionLotAdminStatus): Promise<ActionResult<AuctionAdminLot>> {
  try { const result = await parseResponse<AuctionAdminLot>(await auctionFetch(`/auctions/${encodeURIComponent(auctionId)}/lots/${encodeURIComponent(lotId)}/status`, { method:"PATCH", body:JSON.stringify({ status }) }), "Não foi possível alterar o status do lote."); if (result.success) revalidateAuctions(); return result; }
  catch { return { success:false, error:"Não foi possível alterar o status do lote." }; }
}
export async function uploadAuctionLotImagesAction(auctionId: string, lotId: string, files: File[]): Promise<ActionResult<AuctionAdminLot>> {
  try { const form = new FormData(); files.forEach((file) => form.append("images", file)); const result = await parseResponse<AuctionAdminLot>(await auctionFetch(`/auctions/${encodeURIComponent(auctionId)}/lots/${encodeURIComponent(lotId)}/images`, { method:"POST", body:form }), "Não foi possível enviar as imagens."); if (result.success) revalidateAuctions(); return result; }
  catch { return { success:false, error:"Não foi possível enviar as imagens." }; }
}
export async function uploadAuctionLotGenealogyAction(auctionId: string, lotId: string, file: File): Promise<ActionResult<AuctionAdminLot>> {
  try { const form = new FormData(); form.append("genealogy", file); const result = await parseResponse<AuctionAdminLot>(await auctionFetch(`/auctions/${encodeURIComponent(auctionId)}/lots/${encodeURIComponent(lotId)}/genealogy`, { method:"POST", body:form }), "Não foi possível enviar a genealogia."); if (result.success) revalidateAuctions(); return result; }
  catch { return { success:false, error:"Não foi possível enviar a genealogia." }; }
}
export async function deleteAuctionLotGenealogyAction(auctionId: string, lotId: string): Promise<ActionResult<{message:string}>> {
  try { const result = await parseResponse<{message:string}>(await auctionFetch(`/auctions/${encodeURIComponent(auctionId)}/lots/${encodeURIComponent(lotId)}/genealogy`, { method:"DELETE" }), "Não foi possível excluir a genealogia."); if (result.success) revalidateAuctions(); return result; }
  catch { return { success:false, error:"Não foi possível excluir a genealogia." }; }
}
export async function deleteAuctionLotAction(auctionId: string, lotId: string): Promise<ActionResult<{message:string}>> {
  try { const result = await parseResponse<{message:string}>(await auctionFetch(`/auctions/${encodeURIComponent(auctionId)}/lots/${encodeURIComponent(lotId)}`, { method:"DELETE" }), "Não foi possível excluir o lote."); if (result.success) revalidateAuctions(); return result; }
  catch { return { success:false, error:"Não foi possível excluir o lote." }; }
}
export async function deleteAuctionLotImageAction(auctionId: string, lotId: string, imageId: string): Promise<ActionResult<{message:string}>> {
  try { const result = await parseResponse<{message:string}>(await auctionFetch(`/auctions/${encodeURIComponent(auctionId)}/lots/${encodeURIComponent(lotId)}/images/${encodeURIComponent(imageId)}`, { method:"DELETE" }), "Não foi possível excluir a imagem."); if (result.success) revalidateAuctions(); return result; }
  catch { return { success:false, error:"Não foi possível excluir a imagem." }; }
}
export async function reorderAuctionLotsAction(auctionId: string, lotIds: string[]): Promise<ActionResult<AuctionAdminLot[]>> {
  try { const result = await parseResponse<AuctionAdminLot[]>(await auctionFetch(`/auctions/${encodeURIComponent(auctionId)}/lots/reorder`, { method:"PATCH", body:JSON.stringify({ lotIds }) }), "Não foi possível reordenar os lotes."); if (result.success) revalidateAuctions(); return result; }
  catch { return { success:false, error:"Não foi possível reordenar os lotes." }; }
}

export async function getAuctionWhatsAppSettingsAction(auctionId: string): Promise<ActionResult<AuctionWhatsAppSettings>> {
  try { return parseResponse(await auctionFetch(`/auctions/manage/${encodeURIComponent(auctionId)}/whatsapp-settings`, { cache: "no-store" }), "Não foi possível carregar a configuração do WhatsApp."); }
  catch { return { success: false, error: "Não foi possível carregar a configuração do WhatsApp." }; }
}

export async function updateAuctionWhatsAppSettingsAction(auctionId: string, input: Partial<Pick<AuctionWhatsAppSettings, "automationEnabled" | "participationApprovedEnabled" | "bidAcceptedEnabled" | "outbidEnabled" | "lotWonEnabled">>): Promise<ActionResult<AuctionWhatsAppSettings>> {
  try { return parseResponse(await auctionFetch(`/auctions/manage/${encodeURIComponent(auctionId)}/whatsapp-settings`, { method: "PATCH", body: JSON.stringify(input) }), "Não foi possível salvar a configuração do WhatsApp."); }
  catch { return { success: false, error: "Não foi possível salvar a configuração do WhatsApp." }; }
}

export async function getAuctionWhatsAppMessagesAction(auctionId: string, cursor?: string): Promise<ActionResult<AuctionWhatsAppMessagePage>> {
  try { return parseResponse(await auctionFetch(`/auctions/manage/${encodeURIComponent(auctionId)}/whatsapp-messages?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, { cache: "no-store" }), "Não foi possível carregar o histórico do WhatsApp."); }
  catch { return { success: false, error: "Não foi possível carregar o histórico do WhatsApp." }; }
}

export async function sendAuctionWhatsAppMessageAction(auctionId: string, participantId: string, input: { text: string; allowWithoutConsent: boolean; lotId?: string }): Promise<ActionResult<AuctionWhatsAppMessage>> {
  try { return parseResponse(await auctionFetch(`/auctions/manage/${encodeURIComponent(auctionId)}/participants/${encodeURIComponent(participantId)}/whatsapp-messages`, { method: "POST", headers: { "Idempotency-Key": randomUUID() }, body: JSON.stringify(input) }), "Não foi possível enviar a mensagem."); }
  catch { return { success: false, error: "Não foi possível enviar a mensagem." }; }
}
