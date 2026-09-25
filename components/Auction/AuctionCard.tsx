import { CalendarDays, ChevronRight, Clock3 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AuctionStatusBadge } from "@/components/Auction/AuctionStatusBadge";
import { AuctionStartCountdown } from "@/components/Auction/AuctionStartCountdown";
import type { Auction } from "@/lib/auctions/types";

interface AuctionCardProps {
	auction: Auction;
}

function AuctionCardAction({ auction }: AuctionCardProps) {
	const startTime = new Date(auction.startsAt).getTime();
	const daysUntilStart = (startTime - Date.now()) / (24 * 60 * 60 * 1000);
	const withinLotRevealWindow = Number.isFinite(startTime) && daysUntilStart <= 10 && (daysUntilStart >= 0 || auction.status === "OPEN");
	const canViewLots = auction.lots.length > 0 && withinLotRevealWindow;
	return (
		<div className="flex min-h-9 items-center gap-3 text-base font-semibold text-secondary">
			<span className="h-8 w-0.5 bg-secondary" aria-hidden />
			<span>{canViewLots ? "Ver lotes" : "Em Breve"}</span>
			<ChevronRight className="ml-auto size-5" />
		</div>
	);
}

function AuctionCardContent({ auction }: AuctionCardProps) {
	return (
		<div className="grid h-full grid-cols-[30%_minmax(0,1fr)] sm:grid-cols-[35%_minmax(0,1fr)]">
			<div className="relative min-h-44 bg-muted">
				<Image
					src={auction.image}
					alt={`Imagem do leilão ${auction.title}`}
					fill
					className="object-contain"
					sizes="(min-width: 768px) 20vw, 30vw"
				/>
			</div>

			<div className="flex min-w-0 flex-col p-3 sm:p-5">
				<div className="flex flex-wrap gap-2">
					<AuctionStatusBadge status={auction.status} mode={auction.mode} />
					<span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
						{auction.lotCount} {auction.lotCount === 1 ? "lote" : "lotes"}
					</span>
				</div>
				<AuctionStartCountdown startsAt={auction.startsAt} />

				<h2 className="mt-3 line-clamp-3 text-base sm:text-xl font-bold leading-6">
					{auction.title}
				</h2>

				<div className="my-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-muted-foreground">
					<span className="inline-flex items-center gap-2">
						<CalendarDays className="size-4 text-secondary" />
						{auction.date}
					</span>
					<span className="inline-flex items-center gap-2">
						<Clock3 className="size-4 text-secondary" />
						{auction.time}
					</span>
				</div>

				<div className="mt-auto border-t pt-2">
					<AuctionCardAction auction={auction} />
				</div>
			</div>
		</div>
	);
}

export function AuctionCard({ auction }: AuctionCardProps) {
	return (
		<article className="group overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-shadow hover:shadow-md">
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
