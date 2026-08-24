import { ArrowRight, CalendarDays, FileText, Gavel } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AuctionLotStatusBadge } from "@/components/Auction/AuctionStatusBadge";
import type { EngineLot } from "@/lib/auctions/engine-types";
import { getBidderDisplayName } from "@/lib/auctions/bidder-display";
import type { AuctionLot } from "@/lib/auctions/types";

interface AuctionLotCardProps {
	lot: AuctionLot;
	engineLot?: EngineLot;
	currency?: string;
}

function formatCents(value: string | null | undefined, currency = "BRL") {
	if (value == null) return "Consulte o lance";
	const padded = value.padStart(3, "0");
	const amount = `${padded.slice(0, -2)}.${padded.slice(-2)}`;
	return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(amount));
}

export function AuctionLotCard({ lot, engineLot, currency = "BRL" }: AuctionLotCardProps) {
	const href = `/leiloes/${lot.auctionSlug}/lotes/${lot.slug}`;
	const currentPrice = engineLot?.currentPriceCents ?? engineLot?.startingBidCents;
	const hasCurrentPrice = engineLot?.currentPriceCents != null;
	const bidderName = engineLot ? getBidderDisplayName(engineLot) : null;

	return (
		<article className="group overflow-hidden rounded-xl border bg-card shadow-xs transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-md">
			<Link
				href={href}
				className="block outline-none focus-visible:ring-3 focus-visible:ring-ring"
				aria-label={`Abrir lote ${lot.number}: ${lot.title}`}
			>
				<div className="relative aspect-[16/9] overflow-hidden bg-muted">
					<Image
						src={lot.image}
						alt={lot.images[0]?.altText || lot.title}
						fill
						className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
						sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
					/>
					<div className="absolute left-0 top-0 flex items-center gap-2 rounded-br-lg bg-card/95 px-3 py-2 text-xs font-bold text-foreground">
						<span>LOTE {String(lot.number).padStart(2, "0")}</span>
						<AuctionLotStatusBadge status={lot.status} />
					</div>
				</div>

				<div className="border-b bg-muted/55 px-3 py-2">
					<div className="flex items-center gap-1 text-xs text-muted-foreground">
						<CalendarDays className="size-3.5 shrink-0" />
						{lot.status === "OPEN" && lot.closesAt
							? `Encerra em ${lot.closesAtLabel}`
							: lot.closesAtLabel}
					</div>
				</div>

				<div className="space-y-4 p-4">
					<h2 className="min-h-12 text-base font-bold leading-tight text-foreground">
						{lot.title}
					</h2>
					<div className="rounded-lg bg-secondary/5 px-3 py-2">
						<p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{hasCurrentPrice ? "Último lance" : "Lance inicial"}</p>
						<p className="mt-1 text-xl font-bold tabular-nums text-secondary">{formatCents(currentPrice, currency)}</p>
						{bidderName ? <p className="mt-1 truncate text-[11px] text-muted-foreground">Lançado por {bidderName}</p> : null}
					</div>
					<div className="flex items-center justify-between gap-3">
						<span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Gavel className="size-3.5" aria-hidden="true" />{engineLot?.nextBidCents ? `Próximo ${formatCents(engineLot.nextBidCents, currency)}` : "Consulte os lances"}</span>
						<span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground">Dar lance <ArrowRight className="size-3.5" aria-hidden="true" /></span>
					</div>

					{lot.genealogyUrl ? <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><FileText className="size-3.5" aria-hidden="true" />Genealogia disponível</p> : null}

					{lot.payment ? (
						<div className="space-y-1 text-xs text-muted-foreground">
							<p className="font-semibold uppercase tracking-wide">Forma de pagamento</p>
							<p className="font-medium text-foreground">{lot.payment}</p>
						</div>
					) : null}
				</div>
			</Link>
		</article>
	);
}
