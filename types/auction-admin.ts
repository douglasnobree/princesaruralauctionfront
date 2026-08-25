export const AUCTION_CATEGORIES = ["ANIMAL", "MACHINE"] as const;
export type AuctionAdminCategory = (typeof AUCTION_CATEGORIES)[number];
export const AUCTION_MODES = ["TIMED", "LIVE", "SHOPPING"] as const;
export type AuctionAdminMode = (typeof AUCTION_MODES)[number];
export const AUCTION_STATUSES = ["DRAFT", "PRE_LAUNCH", "COMING_SOON", "WAITING_OPENING", "OPEN", "CLOSED", "CANCELLED"] as const;
export type AuctionAdminStatus = (typeof AUCTION_STATUSES)[number];
export const AUCTION_LOT_STATUSES = ["DRAFT", "PAUSED", "OPEN", "SOLD", "CLOSED", "CANCELLED"] as const;
export type AuctionLotAdminStatus = (typeof AUCTION_LOT_STATUSES)[number];
export const AUCTION_PUBLIC_LOT_STATUSES: readonly AuctionLotAdminStatus[] = ["OPEN", "SOLD", "CLOSED"];

export type AuctionAdminImage = { id: string; filename: string; url?: string | null; altText?: string | null; sortOrder: number };
export type AuctionActionName = "edit" | "publish" | "cancel" | "delete" | "manageLots" | "deleteLots";
export type AuctionActionReason = { code: string; message: string };
export type AuctionAvailableActions = { canEdit: boolean; canPublish: boolean; canCancel: boolean; canDelete: boolean; canManageLots: boolean; canDeleteLots: boolean; reasons: Partial<Record<AuctionActionName, AuctionActionReason>> };
export type AuctionAdminLot = {
  id: string; auctionId: string; number: number; sortOrder: number; slug: string; title: string;
  category: AuctionAdminCategory; status: AuctionLotAdminStatus; startingBidCents?: number | null;
  incrementCents?: number | null; incrementInherited?: boolean; secondaryIncrementCents?: number | null;
  currentBidCents?: number | null; nextBidCents?: number | null; currentBidderName?: string | null;
  bidCount?: number; paymentDescription?: string | null; deliveryDescription?: string | null;
  details?: unknown; comments?: string[]; closesAt?: string | null; documentText?: string | null;
  youtubeUrl?: string | null; genealogyFilename?: string | null; genealogyUrl?: string | null;
  images: AuctionAdminImage[]; createdAt?: string; updatedAt?: string;
};
export type AuctionAdmin = {
  id: string; title: string; slug: string; category?: AuctionAdminCategory | null; mode: AuctionAdminMode;
  description?: string | null; coverImage?: string | null; coverImageUrl?: string | null;
  regulationText?: string | null; paymentText?: string | null; deliveryText?: string | null;
  preBidStartsAt?: string | null; preBidEndsAt?: string | null; startsAt: string; endsAt?: string | null;
  incrementCents?: number | null; incrementInherited?: boolean; secondaryIncrementCents?: number | null;
  extensionMinutes?: number | null; plannedLotCount: number; lotCount: number; status: AuctionAdminStatus;
  lots: AuctionAdminLot[]; availableActions?: AuctionAvailableActions; createdAt?: string; updatedAt?: string;
};
export type AuctionInput = { title: string; slug: string; category?: AuctionAdminCategory; mode?: AuctionAdminMode; description?: string; coverImage?: string; regulationText?: string; paymentText?: string; deliveryText?: string; preBidStartsAt?: string; preBidEndsAt?: string; startsAt: string; endsAt?: string; incrementCents?: number; secondaryIncrementCents?: number | null; extensionMinutes?: number; plannedLotCount?: number };
export type AuctionLotInput = { number: number; sortOrder?: number; slug: string; title: string; category: AuctionAdminCategory; startingBidCents: number; incrementCents?: number | null; paymentDescription?: string; deliveryDescription?: string | null; closesAt?: string; documentText?: string; youtubeUrl?: string; status?: AuctionLotAdminStatus };
