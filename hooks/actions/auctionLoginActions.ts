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
  | { success: true; ssoUrl?: string }
  | { success: false; error: string };

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

async function createMarketplaceSsoUrl(accessToken: string) {
  const marketplaceUrl = (
    process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  const auctionAppUrl = (
    process.env.NEXT_PUBLIC_AUCTION_APP_URL || "http://localhost:3001"
  ).replace(/\/$/, "");

  const response = await fetch(`${API_URL}/auth/sso/tickets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("SSO ticket could not be created");

  const data = (await response.json()) as { ticket?: string };
  if (!data.ticket) throw new Error("SSO ticket was not returned");

  const callbackUrl = new URL(`${marketplaceUrl}/api/auth/sso/callback`);
  callbackUrl.searchParams.set("ticket", data.ticket);
  callbackUrl.searchParams.set("returnTo", `${auctionAppUrl}/leiloes`);
  return callbackUrl.toString();
}

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

    let ssoUrl: string | undefined;
    try {
      ssoUrl = await createMarketplaceSsoUrl(result.accessToken);
    } catch {
      // O login local continua válido mesmo se o handoff estiver indisponível.
    }

    return { success: true, ssoUrl };
  } catch {
    return {
      success: false,
      error: "Não foi possível conectar ao servidor. Tente novamente.",
    };
  }
}
