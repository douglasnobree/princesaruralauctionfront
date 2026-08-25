export type BroadcastAuctionStatus = "waiting" | "live" | "paused" | "finished";
export type BroadcastLotStatus = "waiting" | "open" | "sold" | "passed";

export type BroadcastLot = {
  id: string;
  number: number;
  title: string;
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

export type BroadcastState = {
  auctionId: string;
  auctionTitle: string;
  currency: string;
  status: BroadcastAuctionStatus;
  currentLot: BroadcastLot | null;
  currentBid: BroadcastBid | null;
  recentBids: BroadcastBid[];
  version: number;
  updatedAt: string;
};

export type BroadcastConfig = {
  overlayDelayMs: number;
  maxRecentBids: number;
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
