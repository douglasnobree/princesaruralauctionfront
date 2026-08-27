export type EngineLot = {
  id: string;
  externalId: string;
  lotNumber: number;
  title: string;
  status: string;
  startingBidCents: string;
  incrementCents: string;
  secondaryIncrementCents?: string | null;
  currentIncrementCents?: string;
  fixedPriceCents: string | null;
  currentPriceCents: string | null;
  nextBidCents: string;
  currentBidderAlias: string | null;
  currentBidderName: string | null;
  winnerName?: string | null;
  winningAmountCents?: string | null;
  closedAt?: string | null;
  lotSequence: string;
  version: string;
  startsAt: string | null;
  endsAt: string | null;
};

export type EngineAuctionSnapshot = {
  auction: {
    id: string;
    externalId: string;
    title: string;
    mode: "SHOPPING" | "LIVE" | "TIMED";
    status: string;
    currency: string;
    regulationVersion: string;
    approvalMode: string;
    preBidEnabled: boolean;
    preBidStartsAt: string | null;
    preBidEndsAt: string | null;
    version: string;
    startsAt: string | null;
    endsAt: string | null;
  };
  stream: EngineStream | null;
  serverTime: string;
  lots: EngineLot[];
};

export type EngineStream = {
  id: string;
  provider: string;
  playbackUrl: string | null;
  providerStreamId: string | null;
  status: "CREATED" | "STARTING" | "LIVE" | "ENDED" | "FAILED" | string;
  version: string;
  updatedAt: string;
};

export type EngineBidResult = {
  status: "ACCEPTED" | "PENDING_ELIGIBILITY" | "PENDING_APPROVAL" | "REJECTED";
  bidRequestId: string;
  lotId: string;
  lotSequence: string;
  version: string;
  currentPriceCents: string | null;
  currentIncrementCents?: string;
  nextBidCents: string;
  currentBidderAlias: string | null;
  currentBidderName?: string | null;
  proxyMaxBidCents?: string;
  endsAt: string | null;
  serverTime: string;
  timerExtended?: boolean;
};

export type EngineOwnProxyBid = {
  lotId: string;
  active: boolean;
  maxBidCents: string | null;
};

export type EngineRealtimeTicket = { ticket: string; expiresAt: string; auctionId: string };

export type EngineIntegerCents = string;
export type EngineIsoInstant = string;
export type EngineBidOrigin = "ONLINE" | "PROXY" | "FLOOR" | "PHONE";
export type EngineBidPhase = "PRE_BID" | "LIVE_BID";
export type EngineAcquisitionSource = "DIRECT" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" | "GOOGLE" | "TIKTOK" | "REFERRAL" | "ORGANIC" | "OTHER" | "UNKNOWN";

export type EngineBidHistoryItem = {
  id: string;
  bidRequestId: string;
  amountCents: EngineIntegerCents;
  origin: EngineBidOrigin;
  phase: EngineBidPhase | null;
  lotSequence: string;
  acceptedAt: EngineIsoInstant;
  createdAt: EngineIsoInstant;
  bidderAlias: string;
  participantId?: string;
  status: "ACTIVE" | "VOIDED";
  voidedAt?: EngineIsoInstant;
  voidReason?: string;
  management?: { canEdit: boolean; canDelete: boolean; isLatest: boolean; mode: "BID" | "PROXY"; proxyMaxBidCents?: string };
};

export type EngineBidManagementResult = {
  status: "UPDATED" | "VOIDED";
  bidId: string;
  bidRequestId: string;
  lotId: string;
  amountCents: EngineIntegerCents;
  previousAmountCents?: EngineIntegerCents;
  proxyMaxBidCents?: EngineIntegerCents;
  currentPriceCents: EngineIntegerCents | null;
  currentIncrementCents?: EngineIntegerCents;
  nextBidCents: EngineIntegerCents;
  currentBidderAlias: string | null;
  lotSequence: string;
  version: string;
  reason: string;
  serverTime: EngineIsoInstant;
};

export type EngineBidHistoryPage = {
  items: EngineBidHistoryItem[];
  nextBeforeSequence: string | null;
  hasMore: boolean;
};

export type EngineBidHistoryQuery = {
  beforeSequence?: string;
  limit?: string;
};

export type EnginePendingBidApproval = {
  bidRequestId: string;
  lotId: string;
  externalLotId: string;
  lotNumber: number;
  lotTitle: string;
  participantId: string;
  displayName: string | null;
  amountCents: EngineIntegerCents;
  origin: EngineBidOrigin;
  phase: EngineBidPhase | null;
  status: "PENDING_APPROVAL";
  receivedAt: EngineIsoInstant;
};

export type EnginePendingBidsPage = {
  items: EnginePendingBidApproval[];
  hasMore: boolean;
};

export type EnginePendingEligibilityBid = {
  bidRequestId: string;
  lotId: string;
  externalLotId: string;
  lotNumber: number;
  lotTitle: string;
  participantId: string;
  displayName: string | null;
  amountCents: EngineIntegerCents;
  origin: EngineBidOrigin;
  phase: EngineBidPhase | null;
  status: "PENDING_ELIGIBILITY";
  receivedAt: EngineIsoInstant;
};

export type EnginePendingEligibilityBidsPage = {
  items: EnginePendingEligibilityBid[];
  hasMore: boolean;
};

export type EngineAuctionRegistration = {
  registrationId: string;
  auctionId: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED" | "REVOKED";
  enabled?: boolean;
  termsVersion: string;
  acquisitionSource?: EngineAcquisitionSource;
  acceptedAt: string;
  displayName?: string;
  email?: string | null;
  globallyEnabled?: boolean;
  participantType?: "USER" | "QUICK";
  maskedDocument?: string;
};

export type EngineAuctionRegistrationPage = {
  items: EngineAuctionRegistration[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type AuctionParticipantSearchResult = {
  id: string;
  displayName: string;
  email: string | null;
  enabled: boolean;
  participantType: "USER" | "QUICK";
  documentType?: "CPF" | "CNPJ";
  maskedDocument?: string;
};
