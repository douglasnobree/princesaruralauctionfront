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
  const key = "auction-acquisition-source";
  const remember = (source: AcquisitionSource) => {
    try { window.sessionStorage.setItem(key, source); } catch { /* Storage may be unavailable. */ }
    return source;
  };

  const querySource = window.location.search
    ? new URLSearchParams(window.location.search).get("utm_source")?.trim().toLowerCase()
    : undefined;
  if (querySource && sourceAliases[querySource]) return remember(sourceAliases[querySource]);

  try {
    const saved = window.sessionStorage.getItem(key);
    if (acquisitionSourceOptions.some((item) => item.value === saved)) return saved as AcquisitionSource;
  } catch { /* Continue with the current navigation. */ }

  const referrer = document.referrer;
  if (!referrer) return remember("DIRECT");
  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    if (hostname === window.location.hostname) return remember("DIRECT");
    if (hostname.includes("whatsapp")) return remember("WHATSAPP");
    if (hostname.includes("facebook") || hostname.includes("fb.")) return remember("FACEBOOK");
    if (hostname.includes("instagram")) return remember("INSTAGRAM");
    if (hostname.includes("google.")) return remember("GOOGLE");
    if (hostname.includes("tiktok")) return remember("TIKTOK");
    return remember("REFERRAL");
  } catch {
    return "OTHER";
  }
}
