import "server-only";

import { cookies } from "next/headers";
import { normalizeApiBaseUrl } from "@/lib/api/base-url";
import { createSessionFromAccessToken, persistRefreshToken } from "@/lib/auth/server/session";
import type { GooglePending } from "./google-actions";

const API = normalizeApiBaseUrl(process.env.API_BASE_URL);
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
type StartResponse = GooglePending & { status: "pending" | "authenticated"; pendingToken?: string; accessToken?: string; refreshToken?: string; message?: string | string[] };

export async function startGoogleLogin(credential: string): Promise<{ success: true; pending: boolean } | { success: false }> {
  let stage = "api_request";
  try {
    const res = await fetch(`${API}/auth/google/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential }), cache: "no-store", signal: AbortSignal.timeout(15000) });
    stage = "api_response";
    if (!res.ok) {
      console.error("[auth/google] API rejeitou o início do login", { status: res.status });
      return { success: false };
    }
    const data = await res.json() as StartResponse;
    stage = "session";
    const jar = await cookies();
    if (data.status === "authenticated" && data.accessToken) {
      await createSessionFromAccessToken(data.accessToken);
      if (data.refreshToken) await persistRefreshToken(data.refreshToken);
      jar.delete("googlePending"); jar.delete("googlePendingDetails");
      return { success: true, pending: false };
    }
    if (data.status !== "pending" || !data.pendingToken) {
      console.error("[auth/google] Resposta inesperada da API", { status: data.status });
      return { success: false };
    }
    jar.set("googlePending", data.pendingToken, cookieOptions);
    jar.set("googlePendingDetails", JSON.stringify({ email: data.email, name: data.name, accountType: data.accountType, needsName: data.needsName, needsPhone: data.needsPhone, needsDocument: data.needsDocument, linkRequired: data.linkRequired, passwordRequired: data.passwordRequired, newAccount: data.newAccount }), cookieOptions);
    return { success: true, pending: true };
  } catch (error) {
    console.error("[auth/google] Falha ao iniciar login", { stage, error: error instanceof Error ? error.name : "unknown" });
    return { success: false };
  }
}
