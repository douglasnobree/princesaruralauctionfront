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
  participantId?: string;
  acquisitionSource: EngineAcquisitionSource;
  status: "ACTIVE" | "VOIDED";
  voidReason?: string;
};

export type AuctionReportAddress = {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
};

export type AuctionReportCategorySummary = {
  description: string;
  lotCount: number;
  quantity: number;
  totalValueCents: string;
  averageValueCents: string;
};

export type AuctionReportRanking = {
  position: number;
  participantId?: string | null;
  participantName: string;
  lotNumbers: number[];
  lotCount: number;
  quantity: number;
  totalValueCents: string;
  averageLotValueCents: string;
  averageUnitValueCents: string;
};

export type AuctionReportBuyerDetail = {
  participantId: string | null;
  name: string;
  document: string | null;
  documentType: string | null;
  phone: string | null;
  email: string | null;
  address: AuctionReportAddress | null;
  farmName: string | null;
  farmDocument: string | null;
  farmState: string | null;
  farmCity: string | null;
  lotNumbers: number[];
  totalValueCents: string;
};

export type AuctionReportMissingInfo = {
  code: string;
  label: string;
  severity: "REQUIRED" | "RECOMMENDED";
  action: "AUCTION" | "LOT" | "PARTICIPANT";
  lotId?: string;
  lotNumber?: number;
  participantId?: string | null;
  participantName?: string;
};

export type AuctionReportCompleteness = {
  ready: boolean;
  requiredCount: number;
  recommendedCount: number;
  missing: AuctionReportMissingInfo[];
};

export type AuctionReportLot = {
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
  winnerParticipantId: string | null;
  lastBidderName: string | null;
  lastBidAmountCents: string | null;
  lastBidAt: string | null;
  sellerName: string;
  quantity: number;
  quantityProvided: boolean;
  categoryLabel: string;
  closedAt: string | null;
  bidCount: number;
  activeBidCount: number;
  voidedBidCount: number;
  bidderCount: number;
  genealogyAvailable: boolean;
  recentBids: AuctionReportBid[];
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
    defendedLots: number;
    defendedValueCents: string;
    categorySummaries: AuctionReportCategorySummary[];
    sellerRankings: AuctionReportRanking[];
    buyerRankings: AuctionReportRanking[];
  };
  lots: AuctionReportLot[];
  recentBids: AuctionReportBid[];
  buyerDetails: AuctionReportBuyerDetail[];
  completeness: AuctionReportCompleteness;
};
