import type { AuctionAdminStatus, AuctionLotAdminStatus } from "@/types/auction-admin";

const BRT_TIME_ZONE = "America/Sao_Paulo";
function datePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) { return parts.find((part) => part.type === type)?.value ?? ""; }
export function toDateTimeLocalBrt(value?: string | null) {
  if (!value) return "";
  const date = new Date(value); if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: BRT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return `${datePart(parts,"year")}-${datePart(parts,"month")}-${datePart(parts,"day")}T${datePart(parts,"hour")}:${datePart(parts,"minute")}`;
}
export function fromDateTimeLocalBrt(value?: string | null) { return value && /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/.test(value) ? `${value}:00-03:00` : undefined; }
export function formatAuctionDate(value?: string | null) { if (!value) return "Data não informada"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "Data não informada" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: BRT_TIME_ZONE }).format(date); }
export function formatAuctionStatus(status: AuctionAdminStatus) { return ({ DRAFT:"Rascunho", PRE_LAUNCH:"Pré-lance", COMING_SOON:"Em breve", WAITING_OPENING:"Aguardando abertura", OPEN:"Aberto", CLOSED:"Encerrado", CANCELLED:"Cancelado" } as Record<AuctionAdminStatus,string>)[status]; }
export function formatLotStatus(status: AuctionLotAdminStatus) { return ({ DRAFT:"Rascunho", PAUSED:"Pausado", OPEN:"Aberto", SOLD:"Vendido", CLOSED:"Encerrado", CANCELLED:"Cancelado" } as Record<AuctionLotAdminStatus,string>)[status]; }
export function getAuctionAssetUrl(value?: string | null) { if (!value) return "/placeholder-image.svg"; if (/^https?:\/\//i.test(value) || value.startsWith("/placeholder")) return value; const api = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/$/,""); const origin = api.replace(/\/api\/?$/,""); return value.startsWith("/uploads/") ? `${origin}${value}` : `${origin}/uploads/auctions/${value}`; }
export function formatCents(value?: number | null, currency = "BRL") { return value === undefined || value === null ? "—" : new Intl.NumberFormat("pt-BR", { style:"currency", currency }).format(value / 100); }
