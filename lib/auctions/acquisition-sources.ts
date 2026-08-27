export const acquisitionSourceOptions = [
  { value: "DIRECT", label: "Acesso direto" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "GOOGLE", label: "Google" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "REFERRAL", label: "Indicação" },
  { value: "ORGANIC", label: "Busca orgânica" },
  { value: "OTHER", label: "Outra origem" },
  { value: "UNKNOWN", label: "Não informado" },
] as const;

export type AcquisitionSource = (typeof acquisitionSourceOptions)[number]["value"];

const sourceAliases: Record<string, AcquisitionSource> = {
  direct: "DIRECT",
  whatsapp: "WHATSAPP",
  facebook: "FACEBOOK",
  instagram: "INSTAGRAM",
  google: "GOOGLE",
  tiktok: "TIKTOK",
  referral: "REFERRAL",
  organic: "ORGANIC",
  other: "OTHER",
};

export function acquisitionSourceLabel(source: string | null | undefined) {
  return acquisitionSourceOptions.find((option) => option.value === source)?.label ?? "Não informado";
}

export function detectAcquisitionSource(): AcquisitionSource {
  if (typeof window === "undefined") return "UNKNOWN";

  const querySource = window.location.search
    ? new URLSearchParams(window.location.search).get("utm_source")?.trim().toLowerCase()
    : undefined;
  if (querySource && sourceAliases[querySource]) return sourceAliases[querySource];

  const referrer = document.referrer;
  if (!referrer) return "DIRECT";
  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    if (hostname.includes("whatsapp")) return "WHATSAPP";
    if (hostname.includes("facebook") || hostname.includes("fb.")) return "FACEBOOK";
    if (hostname.includes("instagram")) return "INSTAGRAM";
    if (hostname.includes("google.")) return "GOOGLE";
    if (hostname.includes("tiktok")) return "TIKTOK";
    return "REFERRAL";
  } catch {
    return "OTHER";
  }
}
