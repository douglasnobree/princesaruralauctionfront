export type AuctionReport = {
  auction: { id: string; title: string; slug: string; status: string; mode: string; startsAt: string; endsAt?: string | null };
  lots: Array<{ id: string; number: number; title: string; status: string; currentBidCents?: number | null; currentBidderName?: string | null; bidCount?: number }>;
  totals?: { lots: number; sold: number; grossCents: number };
};
