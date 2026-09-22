import { NextRequest, NextResponse } from "next/server";
import { authenticatedFetch } from "@/lib/auth/server/authenticated-fetch";
import { normalizeApiBaseUrl } from "@/lib/api/base-url";

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  for (const name of ["idempotency-key", "x-correlation-id"]) { const value = request.headers.get(name); if (value) headers.set(name, value); }
  try {
  const response = await authenticatedFetch(`${API_URL}/auction-engine/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(), cache: "no-store", signal: AbortSignal.timeout(15000) }, { auth: "optional" });
  return new NextResponse(response.body, { status: response.status, headers: { "content-type": response.headers.get("content-type") || "application/json", "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Não foi possível conectar ao serviço de leilões." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
