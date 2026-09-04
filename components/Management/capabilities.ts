import { PERMISSION_KEYS, PERMISSION_MODULE_KEYS, type RolePermission } from "@/types/role-permissions";

export type AuctionCapabilities = {
  canView: boolean; canViewReports: boolean; canViewBids: boolean; canManageBids: boolean;
  canCreate: boolean; canEdit: boolean; canDelete: boolean; canManageStatus: boolean; canManageLots: boolean;
  canNotifyParticipants: boolean;
};
const NO_ACCESS: AuctionCapabilities = { canView:false, canViewReports:false, canViewBids:false, canManageBids:false, canCreate:false, canEdit:false, canDelete:false, canManageStatus:false, canManageLots:false, canNotifyParticipants:false };
const ADMIN_ACCESS: AuctionCapabilities = { canView:true, canViewReports:true, canViewBids:true, canManageBids:true, canCreate:true, canEdit:true, canDelete:true, canManageStatus:true, canManageLots:true, canNotifyParticipants:true };
export function permissionsToAuctionCapabilities(permissions: RolePermission[] | null | undefined, accountType?: string): AuctionCapabilities {
  if (accountType === "ADMIN") return ADMIN_ACCESS;
  if (!permissions?.some((item) => item.key === PERMISSION_MODULE_KEYS.AUCTIONS && item.enabled)) return NO_ACCESS;
  const map = new Map(permissions.map((item) => [item.key, item.enabled]));
  return {
    canView: map.get(PERMISSION_KEYS.AUCTIONS_VIEW) === true,
    canViewReports: map.get(PERMISSION_KEYS.AUCTIONS_VIEW_REPORTS) === true,
    canViewBids: map.get(PERMISSION_KEYS.AUCTIONS_VIEW_BIDS) === true,
    // O manager de piso/telefone e as inscrições usam MANAGE_STATUS no backend.
    // A UI atual só expõe essas operações, portanto exige as duas permissões.
    canManageBids: map.get(PERMISSION_KEYS.AUCTIONS_MANAGE_BIDS) === true && map.get(PERMISSION_KEYS.AUCTIONS_MANAGE_STATUS) === true,
    canCreate: map.get(PERMISSION_KEYS.AUCTIONS_CREATE) === true,
    canEdit: map.get(PERMISSION_KEYS.AUCTIONS_EDIT) === true,
    canDelete: map.get(PERMISSION_KEYS.AUCTIONS_DELETE) === true,
    canManageStatus: map.get(PERMISSION_KEYS.AUCTIONS_MANAGE_STATUS) === true,
    canManageLots: map.get(PERMISSION_KEYS.AUCTIONS_MANAGE_LOTS) === true,
    canNotifyParticipants: map.get(PERMISSION_KEYS.AUCTIONS_NOTIFY_PARTICIPANTS) === true,
  };
}
