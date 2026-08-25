"use server";

import { redirect } from "next/navigation";
import { normalizeApiBaseUrl } from "@/lib/api/base-url";
import { getSession } from "@/lib/auth/server/session";
import type { ActionResult } from "@/types/common";
import type { RolePermission, RolePermissionRole } from "@/types/role-permissions";

const API_URL = normalizeApiBaseUrl(process.env.API_BASE_URL);

export async function getRolePermissionsAction(role: RolePermissionRole): Promise<ActionResult<RolePermission[]>> {
  const session = await getSession();
  if (!session?.accessToken) redirect("/login?returnTo=/admin/leiloes");

  try {
    const response = await fetch(`${API_URL}/role-permissions/${encodeURIComponent(role)}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }, cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return { success: false, error: response.status === 403 ? "Seu perfil não pode consultar permissões." : "Não foi possível carregar as permissões." };
    return { success: true, data: payload as RolePermission[] };
  } catch {
    return { success: false, error: "Não foi possível consultar as permissões." };
  }
}
