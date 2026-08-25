export type RolePermissionKey = string;
export type ModulePermissionKey = string;

export type RolePermission = { key: RolePermissionKey; enabled: boolean };

export const PERMISSION_MODULE_KEYS = {
  AUCTIONS: "auctions.enabled",
} as const;

export const PERMISSION_KEYS = {
  AUCTIONS_VIEW: "auctions.view",
  AUCTIONS_VIEW_REPORTS: "auctions.viewReports",
  AUCTIONS_VIEW_BIDS: "auctions.viewBids",
  AUCTIONS_MANAGE_BIDS: "auctions.manageBids",
  AUCTIONS_CREATE: "auctions.create",
  AUCTIONS_EDIT: "auctions.edit",
  AUCTIONS_DELETE: "auctions.delete",
  AUCTIONS_MANAGE_STATUS: "auctions.manageStatus",
  AUCTIONS_MANAGE_LOTS: "auctions.manageLots",
} as const;

export const ROLE_PERMISSION_ROLES = [
  "ADMIN", "PERSON", "COMPANY", "JOURNALIST", "PARTNER", "VENDOR",
  "MODERATOR", "TIN1", "TIN2", "FINANCEIRO", "INFLUENCER",
] as const;

export type RolePermissionRole = (typeof ROLE_PERMISSION_ROLES)[number];

// Mantido alinhado aos @Roles dos controllers administrativos de auctions,
// Auction Engine e Broadcast no backend.
export const AUCTION_MANAGEMENT_ROLES = ["ADMIN", "MODERATOR", "TIN1", "TIN2"] as const;
