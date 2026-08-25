import { NextRequest, NextResponse } from "next/server";
import { getFreshSession } from "@/lib/auth/server/session";
import { normalizeApiBaseUrl } from "@/lib/api/base-url";

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const session = await getFreshSession();
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  if (session?.accessToken) headers.set("authorization", `Bearer ${session.accessToken}`);
  for (const name of ["idempotency-key", "x-correlation-id"]) { const value = request.headers.get(name); if (value) headers.set(name, value); }
  const response = await fetch(`${API_URL}/auction-engine/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(), cache: "no-store" });
  return new NextResponse(response.body, { status: response.status, headers: { "content-type": response.headers.get("content-type") || "application/json" } });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
