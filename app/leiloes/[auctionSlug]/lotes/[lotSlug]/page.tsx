import type { Metadata } from "next";
import { AuctionLotDetail } from "@/components/Auction/AuctionLotDetail";
import { getPublicLotPage } from "@/lib/auctions/public-page";
import { auctionPath, lotDescription, lotPath, publicPageMetadata } from "@/lib/seo";
import { breadcrumbStructuredData, lotStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/Seo/JsonLd";

export const dynamic = "force-dynamic";

type LotPageProps = { params: Promise<{ auctionSlug: string; lotSlug: string }> };

export async function generateMetadata({ params }: LotPageProps): Promise<Metadata> {
	const { auctionSlug, lotSlug } = await params;
	const { auction, lot } = await getPublicLotPage(auctionSlug, lotSlug);
	return publicPageMetadata({
		title: `Lote ${lot.number}: ${lot.title} | ${auction.title}`,
		description: lotDescription(auction, lot),
		path: lotPath(auction.slug, lot.slug),
		image: lot.image,
	});
}

export default async function AuctionLotPage({
	params,
}: LotPageProps) {
	const { auctionSlug, lotSlug } = await params;
	const { auction, lot, snapshot } = await getPublicLotPage(auctionSlug, lotSlug);

	const currentLotIndex = auction.lots.findIndex(
		(auctionLot) => auctionLot.id === lot.id,
	);

	return (
		<>
		<JsonLd data={lotStructuredData(auction, lot)} />
		<JsonLd data={breadcrumbStructuredData([
			{ name: "Leilões", path: "/leiloes" },
			{ name: auction.title, path: auctionPath(auction.slug) },
			{ name: lot.title, path: lotPath(auction.slug, lot.slug) },
		])} />
		<AuctionLotDetail
			auction={auction}
			lot={lot}
		previousLot={auction.lots[currentLotIndex - 1]}
		nextLot={auction.lots[currentLotIndex + 1]}
		engineSnapshot={snapshot}
	/>
	</>
	);
}
