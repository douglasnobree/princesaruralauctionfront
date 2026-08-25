import { redirect } from "next/navigation";
import { getRolePermissionsAction } from "@/hooks/actions/rolePermissionActions";
import { getSession } from "@/lib/auth/server/session";
import { AUCTION_MANAGEMENT_ROLES, PERMISSION_MODULE_KEYS, ROLE_PERMISSION_ROLES, type RolePermission } from "@/types/role-permissions";

function hasModule(permissions: RolePermission[] | null, key: string) {
  return permissions?.some((permission) => permission.key === key && permission.enabled) ?? false;
}

export async function getAuctionManagementAccess() {
  const session = await getSession();
  if (!session?.user) redirect("/login?returnTo=/admin/leiloes");
  if (session.expiresAt <= Date.now()) redirect("/login?returnTo=/admin/leiloes");

  if (!ROLE_PERMISSION_ROLES.includes(session.user.accountType as (typeof ROLE_PERMISSION_ROLES)[number])) {
    redirect("/acesso-negado");
  }

  if (!AUCTION_MANAGEMENT_ROLES.includes(session.user.accountType as (typeof AUCTION_MANAGEMENT_ROLES)[number])) {
    redirect("/acesso-negado");
  }

  const role = session.user.accountType as (typeof ROLE_PERMISSION_ROLES)[number];
  const permissionsResult = await getRolePermissionsAction(role);
  const permissions = permissionsResult.data ?? null;
  const isAdmin = role === "ADMIN";
  if (!isAdmin && !hasModule(permissions, PERMISSION_MODULE_KEYS.AUCTIONS)) redirect("/acesso-negado");

  return { session, permissions };
}
