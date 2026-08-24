import { notFound } from "next/navigation";
import { AuctionLotDetail } from "@/components/Auction/AuctionLotDetail";
import { getEngineSnapshotAction } from "@/hooks/actions/auctionEngineActions";
import { getAuctionBySlug, getAuctionLotBySlug } from "@/lib/auctions/catalog";

export const dynamic = "force-dynamic";

export default async function AuctionLotPage({
	params,
}: {
	params: Promise<{ auctionSlug: string; lotSlug: string }>;
}) {
	const { auctionSlug, lotSlug } = await params;
	const [auction, lot] = await Promise.all([
		getAuctionBySlug(auctionSlug),
		getAuctionLotBySlug(auctionSlug, lotSlug),
	]);
	if (!auction || !lot) notFound();
	const engineResult = auction.id ? await getEngineSnapshotAction(auction.id) : { success: false as const };

	const currentLotIndex = auction.lots.findIndex(
		(auctionLot) => auctionLot.id === lot.id,
	);

	return (
		<AuctionLotDetail
			auction={auction}
			lot={lot}
		previousLot={auction.lots[currentLotIndex - 1]}
		nextLot={auction.lots[currentLotIndex + 1]}
		engineSnapshot={engineResult.success ? engineResult.data : undefined}
	/>
	);
}
