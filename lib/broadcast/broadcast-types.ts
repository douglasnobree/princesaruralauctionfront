export type BroadcastAuctionStatus = "waiting" | "live" | "paused" | "finished";
export type BroadcastLotStatus = "waiting" | "open" | "sold" | "passed";

export type BroadcastLot = {
  id: string;
  number: number;
  title: string;
  description?: string;
  installmentText?: string;
  imageUrl?: string;
  status: BroadcastLotStatus;
};

export type BroadcastBid = {
  id: string;
  amountCents: string;
  bidderId: string;
  bidderName: string;
  createdAt: string;
};

export type BroadcastSeller = {
  name: string;
  phone: string;
};

export const BROADCAST_SELLER_ROTATION_SECONDS = 8;

export type BroadcastState = {
  auctionId: string;
  auctionTitle: string;
  currency: string;
  status: BroadcastAuctionStatus;
  currentLot: BroadcastLot | null;
  currentBid: BroadcastBid | null;
  recentBids: BroadcastBid[];
  sellers?: BroadcastSeller[];
  version: number;
  updatedAt: string;
};

export type BroadcastConfig = {
  overlayDelayMs: number;
  maxRecentBids: number;
  sellers?: BroadcastSeller[];
};

export type BroadcastClientInfo = {
  auctionId: string;
  clientId: string;
  connectedAt: string;
  lastCommunicationAt: string;
};

export const DEFAULT_BROADCAST_CONFIG: BroadcastConfig = {
  overlayDelayMs: 0,
  maxRecentBids: 10,
};

export type BroadcastConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline"
  | "error";
