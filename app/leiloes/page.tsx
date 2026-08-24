import type { Metadata } from "next";
import { AuctionCard } from "@/components/Auction/AuctionCard";
import { AuctionEmptyState } from "@/components/Auction/AuctionEmptyState";
import { AuctionHeroBanner } from "@/components/Auction/AuctionHeroBanner";
import { getAuctions } from "@/lib/auctions/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Leilões",
	description:
		"Acompanhe os leilões rurais da Princesa Rural e consulte seus lotes.",
};

export default async function LeiloesPage({
	searchParams,
}: {
	searchParams?: Promise<{ q?: string }>;
}) {
	const auctions = await getAuctions();
	const query = (await searchParams)?.q?.trim() ?? "";
	const normalizedQuery = query.toLocaleLowerCase("pt-BR");
	const visibleAuctions = normalizedQuery
		? auctions.filter((auction) =>
				[auction.title, auction.description]
					.filter(Boolean)
					.some((value) => value?.toLocaleLowerCase("pt-BR").includes(normalizedQuery)),
			)
		: auctions;
	const featuredAuction = visibleAuctions[0] ?? auctions[0];

	return (
		<div className="bg-muted/35 pb-10 pt-4 sm:pt-5">
			<AuctionHeroBanner
				image={featuredAuction?.image}
				title={featuredAuction?.title}
			/>

			<section
				id="agenda"
				className="container mx-auto max-w-6xl px-4 py-10 lg:px-0 sm:py-11"
				aria-labelledby="scheduled-auctions-title"
			>
				<header className="mb-7">
					<h1 id="scheduled-auctions-title" className="text-3xl font-bold">
						Leilões agendados
					</h1>
					<p className="mt-2 text-lg text-muted-foreground">
						{query
							? `Resultados para “${query}”`
							: "Confira os próximos leilões e participe"}
					</p>
				</header>

				{visibleAuctions.length > 0 ? (
					<div className="grid gap-6 md:grid-cols-2">
						{visibleAuctions.map((auction) => (
							<AuctionCard key={auction.slug} auction={auction} />
						))}
					</div>
				) : (
					<AuctionEmptyState
						title={query ? "Nenhum leilão encontrado" : "Nenhum leilão agendado"}
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
