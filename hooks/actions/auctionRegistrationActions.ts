"use server";

import { normalizeApiBaseUrl } from "@/lib/api/base-url";

type AccountType = "PERSON" | "COMPANY";

export type AuctionRegistrationInput = {
  accountType: AccountType;
  name: string;
  document: string;
  phone: string;
  email: string;
  password: string;
};

export type AuctionRegistrationResult =
  | { success: true }
  | { success: false; errors: Record<string, string[]> };

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

export async function registerAuctionAccountAction(
  input: AuctionRegistrationInput,
): Promise<AuctionRegistrationResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const document = input.document.replace(/\D/g, "");
  const phone = input.phone.replace(/\D/g, "");
  const errors: Record<string, string[]> = {};

  if (!name) errors.name = ["Informe seu nome completo."];
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = ["Informe um e-mail válido."];
  if (input.password.length < 6) errors.password = ["A senha deve ter no mínimo 6 caracteres."];

  const expectedDocumentLength = input.accountType === "PERSON" ? 11 : 14;
  if (document.length !== expectedDocumentLength) {
    errors.document = [
      input.accountType === "PERSON"
        ? "Informe um CPF válido com 11 dígitos."
        : "Informe um CNPJ válido com 14 dígitos.",
    ];
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const payload: Record<string, string> = {
    accountType: input.accountType,
    name,
    email,
    password: input.password,
    ...(phone ? { phone } : {}),
    ...(input.accountType === "PERSON" ? { cpf: document } : { cnpj: document }),
  };

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as {
        message?: string | string[];
      };
      const message = Array.isArray(result.message)
        ? result.message.join(" ")
        : result.message || "Não foi possível concluir o cadastro.";
      return { success: false, errors: { _form: [message] } };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      errors: { _form: ["Não foi possível conectar ao servidor. Tente novamente."] },
    };
  }
}
