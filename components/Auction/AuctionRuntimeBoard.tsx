"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, BadgeCheck, BellRing, CircleAlert, Clock3, History, Loader2, Radio, RefreshCw, Send, Trophy, Wifi, WifiOff, Zap } from "lucide-react";
import { AuctionLoginDialog } from "@/components/Auction/AuctionLoginDialog";
import { EngineCommandFeedback } from "@/components/Auction/EngineCommandFeedback";
import { ShoppingRuntimeLot } from "@/components/Auction/ShoppingRuntimeLot";
import { LiveStreamPlayer } from "@/components/Auction/LiveStreamPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buyShoppingLotAction, getAuctionRegistrationAction, getEngineSnapshotAction, getOwnProxyBidAction, issueRealtimeTicketAction, placeBidAction, registerAuctionAction, setProxyBidAction } from "@/hooks/actions/auctionEngineActions";
import type { EngineAuctionSnapshot, EngineBidResult, EngineLot, EngineStream } from "@/lib/auctions/engine-types";
import { getEngineQuickBidOptions } from "@/lib/auctions/engine-formatters";
import { auctionAcceptsBids, hasConfiguredPreBid, isPreBidOpen } from "@/lib/auctions/bid-window";
import { isAuctionAuthenticationError } from "@/lib/auctions/auth";
import { getBidderDisplayName, getReadableBidderName, mergeKnownBidderNames } from "@/lib/auctions/bidder-display";
import { BRAZIL_TIME_ZONE } from "@/lib/utils/formatters";
import type { ActionResult } from "@/types/common";
import { detectAcquisitionSource } from "@/lib/auctions/acquisition-sources";

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

export function AuctionRuntimeBoard({ externalAuctionId, initialSnapshot, focusLotExternalId }: { externalAuctionId: string; initialSnapshot: EngineAuctionSnapshot; focusLotExternalId?: string }) {
	const [snapshot, setSnapshot] = useState(initialSnapshot);
	const snapshotRef = useRef(initialSnapshot);
	const [connection, setConnection] = useState<"connecting" | "connected" | "polling">("connecting");
	const connectionRef = useRef<"connecting" | "connected" | "polling">("connecting");
	const [feedback, setFeedback] = useState<BoardFeedback | null>(null);
	const [notifications, setNotifications] = useState<LiveNotification[]>([]);
	const [registrationState, setRegistrationState] = useState<"checking" | "available" | "pending" | "approved">("checking");
	const [loginDialogOpen, setLoginDialogOpen] = useState(false);

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
		setRegistrationState("checking");
		const result = await registerAuctionAction(externalAuctionId, snapshot.auction.regulationVersion, detectAcquisitionSource());
		if (result.success && result.data) {
			const nextState = result.data.status === "APPROVED" && result.data.globallyEnabled !== false ? "approved" : result.data.status === "PENDING" ? "pending" : "available";
			setRegistrationState(nextState);
			const message = nextState === "approved" ? "Cadastro confirmado nesta conta. Você já pode enviar lances nos lotes abertos." : nextState === "pending" ? "Solicitação enviada. Aguarde a validação da gestão antes de enviar lances." : "Sua participação não está habilitada para este leilão.";
			setFeedback({ type: "success", message });
			notify(nextState === "approved" ? "Cadastro confirmado." : "Solicitação de participação enviada.", "system");
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
	const isShopping = snapshot.auction.mode === "SHOPPING";
	const isPreBid = !isShopping && hasConfiguredPreBid(snapshot.auction) && (preBidIsOpen || snapshot.auction.status === "SCHEDULED");
	const liveStreamAvailable = snapshot.auction.mode === "LIVE" && auctionIsRunning;
	const connectionLabel = connection === "connected" ? "Ao vivo" : connection === "connecting" ? "Conectando" : "Atualização automática";
	const registrationLabel = registrationState === "checking" ? "Verificando participação…" : registrationState === "pending" ? "Aguardando validação" : "Habilitar participação";
	const activeLots = snapshot.lots.filter(isPublicActiveLot).filter((lot) => !focusLotExternalId || lot.externalId === focusLotExternalId);
	const closedLots = snapshot.lots.filter(isClosedLot).filter((lot) => !focusLotExternalId || lot.externalId === focusLotExternalId).sort((a, b) => b.lotNumber - a.lotNumber);
	const focusedLot = focusLotExternalId ? snapshot.lots.find((lot) => lot.externalId === focusLotExternalId) : null;
	const boardTitle = focusLotExternalId ? `${isShopping ? "Compra do lote" : "Lance no lote"} ${focusedLot ? String(focusedLot.lotNumber).padStart(2, "0") : ""}` : isShopping ? "Lotes para compra imediata" : isPreBid ? "Lotes disponíveis para pré-lance" : "Lotes em tempo real";
	const boardDescription = focusLotExternalId ? (isShopping ? "O primeiro usuário habilitado que confirmar compra fica com o lote." : "Acompanhe o preço oficial e envie seu lance diretamente nesta página.") : isShopping ? "Escolha um lote aberto e confirme a compra pelo preço fixo." : isPreBid ? "Envie seus lances antes da abertura. O placar oficial acompanha tudo automaticamente." : "Os próximos lotes entram aqui assim que o manager os abrir.";
	return <>
	<section aria-label="Estado e participação do leilão" className="mt-10 space-y-6">
		<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
			<div className="space-y-5">
				{liveStreamAvailable ? <LiveStreamPlayer stream={snapshot.stream} title={snapshot.auction.title} /> : <div className="flex min-h-56 items-center gap-4 rounded-2xl border bg-card p-6 shadow-xs sm:p-8"><span className="rounded-xl bg-muted p-3 text-muted-foreground">{isPreBid ? <Clock3 className="size-5" /> : <Radio className="size-5" />}</span><div><p className="text-sm font-semibold text-foreground">{isPreBid ? (preBidIsOpen ? "Pré-lance aberto" : "Pré-lance indisponível") : "A transmissão ainda não começou"}</p><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{isPreBid ? (preBidIsOpen ? "Você já pode enviar pré-lances nos lotes abertos. Esta etapa não depende de transmissão ao vivo." : "O período de pré-lance está pausado ou encerrado.") : "Os lotes podem ser consultados. A disputa ao vivo será liberada quando o manager iniciar o leilão."} Estado atual: <strong className="font-semibold text-foreground">{auctionStatusLabel(snapshot.auction.status)}</strong>.</p></div></div>}
				<div className="grid gap-3 sm:grid-cols-3"><LiveMetric icon={isPreBid ? <Clock3 className="size-4" /> : <Radio className="size-4" />} label={isPreBid ? "Formato" : "Transmissão"} value={isPreBid ? "Pré-lance" : liveStreamAvailable && snapshot.stream?.status === "LIVE" ? "Ao vivo" : "Aguardando"} tone={isPreBid ? "blue" : liveStreamAvailable && snapshot.stream?.status === "LIVE" ? "green" : "amber"} /><LiveMetric icon={<Activity className="size-4" />} label="Lotes visíveis" value={`${activeLots.length} ${isPreBid ? "em pré-lance" : "em disputa"}`} /><LiveMetric icon={connection === "connected" ? <Wifi className="size-4" /> : <WifiOff className="size-4" />} label="Estado do placar" value={connectionLabel} tone={connection === "connected" ? "green" : "blue"} /></div>
				{registrationState !== "approved" ? <div className="rounded-2xl border bg-card p-4 shadow-xs sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sua participação</p><div className="mt-1 inline-flex items-center gap-2 text-lg font-bold"><Zap className="size-5 text-primary" />Entre na disputa</div></div><Button type="button" variant="secondary" className="active:scale-[0.96] transition-transform" onClick={handleRegister} disabled={registrationState === "checking" || registrationState === "pending"}>{registrationState === "pending" ? <Clock3 className="size-4" /> : null}{registrationLabel}</Button></div><p className="mt-3 text-sm leading-6 text-muted-foreground">Seu cadastro é salvo no servidor e verificado novamente quando você voltar a esta página. O placar é atualizado automaticamente.</p></div> : null}
				{feedback?.type === "success" ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{feedback.message}</p> : null}
				{feedback?.type === "error" ? <EngineCommandFeedback message={feedback.message} code={feedback.code} correlationId={feedback.correlationId} onRefresh={() => void refreshState()} /> : null}
				<div><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{focusLotExternalId ? "Operação do lote" : "Placar oficial"}</p><h2 className="mt-1 text-2xl font-bold tracking-tight">{boardTitle}</h2><p className="mt-1 text-sm text-muted-foreground">{boardDescription}</p></div><Button type="button" variant="ghost" size="sm" onClick={() => void refreshState()}><RefreshCw className="size-4" />Sincronizar</Button></div><div className="grid gap-5 lg:grid-cols-2">{activeLots.length > 0 ? activeLots.map((lot) => <RuntimeLot key={lot.id} auctionId={externalAuctionId} auction={snapshot.auction} currency={snapshot.auction.currency} lot={lot} registrationApproved={registrationState === "approved"} onRequireRegistration={handleRegister} onResult={(result) => { if (result.success && result.data) { const bidResult = result.data as EngineBidResult; applySnapshot(updateLot(snapshotRef.current, bidResult as unknown as Record<string, unknown>)); setFeedback({ type: "success", message: bidSuccessMessage(bidResult, snapshot.auction.currency) }); notify(bidResult.sold ? "Compra confirmada e lote vendido." : "Seu lance foi processado pelo motor.", "price"); } else if (isAuctionAuthenticationError(result.errorCode)) { setFeedback(null); setLoginDialogOpen(true); } else { if (result.errorCode === "REGISTRATION_REQUIRED") setRegistrationState("available"); setFeedback({ type: "error", message: result.error || "Lance rejeitado.", code: result.errorCode, correlationId: result.correlationId }); } }} />) : <div className="rounded-2xl border border-dashed bg-card p-8 text-center lg:col-span-2"><BadgeCheck className="mx-auto size-8 text-primary" /><p className="mt-3 font-semibold">{focusLotExternalId ? "Este lote ainda não está aberto para lances" : isPreBid ? "Nenhum lote aberto para pré-lance" : "O próximo lote ainda não foi aberto"}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{focusLotExternalId ? "O manager ainda não liberou este lote no motor. Assim que o status mudar para aberto, o formulário aparecerá aqui." : isPreBid ? "Os lotes aparecerão assim que forem liberados para receber pré-lances." : "Quando o manager iniciar a próxima disputa, ela aparecerá automaticamente neste placar."}</p></div>}</div>{closedLots.length > 0 ? <ClosedLotsSection lots={closedLots} currency={snapshot.auction.currency} /> : null}</div>
			</div>
			<LiveEventFeed notifications={notifications} />
		</div>
	</section>
	<AuctionLoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
	</>;
}

function LiveMetric({ icon, label, value, tone = "slate" }: { icon: React.ReactNode; label: string; value: string; tone?: "green" | "amber" | "blue" | "slate" }) {
	const tones = { green: "text-emerald-700 bg-emerald-50", amber: "text-amber-700 bg-amber-50", blue: "text-sky-700 bg-sky-50", slate: "text-foreground bg-muted" };
	return <div className="rounded-xl border bg-card p-4 shadow-xs"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span className={`rounded-md p-1.5 ${tones[tone]}`}>{icon}</span>{label}</div><p className="mt-3 text-lg font-bold">{value}</p></div>;
}

function LiveEventFeed({ notifications }: { notifications: LiveNotification[] }) {
	return <aside className="h-fit rounded-2xl border bg-card p-4 shadow-xs xl:sticky xl:top-24"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Atividade</p><h2 className="mt-1 text-lg font-bold">Acontecendo agora</h2></div><span className="relative flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary"><BellRing className="size-4" />{notifications.length > 0 ? <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-red-500 ring-2 ring-card" /> : null}</span></div><div className="mt-4 space-y-3">{notifications.length === 0 ? <div className="rounded-xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">As atualizações do placar e da transmissão aparecerão aqui sem recarregar a página.</div> : notifications.map((notification) => <div key={notification.id} className="flex gap-3 rounded-xl border bg-background p-3"><span className={`mt-0.5 size-2 shrink-0 rounded-full ${notification.tone === "price" ? "bg-emerald-500" : notification.tone === "status" ? "bg-primary" : "bg-sky-500"}`} /><div className="min-w-0"><p className="text-sm font-medium leading-5">{notification.message}</p><p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" />{formatTime(notification.createdAt)}</p></div></div>)}</div></aside>;
}

function ClosedLotsSection({ lots, currency }: { lots: EngineAuctionSnapshot["lots"]; currency: string }) {
	return <section className="mt-10 border-t pt-8" aria-label="Lotes encerrados">
		<div className="flex items-end justify-between gap-3">
			<div><p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><History className="size-3.5" />Histórico oficial</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Lotes encerrados</h2><p className="mt-1 text-sm text-muted-foreground">Resultado final, vencedor e valor registrado pelo motor.</p></div>
			<span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{lots.length} {lots.length === 1 ? "lote" : "lotes"}</span>
		</div>
		<div className="mt-4 grid gap-3 md:grid-cols-2">
			{lots.map((lot) => {
				const winner = getReadableBidderName(lot.winnerName) || getReadableBidderName(lot.currentBidderName) || getReadableBidderName(lot.currentBidderAlias);
				const finalAmount = lot.winningAmountCents ?? lot.currentPriceCents;
				const sold = lot.status === "SOLD";
				return <article key={lot.id} className="rounded-2xl border bg-card p-4 shadow-xs"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Lote {String(lot.lotNumber).padStart(2, "0")}</p><h3 className="mt-1 font-bold">{lot.title}</h3></div><span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sold ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{sold ? <Trophy className="size-3.5" /> : null}{lotStatusLabel(lot.status)}</span></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/45 p-3"><div><p className="text-xs text-muted-foreground">{sold ? "Valor final" : "Resultado"}</p><p className="mt-1 font-semibold tabular-nums">{sold && finalAmount ? formatCents(finalAmount, currency) : "Sem venda"}</p></div><div><p className="text-xs text-muted-foreground">{sold ? "Vencedor" : "Observação"}</p><p className="mt-1 truncate font-semibold" title={winner ?? undefined}>{sold ? winner ?? "Participante identificado" : lot.status === "CANCELLED" ? "Lote cancelado" : "Não houve vencedor"}</p></div></div>{lot.closedAt ? <p className="mt-3 text-xs text-muted-foreground">Encerrado às {formatTime(lot.closedAt)}</p> : null}</article>;
			})}
		</div>
	</section>;
}

function RuntimeLot({ auctionId, auction, currency, lot, registrationApproved, onRequireRegistration, onResult }: { auctionId: string; auction: EngineAuctionSnapshot["auction"]; currency: string; lot: EngineLot; registrationApproved: boolean; onRequireRegistration: () => Promise<void>; onResult: (result: ActionResult<EngineBidResult | Record<string, unknown>>) => void }) {
	const [amount, setAmount] = useState("");
	const [selectedBidValue, setSelectedBidValue] = useState(lot.nextBidCents);
	const [busy, setBusy] = useState(false);
	const [pendingControl, setPendingControl] = useState<"quick" | "custom" | "proxy" | null>(null);
	const [pendingAmount, setPendingAmount] = useState<string | null>(null);
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
	const bidUnavailableMessage = !registrationApproved ? "Habilite sua participação acima para enviar lances." : !auctionAcceptsBids(auction) ? auction.status === "SCHEDULED" && auction.mode !== "LIVE" ? "O pré-lance ainda não começou ou não está configurado." : auction.mode === "LIVE" && auction.status !== "RUNNING" ? "A disputa ao vivo ainda não começou." : "O período de pré-lance está pausado ou encerrado." : "Este lote está fora de disputa no momento.";
	const submitAmount = async (amountCents: string, proxy: boolean, control: "quick" | "custom" | "proxy") => {
		if (busy) return;
		if (!registrationApproved) { await onRequireRegistration(); return; }
		setBusy(true);
		setPendingControl(control);
		setPendingAmount(amountCents);
		try {
			const result = proxy ? await setProxyBidAction(auctionId, lot.externalId, amountCents, lot.version) : await placeBidAction(auctionId, lot.externalId, amountCents, lot.version);
			if (proxy && result.success && result.data?.proxyMaxBidCents) setProxyMaxBidCents(result.data.proxyMaxBidCents);
			onResult(result);
		} finally {
			setBusy(false);
			setPendingControl(null);
			setPendingAmount(null);
		}
	};
	const submit = async (proxy: boolean) => {
		const amountCents = parseInputToCents(amount);
		if (!amountCents) { onResult({ success: false, error: "Informe um valor válido em reais." }); return; }
		await submitAmount(amountCents, proxy, proxy ? "proxy" : "custom");
	};
	const reserve = async () => { if (busy) return; if (!registrationApproved) { await onRequireRegistration(); return; } setBusy(true); setPendingControl("custom"); try { const result = await buyShoppingLotAction(auctionId, lot.externalId); onResult(result); } finally { setBusy(false); setPendingControl(null); } };
	const bidderName = getBidderDisplayName(lot);
	const hasBidder = Boolean(bidderName);
	if (auction.mode === "SHOPPING") return <ShoppingRuntimeLot auctionId={auctionId} auction={auction} currency={currency} lot={lot} registrationApproved={registrationApproved} onResult={onResult} />;
	return <article aria-busy={busy} className="rounded-2xl border bg-card p-5 shadow-xs transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Lote {String(lot.lotNumber).padStart(2, "0")}</p><h3 className="mt-1 truncate text-lg font-bold">{lot.title}</h3></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${lot.status === "OPEN" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{lotStatusLabel(lot.status)}</span></div><div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-muted/45 p-4"><div><p className="text-xs text-muted-foreground">Lance atual</p><p className="mt-1 text-2xl font-bold tabular-nums">{formatCents(lot.currentPriceCents, currency)}</p></div><div><p className="text-xs text-muted-foreground">Próximo lance</p><p className="mt-1 text-lg font-semibold tabular-nums">{minimum}</p></div></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{bidderName ? <>Liderança: <span className="font-semibold text-foreground">{bidderName}</span>.</> : hasBidder ? "Liderança: participante identificado." : "Nenhum lance confirmado."}</p><div className="mt-5 space-y-4"><div role="group" aria-label={`Valores de lance do lote ${lot.lotNumber}`}><label className="grid min-w-0 gap-1.5 text-sm font-bold text-foreground" htmlFor={`bid-value-${lot.id}`}>Valor do próximo lance<select id={`bid-value-${lot.id}`} value={effectiveSelectedBidValue} onChange={(event) => setSelectedBidValue(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={!bidWindowOpen || busy}><>{quickBidOptions.map((option) => <option key={option.value} value={option.value}>{formatCents(option.value, currency)}</option>)}</><option value="custom">Outro valor personalizado</option></select></label></div>{effectiveSelectedBidValue === "custom" ? <label className="grid gap-1.5 text-xs font-medium text-muted-foreground" htmlFor={`custom-bid-${lot.id}`}>Valor personalizado<Input id={`custom-bid-${lot.id}`} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="1.250,00" disabled={!bidWindowOpen || busy} /></label> : <Button type="button" className="h-10 w-full" disabled={!bidWindowOpen || busy || selectedFixedBidIsBlocked} onClick={() => void submitAmount(effectiveSelectedBidValue, false, "quick")}>{pendingControl === "quick" && pendingAmount === effectiveSelectedBidValue ? <Loader2 className="size-4 animate-spin" /> : <><Send className="size-4" />Dar lance</>}</Button>}{effectiveSelectedBidValue === "custom" ? <Button type="button" variant="secondary" className="w-full active:scale-[0.96] transition-transform" disabled={!bidWindowOpen || busy} onClick={() => void submit(false)}>{pendingControl === "custom" ? <><Loader2 className="size-4 animate-spin" />Enviando…</> : <><Send className="size-4" />Dar lance</>}</Button> : null}{lot.fixedPriceCents ? <div className="border-t pt-3"><p className="text-xs text-muted-foreground">Compra imediata disponível por {formatCents(lot.fixedPriceCents, currency)}.</p><Button type="button" variant="ghost" size="sm" className="mt-1 px-0 text-secondary" disabled={busy || lot.status !== "OPEN"} onClick={() => void reserve()}>{pendingControl === "custom" ? <><Loader2 className="size-4 animate-spin" />Processando…</> : "Reservar unidade"}</Button></div> : null}</div>{!canBid ? <p className="mt-4 inline-flex items-center gap-2 text-sm text-amber-700"><CircleAlert className="size-4" />{bidUnavailableMessage}</p> : null}</article>;
}
