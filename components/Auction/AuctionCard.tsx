import { CalendarDays, ChevronRight, Clock3 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AuctionStatusBadge } from "@/components/Auction/AuctionStatusBadge";
import type { Auction } from "@/lib/auctions/types";

interface AuctionCardProps {
	auction: Auction;
}

function AuctionCardAction({ auction }: AuctionCardProps) {
	return (
		<div className="flex min-h-9 items-center gap-3 text-base font-semibold text-secondary">
			<span className="h-8 w-0.5 bg-secondary" aria-hidden />
			<span>{auction.lots.length > 0 ? "Ver lotes" : "Ver detalhes"}</span>
			<ChevronRight className="ml-auto size-5" />
		</div>
	);
}

function AuctionCardContent({ auction }: AuctionCardProps) {
	return (
		<div className="grid h-full sm:grid-cols-[35%_minmax(0,1fr)]">
			<div className="relative aspect-[3/4] bg-muted sm:aspect-auto">
				<Image
					src={auction.image}
					alt={`Imagem do leilão ${auction.title}`}
					fill
					className="object-contain"
					sizes="(min-width: 768px) 35vw, 100vw"
				/>
			</div>

			<div className="flex min-w-0 flex-col p-5">
				<div className="flex flex-wrap gap-2">
					<AuctionStatusBadge status={auction.status} />
					<span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
						{auction.lotCount} {auction.lotCount === 1 ? "lote" : "lotes"}
					</span>
				</div>

				<h2 className="mt-5 line-clamp-2 text-xl font-bold leading-6">
					{auction.title}
				</h2>

				<div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-base font-semibold text-muted-foreground">
					<span className="inline-flex items-center gap-2">
						<CalendarDays className="size-4 text-secondary" />
						{auction.date}
					</span>
					<span className="inline-flex items-center gap-2">
						<Clock3 className="size-4 text-secondary" />
						{auction.time}
					</span>
				</div>

				<div className="mt-auto border-t pt-5">
					<AuctionCardAction auction={auction} />
				</div>
			</div>
		</div>
	);
}

export function AuctionCard({ auction }: AuctionCardProps) {
	return (
		<article className="group overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-shadow hover:shadow-md sm:aspect-[2.15/1]">
			<Link
				href={`/leiloes/${auction.slug}`}
				className="block h-full outline-none focus-visible:ring-3 focus-visible:ring-ring"
				aria-label={`Abrir o leilão ${auction.title}`}
			>
				<AuctionCardContent auction={auction} />
			</Link>
		</article>
	);
}
