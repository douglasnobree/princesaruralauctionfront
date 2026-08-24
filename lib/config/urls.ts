function readRuntimeEnv(name: string) {
  // Acesso por chave dinâmica impede que o Next congele a URL no build.
  return process.env[name]?.trim();
}

function normalizePublicUrl(value: string | undefined, fallback: string) {
  if (!value) return fallback;

  try {
    const url = new URL(value);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.hostname === "0.0.0.0"
    ) {
      return fallback;
    }

    return url.origin;
  } catch {
    return fallback;
  }
}

export function getMarketplaceUrl() {
  const configuredUrl =
    readRuntimeEnv("MARKETPLACE_URL") ||
    readRuntimeEnv("NEXT_PUBLIC_MARKETPLACE_URL");

  return normalizePublicUrl(
    configuredUrl,
    process.env.NODE_ENV === "production"
      ? "https://princesarural.com.br"
      : "http://localhost:3000",
  );
}
