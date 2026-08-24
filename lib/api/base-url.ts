export function normalizeApiBaseUrl(value: string | undefined, fallback = "http://localhost:4000/api") {
  const normalized = (value || fallback).replace(/\/$/, "");
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

export function getApiOrigin(value: string | undefined) {
  return normalizeApiBaseUrl(value).replace(/\/api\/?$/, "");
}
