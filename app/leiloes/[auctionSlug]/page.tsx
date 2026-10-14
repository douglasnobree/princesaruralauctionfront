import type { Metadata } from "next";
import { AuctionLiveExperience } from "@/components/Auction/AuctionLiveExperience";
import { getPublicAuctionPage } from "@/lib/auctions/public-page";
import { auctionDescription, auctionPath, publicPageMetadata } from "@/lib/seo";
import { auctionStructuredData, breadcrumbStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/Seo/JsonLd";

export const dynamic = "force-dynamic";

type AuctionPageProps = { params: Promise<{ auctionSlug: string }> };

export async function generateMetadata({ params }: AuctionPageProps): Promise<Metadata> {
	const { auctionSlug } = await params;
	const { auction } = await getPublicAuctionPage(auctionSlug);
	return publicPageMetadata({
		title: auction.title,
		description: auctionDescription(auction),
		path: auctionPath(auction.slug),
		image: auction.image,
	});
}

export default async function AuctionLotsPage({
	params,
}: AuctionPageProps) {
	const { auctionSlug } = await params;
	const { auction, snapshot } = await getPublicAuctionPage(auctionSlug);

	return <>
		<JsonLd data={auctionStructuredData(auction)} />
		<JsonLd data={breadcrumbStructuredData([
			{ name: "Leilões", path: "/leiloes" },
			{ name: auction.title, path: auctionPath(auction.slug) },
		])} />
		<AuctionLiveExperience externalAuctionId={auction.id ?? auction.slug} initialSnapshot={snapshot} title={auction.title} description={auction.description} regulationText={auction.regulationText} paymentText={auction.paymentText} deliveryText={auction.deliveryText} image={auction.image} desktopBannerUrl={auction.desktopBannerUrl} mobileBannerUrl={auction.mobileBannerUrl} date={auction.date} time={auction.time} lotCount={auction.lotCount} status={auction.status} mode={auction.mode} genealogyCatalogUrl={auction.genealogyCatalogUrl} catalogLots={auction.lots} />
	</>;
}
