import { NextRequest, NextResponse } from "next/server";
import { authenticatedFetch } from "@/lib/auth/server/authenticated-fetch";
import { normalizeApiBaseUrl } from "@/lib/api/base-url";
import { randomUUID } from "node:crypto";
import { getCloudflareDiagnosticTarget } from "@/lib/auctions/cloudflare-stream";

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const cloudflareSetup = path.length === 5 && path[0] === "manager" && path[1] === "auctions" && path[3] === "stream" && path[4] === "cloudflare";
  const correlationId = cloudflareSetup ? randomUUID() : undefined;
  const startedAt = Date.now();
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  for (const name of ["idempotency-key", "x-correlation-id"]) { const value = request.headers.get(name); if (value) headers.set(name, value); }
  if (correlationId) headers.set("x-correlation-id", correlationId);
  const target = `${API_URL}/auction-engine/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const diagnostic = { correlationId, auctionId: path[2], method: request.method, target: getCloudflareDiagnosticTarget(target) };
  if (cloudflareSetup) console.info("[cloudflare-stream]", { event: "proxy.request", ...diagnostic });
  try {
  const response = await authenticatedFetch(target, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(), cache: "no-store", signal: AbortSignal.timeout(15000) }, { auth: "optional" });
  if (cloudflareSetup) {
    const log = response.ok ? console.info : console.error;
    log("[cloudflare-stream]", { event: "proxy.response", ...diagnostic, httpStatus: response.status, durationMs: Date.now() - startedAt });
  }
  return new NextResponse(response.body, { status: response.status, headers: { "content-type": response.headers.get("content-type") || "application/json", "cache-control": "no-store", ...(correlationId ? { "x-correlation-id": correlationId } : {}) } });
  } catch (cause: unknown) {
    if (cloudflareSetup) {
      console.error("[cloudflare-stream]", { event: "proxy.connection_failed", ...diagnostic, durationMs: Date.now() - startedAt, errorType: cause instanceof Error && ["TypeError", "AbortError", "TimeoutError"].includes(cause.name) ? cause.name : "Error" });
      return NextResponse.json({ message: "Não foi possível conectar ao serviço de leilões.", correlationId }, { status: 503, headers: { "cache-control": "no-store", "x-correlation-id": correlationId! } });
    }
    return NextResponse.json({ message: "Não foi possível conectar ao serviço de leilões." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
