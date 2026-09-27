"use server";

import { cookies } from "next/headers";
import { normalizeApiBaseUrl } from "@/lib/api/base-url";
import { createSessionFromAccessToken, persistRefreshToken } from "@/lib/auth/server/session";

const API = normalizeApiBaseUrl(process.env.API_BASE_URL);
export type GooglePending = { email: string; name: string; accountType: string; needsName: boolean; needsPhone: boolean; needsDocument: boolean; linkRequired: boolean; passwordRequired: boolean; newAccount: boolean };

function errorMessage(value: { message?: string | string[] }) {
  return Array.isArray(value.message) ? value.message.join(" ") : value.message || "Não foi possível entrar com o Google.";
}

export async function getGooglePending(): Promise<GooglePending | null> {
  const value = (await cookies()).get("googlePendingDetails")?.value;
  if (!value || !(await cookies()).get("googlePending")) return null;
  try { return JSON.parse(value) as GooglePending; } catch { return null; }
}

export async function completeGoogleLogin(input: { confirmLink: boolean; acceptedTerms: boolean; password?: string; accountType: string; name: string; phone: string; cpf: string; cnpj: string }): Promise<{ success: true } | { success: false; error: string }> {
  const jar = await cookies();
  const pendingToken = jar.get("googlePending")?.value;
  if (!pendingToken) return { success: false, error: "A confirmação expirou. Entre novamente com o Google." };
  try {
    const res = await fetch(`${API}/auth/google/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pendingToken, ...input }), cache: "no-store" });
    const data = await res.json() as { accessToken?: string; refreshToken?: string; message?: string | string[] };
    if (!res.ok) return { success: false, error: errorMessage(data) };
    if (!data.accessToken) throw new Error("Token ausente");
    await createSessionFromAccessToken(data.accessToken);
    if (data.refreshToken) await persistRefreshToken(data.refreshToken);
    jar.delete("googlePending"); jar.delete("googlePendingDetails");
    return { success: true };
  } catch {
    return { success: false, error: "Não foi possível concluir o acesso. Tente novamente." };
  }
}
