"use server";

import { normalizeApiBaseUrl } from "@/lib/api/base-url";
import {
  createSessionFromAccessToken,
  persistRefreshToken,
} from "@/lib/auth/server/session";

export type AuctionLoginInput = {
  login: string;
  loginType: "email" | "cpf" | "cnpj";
  password: string;
};

export type AuctionLoginResult =
  | { success: true }
  | { success: false; error: string };

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

export async function loginAuctionAction(
  input: AuctionLoginInput,
): Promise<AuctionLoginResult> {
  const login = input.login.trim();
  const password = input.password;

  if (!login) return { success: false, error: "Informe seu e-mail, CPF ou CNPJ." };
  if (password.length < 6) return { success: false, error: "A senha deve ter no mínimo 6 caracteres." };

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: input.loginType === "email" ? login.toLowerCase() : login.replace(/\D/g, ""),
        loginType: input.loginType,
        password,
      }),
      cache: "no-store",
    });

    const result = (await response.json().catch(() => ({}))) as {
      accessToken?: string;
      refreshToken?: string;
      message?: string | string[];
    };

    if (!response.ok) {
      const message = Array.isArray(result.message)
        ? result.message.join(" ")
        : result.message || "Credenciais inválidas.";
      return { success: false, error: message };
    }

    if (!result.accessToken) {
      return { success: false, error: "O servidor não retornou o token de acesso." };
    }

    await createSessionFromAccessToken(result.accessToken);

    const setCookieHeader = response.headers.get("set-cookie");
    const refreshTokenFromCookie = setCookieHeader?.match(/refreshToken=([^;]+)/)?.[1];
    const refreshToken = result.refreshToken || refreshTokenFromCookie;
    if (refreshToken) await persistRefreshToken(refreshToken);
    // O login do leilão permanece no leilão. O handoff para o marketplace
    // é criado somente quando o usuário clica em Mercado ou Shopping.
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Não foi possível conectar ao servidor. Tente novamente.",
    };
  }
}
