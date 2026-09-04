export type AuctionWhatsAppSettings = {
  id: string;
  auctionId: string;
  automationEnabled: boolean;
  participationApprovedEnabled: boolean;
  bidAcceptedEnabled: boolean;
  outbidEnabled: boolean;
  lotWonEnabled: boolean;
  integration: { enabled: boolean; configured: boolean; provider: string; instanceName: string | null };
  updatedAt: string;
};

export type AuctionWhatsAppMessageStatus = "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "SKIPPED";

export type AuctionWhatsAppMessage = {
  id: string;
  type: string;
  origin: "AUTOMATIC" | "MANUAL";
  participantId: string;
  maskedPhone: string | null;
  hasWhatsApp: boolean;
  text: string;
  status: AuctionWhatsAppMessageStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  allowWithoutConsent: boolean;
  sentAt: string | null;
  createdAt: string;
  lot?: { id: string; number: number; title: string; slug: string } | null;
  actor?: { id: string; name: string; email: string } | null;
};

export type AuctionWhatsAppMessagePage = { items: AuctionWhatsAppMessage[]; nextCursor: string | null; hasMore: boolean };
