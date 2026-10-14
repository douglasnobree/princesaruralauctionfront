"use client";

import Link from "next/link";
import Image from "next/image";
import type { Auction, AuctionLot } from "@/lib/auctions/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, Banknote, ChevronDown, CircleAlert, FileText, GitFork, History, Loader2, RefreshCw, Trophy, Truck, Wifi, WifiOff } from "lucide-react";
import { AuctionLoginDialog } from "@/components/Auction/AuctionLoginDialog";
import { AuctionRegistrationDialog } from "@/components/Auction/AuctionRegistrationDialog";
import { AuctionWhatsAppConsentControl } from "@/components/Auction/AuctionWhatsAppConsentControl";
import { EngineCommandFeedback } from "@/components/Auction/EngineCommandFeedback";
import { LiveStreamPlayer } from "@/components/Auction/LiveStreamPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuctionRegistrationAction, getEngineSnapshotAction, getOwnProxyBidAction, issueRealtimeTicketAction, placeBidAction, registerAuctionAction, setProxyBidAction } from "@/hooks/actions/auctionEngineActions";
import type { EngineAuctionSnapshot, EngineBidResult, EngineLot, EngineStream } from "@/lib/auctions/engine-types";
import { getEngineQuickBidOptions } from "@/lib/auctions/engine-formatters";
import { auctionAcceptsBids, hasConfiguredPreBid, isPreBidOpen } from "@/lib/auctions/bid-window";
import { isAuctionAuthenticationError } from "@/lib/auctions/auth";
import { getBidderDisplayName, getReadableBidderName, mergeKnownBidderNames } from "@/lib/auctions/bidder-display";
import { BRAZIL_TIME_ZONE } from "@/lib/utils/formatters";
import type { ActionResult } from "@/types/common";
import { detectAcquisitionSource } from "@/lib/auctions/acquisition-sources";
import styles from "./auction-live.module.css";

function formatCents(value: string | null, currency = "BRL") {
	if (value === null) return "—";
	const negative = value.startsWith("-");
	const digits = negative ? value.slice(1) : value;
	const padded = digits.padStart(3, "0");
	const amount = `${padded.slice(0, -2)}.${padded.slice(-2)}`;
	return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(amount) * (negative ? -1 : 1));
}

function parseInputToCents(value: string) {
	const normalized = value.trim().replace(/\./g, "").replace(",", ".");
	if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
	const [whole, fraction = ""] = normalized.split(".");
	return `${BigInt(whole)}${fraction.padEnd(2, "0")}`.replace(/^0+(?=\d)/, "");
}

function formatTime(value: Date | string) {
	return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: BRAZIL_TIME_ZONE }).format(new Date(value));
}

function lotStatusLabel(status: string) {
	return ({ OPEN: "Aberto", PAUSED: "Pausado", SOLD: "Vendido", UNSOLD: "Não vendido", CLOSING: "Fechando", QUEUED: "Na fila", CANCELLED: "Cancelado" } as Record<string, string>)[status] ?? status;
}

function auctionStatusLabel(status: string) {
	return ({ DRAFT: "Rascunho", REVIEW: "Em revisão", RUNNING: "Em andamento", SCHEDULED: "Em breve", PAUSED: "Pausado", FINISHED: "Encerrado", CANCELLED: "Cancelado", ABORTED: "Interrompido" } as Record<string, string>)[status] ?? status;
}

function bidSuccessMessage(result: EngineBidResult, currency: string) {
	if (result.sold) return `Compra confirmada por ${formatCents(result.winningAmountCents ?? result.currentPriceCents, currency)}. Este lote foi vendido para você.`;
	if (result.status === "PENDING_APPROVAL") return "Este retorno pertence ao fluxo legado de aprovação. Atualize a página e envie o lance novamente.";
	if (result.proxyMaxBidCents) return `Teto automático salvo até ${formatCents(result.proxyMaxBidCents, currency)}. O lance público segue no menor valor necessário e continua protegido automaticamente.`;
	return "Lance aceito pelo motor e atualizado no placar.";
}

function updateLot(snapshot: EngineAuctionSnapshot, event: Record<string, unknown>): EngineAuctionSnapshot {
	const lotIdentity = typeof event.externalLotId === "string" ? event.externalLotId : typeof event.lotId === "string" ? event.lotId : null;
	if (!lotIdentity) return snapshot;
	const rawLotStatus = typeof event.lotStatus === "string" ? event.lotStatus : event.status;
	const lotStatus = typeof rawLotStatus === "string" && ["DRAFT", "QUEUED", "OPEN", "PAUSED", "CLOSING", "SOLD", "UNSOLD", "CANCELLED"].includes(rawLotStatus) ? rawLotStatus : null;
	return {
		...snapshot,
		lots: snapshot.lots.map((lot) => lot.id !== lotIdentity && lot.externalId !== lotIdentity ? lot : {
			...lot,
			currentPriceCents: typeof event.currentPriceCents === "string" ? event.currentPriceCents : lot.currentPriceCents,
			currentIncrementCents: typeof event.currentIncrementCents === "string" ? event.currentIncrementCents : lot.currentIncrementCents,
			nextBidCents: typeof event.nextBidCents === "string" ? event.nextBidCents : lot.nextBidCents,
			currentBidderAlias: typeof event.currentBidderAlias === "string" ? event.currentBidderAlias : lot.currentBidderAlias,
			currentBidderName: typeof event.currentBidderName === "string" ? event.currentBidderName : event.currentBidderName === null ? null : lot.currentBidderName,
			winnerName: typeof event.winnerName === "string" ? event.winnerName : event.winnerName === null ? null : lot.winnerName,
			winningAmountCents: typeof event.winningAmountCents === "string" ? event.winningAmountCents : event.winningAmountCents === null ? null : lot.winningAmountCents,
			closedAt: typeof event.closedAt === "string" ? event.closedAt : event.closedAt === null ? null : lot.closedAt,
			lotSequence: typeof event.lotSequence === "string" ? event.lotSequence : lot.lotSequence,
			version: typeof event.version === "string" ? event.version : lot.version,
			endsAt: typeof event.endsAt === "string" ? event.endsAt : lot.endsAt,
			startsAt: typeof event.startsAt === "string" ? event.startsAt : lot.startsAt,
			status: lotStatus ?? lot.status,
		}),
	};
}

function isClosedLot(lot: EngineAuctionSnapshot["lots"][number]) {
	return ["SOLD", "UNSOLD", "CANCELLED"].includes(lot.status);
}

function isPublicActiveLot(lot: EngineAuctionSnapshot["lots"][number]) {
	return ["OPEN", "CLOSING"].includes(lot.status);
}

function updateStream(snapshot: EngineAuctionSnapshot, payload: Record<string, unknown>): EngineAuctionSnapshot {
	const current = snapshot.stream;
	if (typeof payload.status !== "string" && typeof payload.streamId !== "string") return snapshot;
	const stream: EngineStream = { id: typeof payload.streamId === "string" ? payload.streamId : current?.id ?? "stream", provider: typeof payload.provider === "string" ? payload.provider : current?.provider ?? "mock", playbackUrl: typeof payload.playbackUrl === "string" ? payload.playbackUrl : current?.playbackUrl ?? null, providerStreamId: typeof payload.providerStreamId === "string" ? payload.providerStreamId : current?.providerStreamId ?? null, status: typeof payload.status === "string" ? payload.status : current?.status ?? "CREATED", version: typeof payload.version === "string" ? payload.version : current?.version ?? "0", updatedAt: typeof payload.serverTime === "string" ? payload.serverTime : new Date().toISOString() };
	return { ...snapshot, stream };
}

type BoardFeedback = { type: "success" | "error"; message: string; code?: string; correlationId?: string };
type LiveNotification = { id: number; message: string; tone: "price" | "status" | "system"; createdAt: Date };
type CommercialTerms = Pick<Auction, "regulationText" | "paymentText" | "deliveryText">;

export function AuctionRuntimeBoard({ externalAuctionId, initialSnapshot, focusLotExternalId, catalogLots = [], commercialTerms, hideClosedAuction = false }: { externalAuctionId: string; initialSnapshot: EngineAuctionSnapshot; focusLotExternalId?: string; catalogLots?: AuctionLot[]; commercialTerms?: CommercialTerms; hideClosedAuction?: boolean }) {
	const [snapshot, setSnapshot] = useState(initialSnapshot);
	const snapshotRef = useRef(initialSnapshot);
	const [connection, setConnection] = useState<"connecting" | "connected" | "polling">("connecting");
	const connectionRef = useRef<"connecting" | "connected" | "polling">("connecting");
	const [feedback, setFeedback] = useState<BoardFeedback | null>(null);
	const [notifications, setNotifications] = useState<LiveNotification[]>([]);
	const [registrationState, setRegistrationState] = useState<"checking" | "available" | "pending" | "approved">("checking");
	const [loginDialogOpen, setLoginDialogOpen] = useState(false);
	const [registrationDialogOpen, setRegistrationDialogOpen] = useState(false);

	const notify = useCallback((message: string, tone: LiveNotification["tone"] = "system") => {
		const item = { id: Date.now() + Math.floor(Math.random() * 1000), message, tone, createdAt: new Date() };
		setNotifications((current) => [item, ...current].slice(0, 5));
		window.setTimeout(() => setNotifications((current) => current.filter((notification) => notification.id !== item.id)), 6000);
	}, []);

	const applySnapshot = useCallback((next: EngineAuctionSnapshot, announceChanges = true) => {
		const previous = snapshotRef.current;
		const merged = mergeKnownBidderNames(previous, next);
		if (announceChanges) {
			merged.lots.forEach((nextLot) => {
				const previousLot = previous.lots.find((lot) => lot.id === nextLot.id);
				if (!previousLot) return;
				if (previousLot.currentPriceCents !== nextLot.currentPriceCents && nextLot.currentPriceCents !== null) notify(`Lote ${String(nextLot.lotNumber).padStart(2, "0")} atualizado para ${formatCents(nextLot.currentPriceCents, merged.auction.currency)}.`, "price");
				if (previousLot.status !== nextLot.status) notify(`Lote ${String(nextLot.lotNumber).padStart(2, "0")} agora está ${lotStatusLabel(nextLot.status)}.`, "status");
			});
			if (previous.auction.status !== merged.auction.status) notify(`O leilão agora está ${auctionStatusLabel(merged.auction.status).toLowerCase()}.`, "status");
			if (previous.stream?.status !== merged.stream?.status) notify(merged.stream?.status === "LIVE" ? "A transmissão entrou ao vivo." : "O estado da transmissão foi atualizado.", "system");
		}
		snapshotRef.current = merged;
		setSnapshot(merged);
	}, [notify]);

	const updateConnection = (next: "connecting" | "connected" | "polling") => { connectionRef.current = next; setConnection(next); };

	useEffect(() => {
		let stopped = false;
		let socket: WebSocket | null = null;
		let retryTimer: ReturnType<typeof setTimeout> | undefined;
		let retryCount = 0;

		const poll = async () => {
			const result = await getEngineSnapshotAction(externalAuctionId);
			if (stopped) return;
			if (result.success && result.data) { applySnapshot(result.data); if (connectionRef.current !== "connected") updateConnection("polling"); }
		};
		const connect = async () => {
			if (stopped) return;
			if (connectionRef.current !== "connected") updateConnection("connecting");
			const ticketResult = await issueRealtimeTicketAction(externalAuctionId);
			if (!ticketResult.success || !ticketResult.data) {
				if (isAuctionAuthenticationError(ticketResult.errorCode)) setLoginDialogOpen(true);
				updateConnection("polling");
				return;
			}
			const wsBase = process.env.NEXT_PUBLIC_AUCTION_ENGINE_WS_URL || "ws://localhost:4100/ws";
			socket = new WebSocket(`${wsBase}?ticket=${encodeURIComponent(ticketResult.data.ticket)}&auctionId=${encodeURIComponent(ticketResult.data.auctionId)}`);
			socket.onopen = () => { retryCount = 0; updateConnection("connected"); notify("Conexão ao placar oficial estabelecida.", "system"); };
			socket.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data as string) as { type?: string; snapshot?: EngineAuctionSnapshot; event?: { eventType?: string; payload?: Record<string, unknown> } };
					if (data.type === "snapshot" && data.snapshot) applySnapshot(data.snapshot, false);
					if ((data.type === "event" || data.type === "replayed") && data.event?.payload) {
						const next = data.event.eventType === "stream.changed" ? updateStream(snapshotRef.current, data.event.payload) : updateLot(snapshotRef.current, data.event.payload);
						applySnapshot(next);
						if (data.event.eventType === "bid.accepted") notify("Novo lance confirmado no placar.", "price");
						if (data.event.eventType === "lot.sold") notify("Lote fechado e vendido.", "status");
					}
				} catch { notify("Recebemos uma atualização inválida; a consulta automática continua ativa.", "system"); }
			};
			socket.onclose = () => { if (!stopped) { updateConnection("polling"); retryTimer = setTimeout(connect, Math.min(10000, 1200 * 2 ** retryCount)); retryCount += 1; } };
		};
		void poll();
		void connect();
		const pollTimer = window.setInterval(() => void poll(), 2500);
		return () => { stopped = true; window.clearInterval(pollTimer); if (retryTimer) clearTimeout(retryTimer); socket?.close(); };
	}, [applySnapshot, externalAuctionId, notify]);

	useEffect(() => {
		let active = true;
		void getAuctionRegistrationAction(externalAuctionId).then((result) => {
			if (!active) return;
			const registration = result.success ? result.data : null;
			setRegistrationState(registration?.status === "APPROVED" && registration.globallyEnabled !== false ? "approved" : registration?.status === "PENDING" ? "pending" : "available");
		});
		return () => { active = false; };
	}, [externalAuctionId]);

	const refreshState = async () => {
		const result = await getEngineSnapshotAction(externalAuctionId);
		if (result.success && result.data) { applySnapshot(result.data, false); setFeedback(null); notify("Estado oficial atualizado.", "system"); }
		else setFeedback({ type: "error", message: result.error || "Não foi possível atualizar o estado.", code: result.errorCode, correlationId: result.correlationId });
	};

	const handleRegister = async () => {
		if (registrationState === "pending") return;
		setRegistrationDialogOpen(true);
	};

	const confirmRegistration = async (whatsappOptIn: boolean) => {
		setRegistrationState("checking");
		const result = await registerAuctionAction(externalAuctionId, snapshot.auction.regulationVersion, detectAcquisitionSource(), whatsappOptIn);
		if (result.success && result.data) {
			const nextState = result.data.status === "APPROVED" && result.data.globallyEnabled !== false ? "approved" : result.data.status === "PENDING" ? "pending" : "available";
			setRegistrationState(nextState);
			const message = nextState === "approved" ? "Cadastro confirmado nesta conta. Você já pode enviar lances nos lotes abertos." : nextState === "pending" ? "Solicitação enviada. Aguarde a validação da gestão antes de enviar lances." : "Sua participação não está habilitada para este leilão.";
			setFeedback({ type: "success", message });
			notify(nextState === "approved" ? "Cadastro confirmado." : "Solicitação de participação enviada.", "system");
			setRegistrationDialogOpen(false);
		}
		else if (isAuctionAuthenticationError(result.errorCode)) {
			setRegistrationState("available");
			setFeedback(null);
			setLoginDialogOpen(true);
		}
		else { setRegistrationState("available"); setFeedback({ type: "error", message: result.error || "Não foi possível habilitar sua participação.", code: result.errorCode, correlationId: result.correlationId }); }
	};

	const auctionIsRunning = snapshot.auction.status === "RUNNING";
	const preBidIsOpen = isPreBidOpen(snapshot.auction);
	const isPreBid = hasConfiguredPreBid(snapshot.auction) && (preBidIsOpen || snapshot.auction.status === "SCHEDULED");
	const connectionLabel = connection === "connected" ? "Placar conectado" : connection === "connecting" ? "Conectando ao placar…" : "Atualização automática";
	const registrationLabel = registrationState === "checking" ? "Verificando participação…" : registrationState === "pending" ? "Aguardando validação" : "Habilitar participação";
	const activeLots = snapshot.lots.filter(isPublicActiveLot).filter((lot) => !focusLotExternalId || lot.externalId === focusLotExternalId).sort((a, b) => a.lotNumber - b.lotNumber);
	const closedLots = snapshot.lots.filter(isClosedLot).filter((lot) => !focusLotExternalId || lot.externalId === focusLotExternalId).sort((a, b) => b.lotNumber - a.lotNumber);
	const upcomingLots = snapshot.lots.filter((lot) => lot.status === "QUEUED" || lot.status === "PAUSED").sort((a, b) => a.lotNumber - b.lotNumber);
	const onBidResult = (result: ActionResult<EngineBidResult | Record<string, unknown>>) => {
		if (result.success && result.data) {
			const bidResult = result.data as EngineBidResult;
			applySnapshot(updateLot(snapshotRef.current, bidResult as unknown as Record<string, unknown>));
			setFeedback({ type: "success", message: bidSuccessMessage(bidResult, snapshot.auction.currency) });
			notify(bidResult.sold ? "Compra confirmada e lote vendido." : "Seu lance foi confirmado.", "price");
		} else if (isAuctionAuthenticationError(result.errorCode)) {
			setFeedback(null);
			setLoginDialogOpen(true);
		} else {
			if (result.errorCode === "REGISTRATION_REQUIRED") setRegistrationState("available");
			setFeedback({ type: "error", message: result.error || "Lance rejeitado.", code: result.errorCode, correlationId: result.correlationId });
		}
	};
	if (hideClosedAuction && ["FINISHED", "CLOSED", "CANCELLED", "ABORTED"].includes(snapshot.auction.status)) return <p role="status" className="mt-6 rounded-xl border bg-card p-5">Leilão encerrado. Os lotes não estão mais disponíveis para consulta pública.</p>;
	if (snapshot.auction.mode === "SHOPPING") return null;
	return <>
		<section aria-label="Estado e participação do leilão" className={styles.board}>
			<div className={styles.layout}>
				<div className={styles.stream}>
					<LiveStreamPlayer stream={snapshot.stream} title={snapshot.auction.title} />
				</div>
				<div className={styles.bidding}>
					{activeLots.length > 0 ? activeLots.map((lot) => (
						<RuntimeLot
							key={lot.id}
							auctionId={externalAuctionId}
							auction={snapshot.auction}
							currency={snapshot.auction.currency}
							lot={lot}
							catalogLot={catalogLots.find((item) => item.id === lot.externalId || item.slug === lot.externalId)}
							commercialTerms={commercialTerms}
							registrationApproved={registrationState === "approved"}
							registrationWaiting={registrationState === "checking" || registrationState === "pending"}
							registrationLabel={registrationLabel}
							onRequireRegistration={handleRegister}
							onResult={onBidResult}
						/>
					)) : (
						<div className={styles.empty}>
							<BadgeCheck className="mb-3 size-6 text-secondary" aria-hidden="true" />
							<h2>{isPreBid ? "Aguardando abertura dos pré-lances" : auctionIsRunning ? "Aguardando o próximo lote" : auctionStatusLabel(snapshot.auction.status)}</h2>
							<p>Assim que um lote for aberto, ele aparecerá aqui automaticamente.</p>
							{registrationState !== "approved" ? <Button type="button" variant="secondary" className="mt-4 min-h-11 w-full" onClick={handleRegister} disabled={registrationState === "checking" || registrationState === "pending"}>{registrationLabel}</Button> : null}
						</div>
					)}
					{feedback?.type === "success" ? <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{feedback.message}</p> : null}
					{feedback?.type === "error" ? <EngineCommandFeedback message={feedback.message} code={feedback.code} correlationId={feedback.correlationId} onRefresh={() => void refreshState()} /> : null}
				</div>
				{upcomingLots.length > 0 ? <UpcomingLots lots={upcomingLots} catalogLots={catalogLots} /> : null}
			</div>
			<div className={styles.connection}>
				<span>{connection === "connected" ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}{connectionLabel}{!auctionIsRunning ? ` · ${auctionStatusLabel(snapshot.auction.status)}` : ""}</span>
				<Button type="button" variant="ghost" size="sm" onClick={() => void refreshState()}><RefreshCw aria-hidden="true" />Atualizar placar</Button>
			</div>
			{notifications.length > 0 ? <details className={styles.updates}><summary>Atualizações do leilão</summary><ul>{notifications.map((notification) => <li key={notification.id}>{notification.message}</li>)}</ul></details> : null}
			<div className="sr-only" role="status" aria-live="polite">{notifications[0]?.message}</div>
			{closedLots.length > 0 ? <ClosedLotsSection lots={closedLots} currency={snapshot.auction.currency} catalogLots={catalogLots} /> : null}
			{registrationState === "approved" ? <details className={styles.updates}><summary>Notificações pelo WhatsApp</summary><AuctionWhatsAppConsentControl auctionId={externalAuctionId} /></details> : null}
		</section>
		<AuctionLoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
		<AuctionRegistrationDialog auctionId={externalAuctionId} open={registrationDialogOpen} onOpenChange={setRegistrationDialogOpen} onConfirm={confirmRegistration} />
	</>;
}

function UpcomingLots({ lots, catalogLots }: { lots: EngineLot[]; catalogLots: AuctionLot[] }) {
	const [showAll, setShowAll] = useState(false);
	return <section className={styles.upcoming} aria-label="Próximos lotes">
		<div className={styles.upcomingHeader}>
			<h2>Próximos lotes</h2>
			<button type="button" aria-expanded={showAll} aria-controls="proximos-lotes" onClick={() => setShowAll((current) => !current)}>{showAll ? "Mostrar menos" : "Ver todos"} <ArrowRight aria-hidden="true" /></button>
		</div>
		<div id="proximos-lotes" className={`${styles.lotList} ${showAll ? styles.allLots : ""}`} tabIndex={0} role="region" aria-label="Lista de próximos lotes">
			{lots.map((lot) => {
				const catalogLot = catalogLots.find((item) => item.id === lot.externalId || item.slug === lot.externalId);
				const content = <>
					<div className={styles.previewImage}><Image src={catalogLot?.image || "/placeholder-image.svg"} alt="" fill sizes="76px" /></div>
					<div className={styles.previewText}><strong>Lote {String(lot.lotNumber).padStart(2, "0")}</strong><p>{lot.title}</p></div>
				</>;
				return catalogLot ? <Link key={lot.id} className={styles.preview} href={`/leiloes/${catalogLot.auctionSlug}/lotes/${catalogLot.slug}`}>{content}</Link> : <div key={lot.id} className={styles.preview}>{content}</div>;
			})}
		</div>
	</section>;
}

function LotConditions({ lot, terms }: { lot?: AuctionLot; terms?: CommercialTerms }) {
	const information = [
		{ title: "Pagamento", icon: Banknote, text: lot?.payment || terms?.paymentText || "Consulte as condições de pagamento com a equipe do leilão." },
		{ title: "Regulamento", icon: FileText, text: terms?.regulationText || "Consulte o regulamento com a equipe do leilão." },
		{ title: "Frete e entrega", icon: Truck, text: lot?.deliveryDescription || terms?.deliveryText || "Consulte as condições de frete e entrega com a equipe do leilão." },
	];
	return <div className={styles.conditions}>
		{lot?.genealogyUrl ? <a className={styles.genealogy} href={lot.genealogyUrl} target="_blank" rel="noopener noreferrer" aria-label={`Abrir PDF da genealogia do lote ${lot.number} em nova guia`}><GitFork aria-hidden="true" />Ver genealogia do lote</a> : null}
		{information.map(({ title, icon: Icon, text }) => <details key={title} className={styles.condition}>
			<summary><span><Icon aria-hidden="true" />{title}</span>{title === "Pagamento" && (lot?.payment || terms?.paymentText) ? <span className={styles.paymentPreview}>{text}</span> : null}<ChevronDown aria-hidden="true" /></summary>
			<p>{text}</p>
		</details>)}
	</div>;
}

function ClosedLotsSection({ lots, currency, catalogLots }: { lots: EngineAuctionSnapshot["lots"]; currency: string; catalogLots: AuctionLot[] }) {
	return <section className="mt-10 border-t pt-8" aria-label="Lotes encerrados">
		<div className="flex items-end justify-between gap-3">
			<div><p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><History className="size-3.5" />Histórico oficial</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Lotes encerrados</h2><p className="mt-1 text-sm text-muted-foreground">Resultado final, vencedor e valor registrado pelo motor.</p></div>
			<span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{lots.length} {lots.length === 1 ? "lote" : "lotes"}</span>
		</div>
		<div className="mt-4 grid gap-3 md:grid-cols-2">
			{lots.map((lot) => <ClosedLotCard key={lot.id} lot={lot} currency={currency} catalogLot={catalogLots.find((item) => item.id === lot.externalId || item.slug === lot.externalId)} />)}
		</div>
	</section>;
}

function ClosedLotCard({ lot, currency, catalogLot }: { lot: EngineLot; currency: string; catalogLot?: AuctionLot }) {
	const winner = getReadableBidderName(lot.winnerName) || getReadableBidderName(lot.currentBidderName) || getReadableBidderName(lot.currentBidderAlias);
	const finalAmount = lot.winningAmountCents ?? lot.currentPriceCents;
	const sold = lot.status === "SOLD";
	return <article key={lot.id} className="rounded-2xl border bg-card p-4 shadow-xs"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Lote {String(lot.lotNumber).padStart(2, "0")}</p><h3 className="mt-1 font-bold">{lot.title}</h3></div><span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sold ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{sold ? <Trophy className="size-3.5" /> : null}{lotStatusLabel(lot.status)}</span></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/45 p-3"><div><p className="text-xs text-muted-foreground">{sold ? "Valor final" : "Resultado"}</p><p className="mt-1 font-semibold tabular-nums">{sold && finalAmount ? formatCents(finalAmount, currency) : "Sem venda"}</p></div><div><p className="text-xs text-muted-foreground">{sold ? "Vencedor" : "Observação"}</p><p className="mt-1 truncate font-semibold" title={winner ?? undefined}>{sold ? winner ?? "Participante identificado" : lot.status === "CANCELLED" ? "Lote cancelado" : "Não houve vencedor"}</p></div></div>{catalogLot && (sold || lot.status === "UNSOLD") ? <Link className="mt-3 inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-semibold text-secondary hover:bg-muted" href={`/leiloes/${catalogLot.auctionSlug}/lotes/${catalogLot.slug}`}>{sold ? "Ver lote vendido" : "Ver lote"}</Link> : null}{lot.closedAt ? <p className="mt-3 text-xs text-muted-foreground">Encerrado às {formatTime(lot.closedAt)}</p> : null}</article>;
}

function RuntimeLot({ auctionId, auction, currency, lot, catalogLot, commercialTerms, registrationApproved, registrationWaiting, registrationLabel, onRequireRegistration, onResult }: { auctionId: string; auction: EngineAuctionSnapshot["auction"]; currency: string; lot: EngineLot; catalogLot?: AuctionLot; commercialTerms?: CommercialTerms; registrationApproved: boolean; registrationWaiting: boolean; registrationLabel: string; onRequireRegistration: () => Promise<void>; onResult: (result: ActionResult<EngineBidResult | Record<string, unknown>>) => void }) {
	const [amount, setAmount] = useState("");
	const [selectedBidValue, setSelectedBidValue] = useState(lot.nextBidCents);
	const [busy, setBusy] = useState(false);
	const [pendingControl, setPendingControl] = useState<"quick" | "custom" | "proxy" | null>(null);
	const [proxyMaxBidCents, setProxyMaxBidCents] = useState<string | null>(null);
	useEffect(() => {
		let active = true;
		void getOwnProxyBidAction(auctionId, lot.externalId).then((result) => {
			if (active && result.success) setProxyMaxBidCents(result.data?.maxBidCents ?? null);
		});
		return () => { active = false; };
	}, [auctionId, lot.externalId]);
	const minimum = useMemo(() => formatCents(lot.nextBidCents, currency), [lot.nextBidCents, currency]);
	const quickBidOptions = useMemo(() => getEngineQuickBidOptions(lot), [lot]);
	const quickBids = useMemo(() => quickBidOptions.map((option) => option.value), [quickBidOptions]);
	const effectiveSelectedBidValue = selectedBidValue !== "custom" && !quickBids.includes(selectedBidValue) ? quickBids[0] ?? "custom" : selectedBidValue;
	const canBid = registrationApproved && auctionAcceptsBids(auction) && lot.status === "OPEN";
	const bidWindowOpen = auctionAcceptsBids(auction) && lot.status === "OPEN";
	const selectedFixedBidIsBlocked = effectiveSelectedBidValue !== "custom" && proxyMaxBidCents !== null && BigInt(effectiveSelectedBidValue) <= BigInt(proxyMaxBidCents);
	const bidUnavailableMessage = !registrationApproved ? "Habilite sua participação para enviar lances." : !auctionAcceptsBids(auction) ? auction.status === "SCHEDULED" && auction.mode !== "LIVE" ? "O pré-lance ainda não começou ou não está configurado." : auction.mode === "LIVE" && auction.status !== "RUNNING" ? auction.status === "PAUSED" ? "A disputa ao vivo está pausada. Aguarde a abertura." : "A disputa ao vivo ainda não começou." : "O período de pré-lance está pausado ou encerrado." : "Este lote está fora de disputa no momento.";
	const submitAmount = async (amountCents: string, proxy: boolean, control: "quick" | "custom" | "proxy") => {
		if (busy) return;
		if (!registrationApproved) { await onRequireRegistration(); return; }
		setBusy(true);
		setPendingControl(control);
		try {
			const result = proxy ? await setProxyBidAction(auctionId, lot.externalId, amountCents, lot.version) : await placeBidAction(auctionId, lot.externalId, amountCents, lot.version);
			if (proxy && result.success && result.data?.proxyMaxBidCents) setProxyMaxBidCents(result.data.proxyMaxBidCents);
			onResult(result);
		} finally {
			setBusy(false);
			setPendingControl(null);
		}
	};
	const submit = async (proxy: boolean) => {
		const amountCents = parseInputToCents(amount);
		if (!amountCents) { onResult({ success: false, error: "Informe um valor válido em reais." }); return; }
		await submitAmount(amountCents, proxy, proxy ? "proxy" : "custom");
	};
	const bidderName = getBidderDisplayName(lot);
	const lotNumber = String(lot.lotNumber).padStart(2, "0");
	const selectedAmount = effectiveSelectedBidValue === "custom" ? parseInputToCents(amount) : effectiveSelectedBidValue;
	return <article aria-busy={busy} className={styles.lot}>
		<div className={styles.lotStatus} data-status={lot.status}>LOTE {lotNumber} · {lotStatusLabel(lot.status).toLocaleUpperCase("pt-BR")}</div>
		<div className={styles.lotBody}>
			<h2 className={styles.lotTitle}>LOTE {lotNumber} - {lot.title}</h2>
			<div className={styles.price}>
				<p>{lot.currentPriceCents === null ? "Lance inicial" : "Último lance"}</p>
				<strong key={lot.currentPriceCents} className="pr-bid-change">{formatCents(lot.currentPriceCents ?? lot.startingBidCents, currency)}</strong>
			</div>
			{bidderName ? <p className={styles.bidder}>Liderança: {bidderName}</p> : null}
			<div className={styles.nextBid}><span>Próximo lance</span><strong>{selectedAmount ? formatCents(selectedAmount, currency) : minimum}</strong></div>
			<Button
				type="button"
				className={styles.bidButton}
				disabled={!bidWindowOpen || busy || registrationWaiting || selectedFixedBidIsBlocked}
				onClick={() => effectiveSelectedBidValue === "custom" ? void submit(false) : void submitAmount(effectiveSelectedBidValue, false, "quick")}
			>
				{pendingControl ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" />Enviando…</> : registrationWaiting ? registrationLabel : "Dar lance"}
			</Button>
			<details className={styles.bidOptions}>
				<summary>Escolher outro valor<ChevronDown aria-hidden="true" /></summary>
				<label htmlFor={`bid-value-${lot.id}`}>Valor do lance
					<select id={`bid-value-${lot.id}`} aria-label="Valor do lance" value={effectiveSelectedBidValue} onChange={(event) => setSelectedBidValue(event.target.value)} disabled={!bidWindowOpen || busy}>
						{quickBidOptions.map((option) => <option key={option.value} value={option.value}>{formatCents(option.value, currency)}</option>)}
						<option value="custom">Outro valor personalizado</option>
					</select>
				</label>
				{effectiveSelectedBidValue === "custom" ? <label htmlFor={`custom-bid-${lot.id}`}>Valor personalizado
					<Input id={`custom-bid-${lot.id}`} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="1.250,00" disabled={!bidWindowOpen || busy} />
				</label> : null}
			</details>
			{!canBid && !registrationWaiting ? <p className={styles.eligibility}><CircleAlert aria-hidden="true" />{bidUnavailableMessage}</p> : null}
			{selectedFixedBidIsBlocked ? <p className={styles.eligibility}>Seu lance automático já cobre este valor. Escolha um valor maior.</p> : null}
		</div>
		<LotConditions lot={catalogLot} terms={commercialTerms} />
	</article>;
}
