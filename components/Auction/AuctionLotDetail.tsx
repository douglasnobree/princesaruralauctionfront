import {
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	FileText,
	Play,
	Youtube,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AuctionLotBidPanel } from "@/components/Auction/AuctionLotBidPanel";
import type { EngineAuctionSnapshot } from "@/lib/auctions/engine-types";
import type { Auction, AuctionLot } from "@/lib/auctions/types";

interface AuctionLotDetailProps {
	auction: Auction;
	lot: AuctionLot;
	previousLot?: AuctionLot;
	nextLot?: AuctionLot;
	engineSnapshot?: EngineAuctionSnapshot;
}

function getYoutubeEmbedUrl(value: string) {
	try {
		const url = new URL(value);
		const hostname = url.hostname.toLowerCase();
		let videoId = "";

		if (hostname === "youtu.be") {
			videoId = url.pathname.slice(1);
		} else if (
			hostname === "youtube.com" ||
			hostname.endsWith(".youtube.com")
		) {
			if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
			if (url.pathname.startsWith("/shorts/")) {
				videoId = url.pathname.split("/")[2] || "";
			}
			if (url.pathname.startsWith("/embed/")) {
				videoId = url.pathname.split("/")[2] || "";
			}
		}

		return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
	} catch {
		return null;
	}
}

function getLotStatusLabel(status: string) {
	return {
		OPEN: "ABERTO",
		PAUSED: "PAUSADO",
		CLOSING: "ENCERRANDO",
		SOLD: "VENDIDO",
		UNSOLD: "NÃO VENDIDO",
		CLOSED: "ENCERRADO",
		CANCELLED: "CANCELADO",
	}[status] ?? "AGUARDANDO ABERTURA";
}

export function AuctionLotDetail({
	auction,
	lot,
	previousLot,
	nextLot,
	engineSnapshot,
}: AuctionLotDetailProps) {
	const previousLotHref =
		previousLot && `/leiloes/${auction.slug}/lotes/${previousLot.slug}`;
	const nextLotHref =
		nextLot && `/leiloes/${auction.slug}/lotes/${nextLot.slug}`;
	const youtubeEmbedUrl = lot.youtubeUrl
		? getYoutubeEmbedUrl(lot.youtubeUrl)
		: null;
	const engineLot = engineSnapshot?.lots.find(
		(item) => item.externalId === lot.id || item.externalId === lot.slug || item.id === lot.id,
	);
	const displayedLotStatus = engineLot?.status ?? lot.status;

	return (
		<div className="bg-muted/40 py-6 sm:py-10">
			<div className="container mx-auto max-w-[1240px] px-4 lg:px-6">
				<nav
					aria-label="Navegação estrutural"
					className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground"
				>
					<Link href="/" className="hover:text-secondary">
						Início
					</Link>
					<ChevronRight className="size-4" />
					<Link href="/leiloes" className="hover:text-secondary">
						Leilões
					</Link>
					<ChevronRight className="size-4" />
					<Link
						href={`/leiloes/${auction.slug}`}
						className="hover:text-secondary"
					>
						{auction.title}
					</Link>
					<ChevronRight className="size-4" />
					<span className="font-medium text-foreground">{lot.title}</span>
				</nav>

				<div className="mb-6 flex items-center justify-between border-y py-3 text-sm font-medium">
					<div className="flex w-full items-center justify-between gap-4 text-muted-foreground">
						{previousLotHref ? (
							<Link href={previousLotHref} className="hover:text-secondary">
								<ChevronLeft className="mr-1 inline size-4" /> Lote anterior
							</Link>
						) : (
							<span className="opacity-50"><ChevronLeft className="mr-1 inline size-4" /> Lote anterior</span>
						)}
						<span className="text-foreground">
							LOTE {String(lot.number).padStart(2, "0")}
						</span>
						{nextLotHref ? (
							<Link href={nextLotHref} className="hover:text-secondary">
								Próximo lote <ChevronRight className="inline size-4" />
							</Link>
						) : (
							<span className="opacity-50">Próximo lote</span>
						)}
					</div>
				</div>

				<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_441px] lg:items-start">
					<div className="space-y-5">
						<div className="relative aspect-video overflow-hidden rounded-lg bg-black">
							<Image
								src={lot.image}
								alt={lot.images[0]?.altText || lot.title}
								fill
								className="object-cover"
								sizes="(min-width: 1024px) 65vw, 100vw"
								priority
							/>
							{engineSnapshot?.auction.mode === "LIVE" && engineSnapshot.auction.status === "RUNNING" ? <div className="absolute inset-0 flex items-center justify-center bg-black/15" aria-label="Transmissão ao vivo"><span className="flex size-16 items-center justify-center rounded-full bg-black/55 text-white shadow-lg"><Play className="ml-1 size-7 fill-current" /></span></div> : null}
							{engineSnapshot?.auction.mode === "LIVE" && engineSnapshot.auction.status === "RUNNING" ? <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/75 to-transparent px-4 pb-3 pt-8 text-xs font-semibold text-white"><span>Transmissão do leilão</span><span>Ao vivo</span></div> : null}
						</div>

						{lot.images.length > 1 ? (
							<div className="flex gap-3 overflow-x-auto pb-1">
								{lot.images.map((image) => (
									<div
										key={image.id}
									className="relative size-20 shrink-0 overflow-hidden rounded-md border bg-card"
									>
										<Image
											src={image.url}
											alt={image.altText || lot.title}
											fill
											className="object-cover"
											sizes="80px"
										/>
									</div>
								))}
							</div>
						) : null}

						{lot.details.length > 0 ? (
							<section className="rounded-xl bg-card p-5 shadow-xs sm:p-6">
								<h2 className="text-xl font-bold">
									Informações do{" "}
									{lot.category === "MACHINE" ? "equipamento" : "animal"}
								</h2>
								<dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
									{lot.details.map((detail) => (
										<div key={`${detail.label}-${detail.value}`}>
											<dt className="text-xs font-medium uppercase text-muted-foreground">
												{detail.label}
											</dt>
											<dd className="mt-1 font-semibold text-foreground">
												{detail.value}
											</dd>
										</div>
									))}
								</dl>
							</section>
						) : null}

						{lot.documentText ? (
							<section className="rounded-lg border bg-card p-5 sm:p-6">
								<h2 className="flex items-center gap-2 text-xl font-bold">
									<FileText className="size-5 text-secondary" />
									Documento do lote
								</h2>
								<p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
									{lot.documentText}
								</p>
							</section>
						) : null}

						{lot.genealogyUrl ? (
							<section className="rounded-xl bg-card p-5 shadow-xs sm:p-6">
								<h2 className="flex items-center gap-2 text-xl font-bold">
									<FileText className="size-5 text-secondary" />
									Genealogia do lote
								</h2>
								<p className="mt-3 text-sm leading-6 text-muted-foreground">
									Consulte o documento PDF com a genealogia cadastrada para este lote.
								</p>
								<a
									href={lot.genealogyUrl}
									target="_blank"
									rel="noreferrer"
									className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:underline"
								>
									Abrir genealogia em PDF <ExternalLink className="size-4" />
								</a>
							</section>
						) : null}

						{lot.youtubeUrl ? (
							<section className="rounded-xl bg-card p-5 shadow-xs sm:p-6">
								<h2 className="flex items-center gap-2 text-xl font-bold">
									<Youtube className="size-5 text-secondary" />
									Vídeo do lote
								</h2>
								{youtubeEmbedUrl ? (
									<div className="mt-4 aspect-video overflow-hidden rounded-lg bg-black">
										<iframe
											src={youtubeEmbedUrl}
											title={`Vídeo do lote ${lot.title}`}
											className="size-full"
											allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
											allowFullScreen
										/>
									</div>
								) : null}
								<a
									href={lot.youtubeUrl}
									target="_blank"
									rel="noreferrer"
									className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:underline"
								>
									Abrir vídeo no YouTube <ExternalLink className="size-4" />
								</a>
							</section>
						) : null}
					</div>

					<aside className="overflow-hidden rounded-lg border bg-card shadow-xs lg:sticky lg:top-28">
						<div className="flex items-center justify-center bg-secondary px-4 py-3 text-sm font-bold uppercase tracking-wide text-secondary-foreground">
							<span>LOTE {String(lot.number).padStart(2, "0")} - {getLotStatusLabel(displayedLotStatus)}</span>
						</div>
						<div className="space-y-5 p-6">
							<h1 className="text-2xl font-bold leading-[1.2]">{lot.title}</h1>

							{engineSnapshot && engineLot ? (
								<AuctionLotBidPanel
									initialSnapshot={engineSnapshot}
									lotExternalId={engineLot.externalId}
									payment={lot.payment}
									closingLabel={lot.closesAtLabel}
								/>
							) : (
								<div className="rounded-lg border border-dashed bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
									Os lances estarão disponíveis assim que este lote for publicado no motor.
								</div>
							)}

							<div className="flex justify-between gap-3 border-t pt-4 text-sm font-medium text-muted-foreground">
								{previousLotHref ? (
									<Link
										href={previousLotHref}
										className="inline-flex items-center hover:text-secondary"
									>
										<ChevronLeft className="size-4" /> Lote anterior
									</Link>
								) : (
									<span className="inline-flex items-center opacity-50">
										<ChevronLeft className="size-4" /> Lote anterior
									</span>
								)}
								<span className="shrink-0">
									LOTE {String(lot.number).padStart(2, "0")}
								</span>
								{nextLotHref ? (
									<Link
										href={nextLotHref}
										className="inline-flex items-center hover:text-secondary"
									>
										Próximo lote <ChevronRight className="size-4" />
									</Link>
								) : (
									<span className="inline-flex items-center opacity-50">
										Próximo lote <ChevronRight className="size-4" />
									</span>
								)}
							</div>
						</div>
					</aside>
				</div>

				{!engineSnapshot ? <section className="mt-7 rounded-2xl border border-dashed bg-card p-6"><p className="font-semibold">Acompanhamento de lances</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Este lote ainda não está publicado no motor de leilões. Assim que a publicação for concluída, os valores e o formulário aparecerão nesta página.</p></section> : null}
			</div>
		</div>
	);
}
