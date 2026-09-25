import { AuctionResponsiveBanner } from "@/components/Auction/AuctionResponsiveBanner";
import type { Metadata } from "next";
import { AuctionCard } from "@/components/Auction/AuctionCard";
import { AuctionEmptyState } from "@/components/Auction/AuctionEmptyState";
import { AuctionHeroBanner } from "@/components/Auction/AuctionHeroBanner";
import Link from "next/link";
import {
	filterAuctionsByListingFilter,
	getAuctions,
	getAuctionPlatformBanners,
	parseAuctionListingFilter,
} from "@/lib/auctions/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Leilões",
	description:
		"Acompanhe os leilões rurais do PR Leilões e consulte seus lotes.",
};

export default async function LeiloesPage({
	searchParams,
}: {
	searchParams?: Promise<{ q?: string; tipo?: string }>;
}) {
	const [auctions, platformBanners] = await Promise.all([getAuctions(), getAuctionPlatformBanners()]);
	const params = await searchParams;
	const query = params?.q?.trim() ?? "";
	const filter = parseAuctionListingFilter(params?.tipo);
	const filteredAuctions = filterAuctionsByListingFilter(auctions, filter);
	const normalizedQuery = query.toLocaleLowerCase("pt-BR");
	const visibleAuctions = normalizedQuery
		? filteredAuctions.filter((auction) =>
				[auction.title, auction.description]
					.filter(Boolean)
					.some((value) => value?.toLocaleLowerCase("pt-BR").includes(normalizedQuery)),
			)
		: filteredAuctions;
	const featuredAuction = visibleAuctions[0];
	const listingTitle =
		filter === "live" ? "Leilões ao vivo"
			: filter === "shopping" ? "Shopping"
				: filter === "pre-lances" ? "Pré-lances"
					: filter === "mercado" ? "Mercado"
						: "Agenda de leilões";
	const emptyTitle =
		filter === "live" ? "Nenhum leilão ao vivo disponível"
			: filter === "shopping" ? "Nenhum Shopping disponível"
				: filter === "pre-lances" ? "Nenhum pré-lance aberto"
					: filter === "mercado" ? "Nenhum Mercado disponível"
						: "Nenhum leilão agendado";
	const filters = [
		{ value: "all", label: "Todos" },
		{ value: "live", label: "Ao vivo" },
		{ value: "shopping", label: "Shopping" },
		{ value: "mercado", label: "Mercado" },
		{ value: "pre-lances", label: "Pré-lances" },
	] as const;

	return (
		<div className="bg-muted/35 pb-10 pt-4 sm:pt-5">
			{platformBanners.desktopBannerUrl || platformBanners.mobileBannerUrl ? <div className="mx-auto max-w-6xl px-4 sm:px-6"><AuctionResponsiveBanner desktopUrl={platformBanners.desktopBannerUrl} mobileUrl={platformBanners.mobileBannerUrl} title="PR Leilões" altText="Banner da plataforma PR Leilões" /></div> : <AuctionHeroBanner
				image={featuredAuction?.image}
				title={featuredAuction?.title}
				desktopBannerUrl={featuredAuction?.desktopBannerUrl}
				mobileBannerUrl={featuredAuction?.mobileBannerUrl}
				slug={featuredAuction?.slug}
			/>}

			<section
				id="agenda"
				className="container mx-auto max-w-6xl scroll-mt-16 px-4 py-6 sm:py-11 lg:px-6"
				aria-labelledby="scheduled-auctions-title"
			>
				<header className="mb-7">
					<h1 id="scheduled-auctions-title" className="text-3xl font-bold">
						{listingTitle}
					</h1>
					<p className="mt-2 text-lg text-muted-foreground">
						{query
							? `Resultados para “${query}”`
							: filter === "live" ? "Acompanhe a disputa ao vivo e veja os pré-lances no filtro próprio."
								: filter === "shopping" ? "Disputas por lance com encerramento programado por lote."
									: filter === "pre-lances" ? "Leilões dentro da janela oficial de pré-lance."
										: filter === "mercado" ? "Compre lotes de preço fixo enquanto estiverem disponíveis."
											: "Confira os próximos leilões e participe."}
					</p>
					<nav className="mt-5 flex flex-wrap gap-2" aria-label="Filtrar leilões">
						{filters.map((option) => {
							const selected = filter === option.value;
							const href = option.value === "all" ? "/leiloes" : `/leiloes?tipo=${option.value}`;
							return <Link key={option.value} href={href} aria-current={selected ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring ${selected ? "border-secondary bg-secondary text-secondary-foreground" : "bg-card text-muted-foreground hover:border-secondary/50 hover:text-foreground"}`}>{option.label}</Link>;
						})}
					</nav>
				</header>

				{visibleAuctions.length > 0 ? (
					<div className="grid gap-6 md:grid-cols-2">
						{visibleAuctions.map((auction) => (
							<AuctionCard key={auction.slug} auction={auction} />
						))}
					</div>
				) : (
					<AuctionEmptyState
						title={query ? "Nenhum leilão encontrado" : emptyTitle}
						description={
							query
								? "Tente buscar por outro nome ou remova o filtro para ver toda a agenda."
								: "Novos leilões aparecerão aqui assim que forem publicados."
						}
					/>
				)}
			</section>
		</div>
	);
}
