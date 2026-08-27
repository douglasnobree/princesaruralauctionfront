import type { EngineAcquisitionSource } from "@/lib/auctions/engine-types";

export type AuctionReportBid = {
  id: string;
  lotId: string;
  lotNumber: number;
  lotTitle: string;
  amountCents: string;
  origin: "ONLINE" | "PROXY" | "FLOOR" | "PHONE";
  phase: "PRE_BID" | "LIVE_BID" | null;
  acceptedAt: string;
  bidderAlias: string;
  acquisitionSource: EngineAcquisitionSource;
  status: "ACTIVE" | "VOIDED";
  voidReason?: string;
};

export type AuctionReport = {
  generatedAt: string;
  source: { engineAvailable: boolean; engineServerTime: string | null; engineStatus: string | null };
  warnings: string[];
  auction: { id: string; title: string; slug: string; category: string; mode: string; catalogStatus: string; engineStatus: string | null; currency: string; startsAt: string | null; endsAt: string | null };
  summary: {
    lotCount: number;
    soldLots: number;
    unsoldLots: number;
    cancelledLots: number;
    openLots: number;
    startingValueCents: string;
    currentValueCents: string;
    revenueCents: string;
    totalBids: number;
    activeBids: number;
    voidedBids: number;
    participantCount: number;
    acquisitionSources: Array<{ source: EngineAcquisitionSource; participantCount: number; bidCount: number; revenueCents: string }>;
  };
  lots: Array<{
    id: string;
    number: number;
    title: string;
    catalogStatus: string;
    engineStatus: string | null;
    status: string;
    startingBidCents: string;
    currentPriceCents: string | null;
    winningAmountCents: string | null;
    winnerName: string | null;
    closedAt: string | null;
    bidCount: number;
    activeBidCount: number;
    voidedBidCount: number;
    bidderCount: number;
    genealogyAvailable: boolean;
    recentBids: AuctionReportBid[];
  }>;
  recentBids: AuctionReportBid[];
};
