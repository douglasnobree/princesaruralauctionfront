"use server";

import { normalizeApiBaseUrl } from "@/lib/api/base-url";
import { authenticatedFetch } from "@/lib/auth/server/authenticated-fetch";
import type { ActionResult } from "@/types/common";
import type { RolePermission, RolePermissionRole } from "@/types/role-permissions";

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

export async function getRolePermissionsAction(role: RolePermissionRole): Promise<ActionResult<RolePermission[]>> {
  try {
    const response = await authenticatedFetch(`${API_URL}/role-permissions/${encodeURIComponent(role)}`, {
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return {
      success: false,
      error: response.status === 401
        ? "Sua sessão expirou. Entre novamente para continuar."
        : response.status === 403
          ? "Seu perfil não pode consultar permissões."
          : "Não foi possível carregar as permissões.",
      errorCode: response.status === 401 ? "AUTH_REQUIRED" : response.status === 403 ? "FORBIDDEN" : undefined,
    };
    return { success: true, data: payload as RolePermission[] };
  } catch {
    return { success: false, error: "Não foi possível consultar as permissões." };
  }
}
