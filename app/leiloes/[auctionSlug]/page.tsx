import { notFound } from "next/navigation";
import { AuctionLiveExperience } from "@/components/Auction/AuctionLiveExperience";
import { getAuctionBySlug } from "@/lib/auctions/catalog";
import { getEngineSnapshotAction } from "@/hooks/actions/auctionEngineActions";

export const dynamic = "force-dynamic";

export default async function AuctionLotsPage({
	params,
}: {
	params: Promise<{ auctionSlug: string }>;
}) {
	const { auctionSlug } = await params;
	const auction = await getAuctionBySlug(auctionSlug);
	if (!auction) notFound();
	const engine = auction.id ? await getEngineSnapshotAction(auction.id) : { success: false as const };

	return <AuctionLiveExperience externalAuctionId={auction.id ?? auction.slug} initialSnapshot={engine.success ? engine.data : undefined} title={auction.title} description={auction.description} image={auction.image} date={auction.date} time={auction.time} lotCount={auction.lotCount} status={auction.status} mode={auction.mode} genealogyCatalogUrl={auction.genealogyCatalogUrl} catalogLots={auction.lots} />;
}
