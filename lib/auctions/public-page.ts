import { cache } from "react";
import { notFound } from "next/navigation";
import { getEngineSnapshotAction } from "@/hooks/actions/auctionEngineActions";
import { getAuctionBySlug, getAuctionLotBySlug } from "@/lib/auctions/catalog";

// Memoize within the render only: metadata and the page share the same live read.
export const getPublicAuctionPage = cache(async (slug: string) => {
  const auction = await getAuctionBySlug(slug);
  if (!auction) notFound();
  const engine = auction.id
    ? await getEngineSnapshotAction(auction.id)
    : { success: false as const };

  if (
    engine.success && engine.data &&
    ["FINISHED", "CLOSED", "CANCELLED", "ABORTED"].includes(engine.data.auction.status)
  ) notFound();

  return { auction, snapshot: engine.success ? engine.data : undefined };
});

export const getPublicLotPage = cache(async (auctionSlug: string, lotSlug: string) => {
  const [page, lot] = await Promise.all([
    getPublicAuctionPage(auctionSlug),
    getAuctionLotBySlug(auctionSlug, lotSlug),
  ]);
  if (!lot) notFound();
  return { ...page, lot };
});
