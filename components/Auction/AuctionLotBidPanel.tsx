"use client";

import { detectAcquisitionSource } from "@/lib/auctions/acquisition-sources";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	Bell,
	ChevronDown,
	CircleAlert,
	Clock3,
	Coins,
	Loader2,
	RefreshCw,
} from "lucide-react";
import { AuctionLoginDialog } from "@/components/Auction/AuctionLoginDialog";
import { AuctionRegistrationDialog } from "@/components/Auction/AuctionRegistrationDialog";
import { AuctionWhatsAppConsentControl } from "@/components/Auction/AuctionWhatsAppConsentControl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	getAuctionRegistrationAction,
	getEngineSnapshotAction,
	getOwnProxyBidAction,
	listAuctionLotBidsAction,
	issueRealtimeTicketAction,
	placeBidAction,
	registerAuctionAction,
	buyShoppingLotAction,
	setProxyBidAction,
} from "@/hooks/actions/auctionEngineActions";
import { ShoppingPurchaseDialog } from "@/components/Auction/ShoppingPurchaseDialog";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type {
	EngineAuctionSnapshot,
	EngineBidHistoryItem,
	EngineBidResult,
} from "@/lib/auctions/engine-types";
import {
	getEngineQuickBidOptions,
} from "@/lib/auctions/engine-formatters";
import { auctionAcceptsBids, isPreBidClosed, isShoppingPurchaseOpen as isShoppingPurchaseWindowOpen } from "@/lib/auctions/bid-window";
import { isAuctionAuthenticationError } from "@/lib/auctions/auth";
import { getBidderDisplayName, getWinnerDisplayName, mergeKnownBidderNames } from "@/lib/auctions/bidder-display";

function formatCents(value: string | null, currency = "BRL") {
	if (value === null) return "—";
	const negative = value.startsWith("-");
	const digits = negative ? value.slice(1) : value;
	const padded = digits.padStart(3, "0");
	const amount = `${padded.slice(0, -2)}.${padded.slice(-2)}`;
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency,
	}).format(Number(amount) * (negative ? -1 : 1));
}

function formatCountdown(totalSeconds: number) {
	const days = Math.floor(totalSeconds / 86_400);
	const hours = Math.floor((totalSeconds % 86_400) / 3_600);
	const minutes = Math.floor((totalSeconds % 3_600) / 60);
	const seconds = totalSeconds % 60;

	return `${days > 0 ? `${days} dias ` : ""}${hours}h${minutes}m${seconds}s`;
}

function formatBidTime(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? ""
		: `${date.toLocaleDateString("pt-BR")} às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function bidOriginLabel(origin: EngineBidHistoryItem["origin"]) {
	if (origin === "PROXY") return "Automático";
	if (origin === "FLOOR") return "Presencial";
	if (origin === "PHONE") return "Telefone";
	return "Online";
}

function parseInputToCents(value: string) {
	const normalized = value.trim().replace(/\./g, "").replace(",", ".");
	if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
	const [whole, fraction = ""] = normalized.split(".");
	return `${BigInt(whole)}${fraction.padEnd(2, "0")}`.replace(
		/^0+(?=\d)/,
		"",
	);
}

function updateLotFromBid(
	snapshot: EngineAuctionSnapshot,
	result: EngineBidResult,
): EngineAuctionSnapshot {
	return {
		...snapshot,
		lots: snapshot.lots.map((lot) =>
			lot.externalId !== result.lotId && lot.id !== result.lotId
				? lot
				: {
						...lot,
						currentPriceCents: result.currentPriceCents,
						currentIncrementCents: result.currentIncrementCents ?? lot.currentIncrementCents,
						nextBidCents: result.nextBidCents,
						currentBidderAlias: result.currentBidderAlias,
						currentBidderName: result.currentBidderName === null ? null : result.currentBidderName ?? lot.currentBidderName,
						status: result.lotStatus ?? lot.status,
						winnerName: result.winnerName ?? lot.winnerName,
						winningAmountCents: result.winningAmountCents ?? lot.winningAmountCents,
						closedAt: result.closedAt ?? lot.closedAt,
						endsAt: result.endsAt,
						lotSequence: result.lotSequence,
						version: result.version,
					},
		),
	};
}

function formatBidMessage(result: EngineBidResult, currency: string) {
	if (result.sold) return `Compra confirmada por ${formatCents(result.winningAmountCents ?? result.currentPriceCents, currency)}. Este lote foi vendido para você.`;
	if (result.status === "PENDING_ELIGIBILITY") return "Lance recebido para validação. Ele ainda não foi aceito nem entrou no placar oficial.";
	if (result.status === "PENDING_APPROVAL") return "Não foi possível confirmar a aceitação do lance. Consulte o histórico antes de tentar novamente.";
	if (result.status === "REJECTED") return "O lance não foi aceito. Confira as condições do lote antes de tentar novamente.";
	if (result.proxyMaxBidCents) {
		return `Teto automático salvo até ${formatCents(result.proxyMaxBidCents, currency)}. O placar mostra somente o lance efetivo.`;
	}
	return "Lance aceito e atualizado no placar oficial.";
}

type PanelFeedback = { type: "success" | "error"; message: string };
type RegistrationState = "checking" | "available" | "pending" | "approved" | "suspended";

function registrationState(status?: string, globallyEnabled?: boolean): RegistrationState {
	if (globallyEnabled === false && status === "APPROVED") return "suspended";
	if (globallyEnabled === true && status !== "APPROVED") return "available";
	if (status === "APPROVED") return "approved";
	if (status === "PENDING") return "pending";
	if (status === "SUSPENDED" || status === "REVOKED") return "suspended";
	return "available";
}

export function AuctionLotBidPanel({
	initialSnapshot,
	lotExternalId,
	catalogClosesAt,
	catalogFixedPriceCents,
}: {
	initialSnapshot: EngineAuctionSnapshot;
	lotExternalId: string;
	catalogClosesAt?: string | null;
	catalogFixedPriceCents?: number | string | null;
}) {
	const [snapshot, setSnapshot] = useState(initialSnapshot);
	const snapshotRef = useRef(initialSnapshot);
	const [amount, setAmount] = useState("");
	const initialLot = initialSnapshot.lots.find(
		(item) => item.externalId === lotExternalId || item.id === lotExternalId,
	);
	const [selectedBidValue, setSelectedBidValue] = useState(initialLot?.nextBidCents ?? "custom");
	const [busy, setBusy] = useState(false);
	const [pending, setPending] = useState<"quick" | "custom" | "proxy" | "reserve" | null>(null);
	const [registration, setRegistration] = useState<RegistrationState>("checking");
	const [proxyMaxBidCents, setProxyMaxBidCents] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<PanelFeedback | null>(null);
	const [lastSync, setLastSync] = useState<Date | null>(null);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const [validationDialogOpen, setValidationDialogOpen] = useState(false);
	const [bidHistoryOpen, setBidHistoryOpen] = useState(false);
	const [bidHistoryLotId, setBidHistoryLotId] = useState<string | null>(null);
	const [bidHistoryItems, setBidHistoryItems] = useState<EngineBidHistoryItem[]>([]);
	const [bidHistoryLoading, setBidHistoryLoading] = useState(false);
	const [bidHistoryLoaded, setBidHistoryLoaded] = useState(false);
	const [bidHistoryError, setBidHistoryError] = useState<string | null>(null);
	const bidHistoryRequestId = useRef(0);
	const [loginDialogOpen, setLoginDialogOpen] = useState(false);
	const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
	const [registrationDialogOpen, setRegistrationDialogOpen] = useState(false);
	// The shared snapshot instant keeps the first browser render identical to the server.
	const [nowMs, setNowMs] = useState(() => Date.parse(initialSnapshot.serverTime) || 0);
	const isShopping = snapshot.auction.mode === "SHOPPING";

	const applySnapshot = useCallback((next: EngineAuctionSnapshot) => {
		const merged = mergeKnownBidderNames(snapshotRef.current, next);
		snapshotRef.current = merged;
		setSnapshot(merged);
		setLastSync(new Date());
	}, []);

	const lot = snapshot.lots.find(
		(item) => item.externalId === lotExternalId || item.id === lotExternalId,
	);
	const historyLotId = lot?.externalId;
	const bidHistoryMatchesLot = bidHistoryLotId === historyLotId;
	const loadBidHistory = async (auctionId: string, lotId: string) => {
		const requestId = ++bidHistoryRequestId.current;
		setBidHistoryLotId(lotId);
		setBidHistoryItems([]);
		setBidHistoryLoading(true);
		setBidHistoryLoaded(false);
		setBidHistoryError(null);
		try {
			const result = await listAuctionLotBidsAction(auctionId, lotId, { limit: "10" });
			if (requestId !== bidHistoryRequestId.current) return;
			if (!result.success || !result.data) {
				setBidHistoryError(result.error || "Não foi possível carregar o histórico. Tente novamente.");
				return;
			}
			const items = result.data.items
				.filter((bid) => bid.status === "ACTIVE" && /^\d+$/.test(bid.amountCents) && /^\d+$/.test(bid.lotSequence))
				.sort((left, right) => {
					const leftAmount = BigInt(left.amountCents);
					const rightAmount = BigInt(right.amountCents);
					if (leftAmount !== rightAmount) return leftAmount > rightAmount ? -1 : 1;
					const leftSequence = BigInt(left.lotSequence);
					const rightSequence = BigInt(right.lotSequence);
					return leftSequence === rightSequence ? 0 : leftSequence > rightSequence ? -1 : 1;
				})
				.slice(0, 10);
			setBidHistoryItems(items);
			setBidHistoryLoaded(true);
		} catch {
			if (requestId === bidHistoryRequestId.current) setBidHistoryError("Não foi possível consultar o histórico de lances agora. Tente novamente.");
		} finally {
			if (requestId === bidHistoryRequestId.current) setBidHistoryLoading(false);
		}
	};
	const fixedPriceCents = lot?.fixedPriceCents ?? (catalogFixedPriceCents == null ? null : String(catalogFixedPriceCents));
	const quickBidOptions = lot ? getEngineQuickBidOptions(lot) : [];
	const quickBids = quickBidOptions.map((option) => option.value);
	const effectiveSelectedBidValue = selectedBidValue !== "custom" && !quickBids.includes(selectedBidValue) ? quickBids[0] ?? "custom" : selectedBidValue;

	useEffect(() => () => { bidHistoryRequestId.current += 1; }, [snapshot.auction.externalId, lot?.externalId]);

	useEffect(() => {
		let active = true;
		void getAuctionRegistrationAction(snapshot.auction.externalId).then((result) => {
			if (!active) return;
			setRegistration(result.success ? registrationState(result.data?.status, result.data?.globallyEnabled) : "available");
		});
		return () => {
			active = false;
		};
	}, [snapshot.auction.externalId]);

	useEffect(() => {
		if (registration !== "pending") return;
		let active = true;
		const check = async () => {
			const result = await getAuctionRegistrationAction(snapshot.auction.externalId);
			if (!active || !result.success) return;
			const nextState = registrationState(result.data?.status, result.data?.globallyEnabled);
			setRegistration(nextState);
			if (nextState === "approved") setFeedback({ type: "success", message: isShopping ? "Seu cadastro foi aprovado. Você já pode comprar este lote." : "Seu cadastro foi aprovado. Você já pode enviar lances." });
		};
		const timer = window.setInterval(() => void check(), 5000);
		return () => { active = false; window.clearInterval(timer); };
	}, [isShopping, registration, snapshot.auction.externalId]);

	useEffect(() => {
		if (registration !== "approved" || !lot || isShopping) return;
		let active = true;
		void getOwnProxyBidAction(snapshot.auction.externalId, lot.externalId).then((result) => {
			if (active && result.success) setProxyMaxBidCents(result.data?.maxBidCents ?? null);
		});
		return () => {
			active = false;
		};
	}, [isShopping, lot, registration, snapshot.auction.externalId]);

	useEffect(() => {
		let stopped = false;
		let socket: WebSocket | null = null;
		let retryTimer: ReturnType<typeof setTimeout> | undefined;
		let retryCount = 0;
		const poll = async () => {
			const result = await getEngineSnapshotAction(snapshot.auction.externalId);
			if (!stopped && result.success && result.data) applySnapshot(result.data);
		};
		const connect = async () => {
			if (stopped) return;
			const ticket = await issueRealtimeTicketAction(snapshot.auction.externalId);
			if (!ticket.success || !ticket.data) {
				if (isAuctionAuthenticationError(ticket.errorCode)) setLoginDialogOpen(true);
				return;
			}
			const wsBase = process.env.NEXT_PUBLIC_AUCTION_ENGINE_WS_URL || "ws://localhost:4100/ws";
			socket = new WebSocket(`${wsBase}?ticket=${encodeURIComponent(ticket.data.ticket)}&auctionId=${encodeURIComponent(ticket.data.auctionId)}`);
			socket.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data as string) as { snapshot?: EngineAuctionSnapshot };
					if (data.snapshot) applySnapshot(data.snapshot);
				} catch {
					// Polling remains the source of recovery when an event is malformed.
				}
			};
			socket.onclose = () => {
				if (!stopped) {
					retryTimer = setTimeout(connect, Math.min(10000, 1200 * 2 ** retryCount));
					retryCount += 1;
				}
			};
			socket.onopen = () => {
				retryCount = 0;
			};
		};
		void poll();
		void connect();
		const pollTimer = window.setInterval(() => void poll(), 2500);
		return () => {
			stopped = true;
			window.clearInterval(pollTimer);
			if (retryTimer) clearTimeout(retryTimer);
			socket?.close();
		};
	}, [applySnapshot, snapshot.auction.externalId]);

	useEffect(() => {
		if (
			!lot?.endsAt &&
			!catalogClosesAt &&
			!snapshot.auction.endsAt &&
			!snapshot.auction.preBidStartsAt &&
			!snapshot.auction.preBidEndsAt
		)
			return;
		const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, [
		catalogClosesAt,
		lot?.endsAt,
		snapshot.auction.endsAt,
		snapshot.auction.preBidStartsAt,
		snapshot.auction.preBidEndsAt,
	]);

	if (!lot) {
		return (
			<section className="rounded-xl border border-dashed bg-card p-5 text-sm text-muted-foreground">
				O estado deste lote ainda não foi publicado no motor de leilões.
			</section>
		);
	}

	const isLotClosed = ["SOLD", "UNSOLD", "CLOSED", "CANCELLED"].includes(lot.status);
	const bidWindowOpen = auctionAcceptsBids(snapshot.auction, nowMs) && lot.status === "OPEN";
	const shoppingPurchaseOpen = isShopping && registration === "approved" && isShoppingPurchaseWindowOpen(snapshot.auction, nowMs) && lot.status === "OPEN" && fixedPriceCents !== null;
	const isOpeningPause = !isShopping && snapshot.auction.status === "SCHEDULED" && isPreBidClosed(snapshot.auction, nowMs) && Boolean(snapshot.auction.startsAt) && nowMs < new Date(snapshot.auction.startsAt as string).getTime();
	const bidderName = lot.status === "SOLD" ? getWinnerDisplayName(lot) : getBidderDisplayName(lot);
	const leaderHistoryBidId = lot.currentBidderAlias
		? bidHistoryItems.reduce<EngineBidHistoryItem | null>((leaderBid, bid) => {
			if (bid.bidderAlias.trim() !== lot.currentBidderAlias?.trim()) return leaderBid;
			return !leaderBid || BigInt(bid.lotSequence) > BigInt(leaderBid.lotSequence) ? bid : leaderBid;
		}, null)?.id ?? null
		: null;
	const requireRegistration = async () => {
		if (registration === "pending") {
			setFeedback({ type: "success", message: "Sua solicitação está aguardando a validação da equipe PR Leilões." });
			return;
		}
		if (registration === "suspended") {
			setFeedback({ type: "error", message: "Sua participação não está habilitada para este leilão. Entre em contato com a equipe PR Leilões." });
			return;
		}
		setRegistrationDialogOpen(true);
	};

	const confirmRegistration = async (whatsappOptIn: boolean) => {
		setRegistration("checking");
		const result = await registerAuctionAction(snapshot.auction.externalId, snapshot.auction.regulationVersion, detectAcquisitionSource(), whatsappOptIn);
		if (result.success && result.data) {
			const nextState = registrationState(result.data.status);
			setRegistration(nextState);
			setFeedback({ type: "success", message: nextState === "approved" ? "Cadastro confirmado. Você já pode enviar lances neste lote." : "Solicitação enviada. A equipe PR Leilões fará a validação do seu cadastro." });
			setRegistrationDialogOpen(false);
		} else {
			setRegistration("available");
			if (isAuctionAuthenticationError(result.errorCode)) {
				setFeedback(null);
				setLoginDialogOpen(true);
				return;
			}
			setFeedback({ type: "error", message: result.error || "Não foi possível habilitar a participação." });
		}
	};

	const ensureRegistrationForBid = async (): Promise<boolean> => {
		if (registration === "approved" || registration === "pending") return true;
		if (registration === "suspended") {
			setFeedback({ type: "error", message: "Sua participação não está habilitada para este leilão. Entre em contato com a equipe PR Leilões." });
			return false;
		}
		setRegistrationDialogOpen(true);
		return false;
	};

	const submit = async (value: string, proxy: boolean, control: "quick" | "custom" | "proxy") => {
		if (busy) return;
		const currentLot = snapshotRef.current.lots.find(
			(item) => item.externalId === lotExternalId || item.id === lotExternalId,
		);
		if (!currentLot || currentLot.status !== "OPEN") {
			setFeedback({ type: "error", message: "Este lote já foi encerrado e não aceita novos lances." });
			return;
		}
		setBusy(true);
		setPending(control);
		try {
			if (!(await ensureRegistrationForBid())) return;
			const result = proxy
				? await setProxyBidAction(snapshot.auction.externalId, lot.externalId, value, lot.version)
				: await placeBidAction(snapshot.auction.externalId, lot.externalId, value, lot.version);
			if (result.success && result.data) {
				const bidResult = result.data;
				if (bidResult.status === "PENDING_ELIGIBILITY") {
					setFeedback(null);
					setValidationDialogOpen(true);
				} else if (bidResult.status === "ACCEPTED") {
					applySnapshot(updateLotFromBid(snapshotRef.current, bidResult));
					if (bidResult.proxyMaxBidCents) setProxyMaxBidCents(bidResult.proxyMaxBidCents);
					setFeedback({ type: "success", message: formatBidMessage(bidResult, snapshot.auction.currency) });
				} else {
					setFeedback({ type: "error", message: formatBidMessage(bidResult, snapshot.auction.currency) });
				}
			} else {
				if (result.errorCode === "REGISTRATION_REQUIRED") setRegistration("available");
				if (isAuctionAuthenticationError(result.errorCode)) {
					setFeedback(null);
					setLoginDialogOpen(true);
					return;
				}
				setFeedback({ type: "error", message: result.error || "O lance não foi aceito. Atualize o estado e tente novamente." });
			}
		} finally {
			setBusy(false);
			setPending(null);
		}
	};

	const submitCustom = async (proxy: boolean) => {
		const cents = parseInputToCents(amount);
		if (!cents) {
			setFeedback({ type: "error", message: "Informe um valor válido em reais, como 1.250,00." });
			return;
		}
		await submit(cents, proxy, proxy ? "proxy" : "custom");
	};

	const confirmPurchase = async () => {
		if (busy) return;
		if (!shoppingPurchaseOpen) return;
		setBusy(true);
		setPending("reserve");
		const result = await buyShoppingLotAction(snapshot.auction.externalId, lot.externalId);
		if (!result.success && isAuctionAuthenticationError(result.errorCode)) {
			setFeedback(null);
			setLoginDialogOpen(true);
		} else if (result.success && result.data) {
			applySnapshot(updateLotFromBid(snapshotRef.current, result.data));
			setPurchaseDialogOpen(false);
			setFeedback({ type: "success", message: formatBidMessage(result.data, snapshot.auction.currency) });
		} else {
			setFeedback({ type: "error", message: result.error || "Não foi possível concluir a compra deste lote." });
		}
		setBusy(false);
		setPending(null);
	};

	const unavailableMessage = registration !== "approved"
		? registration === "pending"
			? "Sua solicitação está aguardando validação manual. Você já pode enviar lances; eles ficarão ocultos e fora da contagem oficial até a habilitação."
			: registration === "suspended"
				? "Sua participação não está habilitada neste leilão."
				: "Solicite a habilitação do seu cadastro para enviar um lance."
		: !bidWindowOpen
			? snapshot.auction.status === "SCHEDULED"
				? snapshot.auction.mode === "LIVE"
					? "O pré-lance do leilão ao vivo ainda não está aberto."
					: "O pré-lance ainda não começou ou não está configurado."
				: "Este lote não está recebendo lances agora."
			: null;

	const registrationBlocksCommands = registration === "checking" || registration === "suspended";
	const selectedFixedBidIsBlocked = effectiveSelectedBidValue !== "custom" && proxyMaxBidCents !== null && BigInt(effectiveSelectedBidValue) <= BigInt(proxyMaxBidCents);
	const countdownAt = isShopping ? snapshot.auction.endsAt : lot.endsAt ?? catalogClosesAt;
	const remainingSeconds = countdownAt && Number.isFinite(new Date(countdownAt).getTime())
		? Math.max(0, Math.floor((new Date(countdownAt).getTime() - nowMs) / 1000))
		: null;
	const closingText = isOpeningPause
		? "Aguardando abertura da etapa principal"
		: isShopping
		? remainingSeconds !== null
			? remainingSeconds > 0
				? `Compra disponível por mais ${formatCountdown(remainingSeconds)}`
				: "Compra encerrada"
			: "Encerramento das compras ainda não definido"
		: remainingSeconds !== null
			? remainingSeconds > 0
				? `Lote fecha em ${formatCountdown(remainingSeconds)}`
				: "Aguardando confirmação do encerramento"
			: snapshot.auction.mode === "LIVE"
				? "Encerramento definido pelo leiloeiro"
				: "Encerramento ainda não definido";
	const handlePrimaryBid = () => {
		if (effectiveSelectedBidValue === "custom") {
			void submitCustom(false);
			return;
		}
		void submit(effectiveSelectedBidValue, false, "quick");
	};
	const toggleBidHistory = () => {
		const nextOpen = !bidHistoryOpen;
		setBidHistoryOpen(nextOpen);
		if (nextOpen && historyLotId) void loadBidHistory(snapshot.auction.externalId, historyLotId);
	};

	return (
		<>
		<section className="space-y-4" aria-label={`${isShopping ? "Compra" : "Lances"} do lote ${lot.lotNumber}`}>
			<div className="border-l-[3px] border-primary pl-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{isShopping ? "Preço do lote" : lot.status === "SOLD" ? "Valor de arremate" : "Último lance"}</p>
						<p className="mt-1 text-[clamp(1.25rem,6vw,2rem)] font-bold leading-none tabular-nums text-primary">{formatCents(isShopping ? fixedPriceCents : lot.currentPriceCents, snapshot.auction.currency)}</p>
					</div>
					{isShopping ? <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground"><Coins className="size-3.5" /> Compra imediata</span> : <button type="button" id={`bid-history-trigger-${lot.externalId}`} aria-expanded={bidHistoryOpen} aria-controls={`bid-history-${lot.externalId}`} onClick={toggleBidHistory} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
						<Clock3 className="size-3.5" aria-hidden="true" /> Últimos 10 lances
						<ChevronDown className={`size-3.5 transition-transform ${bidHistoryOpen ? "rotate-180" : ""}`} aria-hidden="true" />
					</button>}
				</div>
				<p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">
					{isShopping ? lot.status === "SOLD" && bidderName ? <>Comprador: <span className="text-foreground">{bidderName}</span></> : "Nenhuma compra confirmada" : bidderName ? <>Lance feito por <span className="text-foreground">{bidderName}</span></> : "Nenhum lance confirmado"}
				</p>
				{!isShopping ? <div id={`bid-history-${lot.externalId}`} role="region" aria-labelledby={`bid-history-trigger-${lot.externalId}`} hidden={!bidHistoryOpen} className="mt-4 space-y-3 border-t pt-3">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h3 className="text-sm font-semibold text-foreground">Lances efetivos</h3>
						<div className="flex flex-wrap items-center gap-2">
							{bidderName ? <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">Líder do lote</span><span>{bidderName}</span></p> : null}
							<Button type="button" variant="ghost" size="sm" className="min-h-9 gap-1.5 px-2 text-xs" disabled={bidHistoryLoading && bidHistoryMatchesLot} onClick={() => { if (historyLotId) void loadBidHistory(snapshot.auction.externalId, historyLotId); }}>
								<RefreshCw className="size-3.5" aria-hidden="true" /> Atualizar
							</Button>
						</div>
					</div>
					<p role="status" aria-live="polite" className="text-xs text-muted-foreground">
						{!bidHistoryMatchesLot ? "Atualize para consultar os lances deste lote." : bidHistoryLoading ? "Buscando os lances mais recentes…" : bidHistoryLoaded ? `${bidHistoryItems.length} lances efetivos carregados.` : ""}
					</p>
					{!bidHistoryMatchesLot ? null : bidHistoryLoading ? <div aria-hidden="true" className="space-y-3">
						{[0, 1, 2].map((item) => <div key={item} className="flex items-center justify-between gap-4 border-t py-3">
							<div className="w-2/3 space-y-2"><div className="h-3 w-2/3 rounded bg-muted" /><div className="h-2.5 w-1/2 rounded bg-muted" /></div>
							<div className="h-4 w-20 rounded bg-muted" />
						</div>)}
					</div> : bidHistoryError ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
						<p>{bidHistoryError}</p>
						<Button type="button" size="sm" variant="outline" onClick={() => { if (historyLotId) void loadBidHistory(snapshot.auction.externalId, historyLotId); }}>Tentar novamente</Button>
					</div> : bidHistoryLoaded && bidHistoryItems.length === 0 ? <p className="rounded-md bg-muted px-3 py-4 text-sm text-muted-foreground">Ainda não há lances efetivos para este lote.</p> : bidHistoryLoaded ? <ol className="divide-y" aria-label="Lances efetivos ordenados pelo maior valor">
						{bidHistoryItems.map((bid) => {
							const isLeader = bid.id === leaderHistoryBidId;
							const acceptedAt = formatBidTime(bid.acceptedAt);
							return <li key={bid.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold text-foreground">{bid.bidderAlias}</p>
									<p className="mt-1 text-xs text-muted-foreground">Efetivo · {bidOriginLabel(bid.origin)}{acceptedAt ? ` · ${acceptedAt}` : ""}</p>
								</div>
								<div className="flex shrink-0 items-center gap-2 text-right">
									<p className="text-sm font-bold tabular-nums text-foreground">{formatCents(bid.amountCents, snapshot.auction.currency)}</p>
									{isLeader ? <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">Líder do lote</span> : null}
								</div>
							</li>;
						})}
					</ol> : null}
				</div> : null}
			</div>

			{!isLotClosed ? <div className="rounded-lg bg-muted px-4 py-3 text-center text-sm font-semibold text-muted-foreground">
				<Clock3 className="mr-1 inline size-4" />{closingText}
			</div> : null}

			{!isShopping && !isOpeningPause && !isLotClosed ? <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground">
				<Coins className="size-4 shrink-0" />
				<span>Próximo lance: <strong className="text-foreground">{formatCents(lot.nextBidCents, snapshot.auction.currency)}</strong></span>
			</div> : null}

			{isLotClosed ? <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
				<p className="font-bold">{lot.status === "SOLD" ? "Lote vendido" : lot.status === "CANCELLED" ? "Lote cancelado" : "Lote encerrado"}</p>
				<p className="mt-1">{isShopping ? "Não é possível comprar este lote." : "Não é possível enviar novos lances neste lote."}</p>
			</div> : isOpeningPause ? <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
				<p className="font-bold">Aguardando abertura</p>
				<p className="mt-1">Os pré-lances foram encerrados. Os lances serão liberados no início da etapa principal.</p>
			</div> : isShopping ? <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
				<p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Compra imediata</p>
				<p className="text-sm text-muted-foreground">O primeiro usuário habilitado que confirmar compra fica com este lote.</p>
				<Button type="button" className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={!shoppingPurchaseOpen || busy} onClick={() => setPurchaseDialogOpen(true)}>
					{pending === "reserve" ? <Loader2 className="size-4 animate-spin" /> : `Comprar agora por ${formatCents(fixedPriceCents, snapshot.auction.currency)}`}
				</Button>
				{registration === "pending" ? <p className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700"><Clock3 className="size-4 shrink-0" />Aguardando validação manual. Você poderá comprar assim que for habilitado.</p> : registration === "suspended" ? <p className="inline-flex items-center gap-2 text-xs font-semibold text-red-700"><CircleAlert className="size-4 shrink-0" />Sua participação não está habilitada para este leilão. Entre em contato com a equipe PR Leilões.</p> : registration === "approved" && shoppingPurchaseOpen ? <p className="text-xs font-semibold text-emerald-700">Você está habilitado. A compra será confirmada para o primeiro usuário aprovado.</p> : registration === "approved" ? <p className="inline-flex items-center gap-2 text-xs text-amber-700"><CircleAlert className="size-4 shrink-0" />Este lote não está disponível para compra agora.</p> : <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-muted-foreground">Solicite a habilitação do seu cadastro para ficar apto a confirmar a compra.</p><Button type="button" size="sm" variant="outline" onClick={() => void requireRegistration()} disabled={registration === "checking" || busy}>{registration === "checking" ? "Verificando…" : "Solicitar habilitação"}</Button></div>}
			</div> : <>
			<div className="flex gap-2">
				<Button type="button" className="h-11 flex-1 bg-primary text-primary-foreground hover:bg-primary/90" disabled={!bidWindowOpen || busy || registrationBlocksCommands || selectedFixedBidIsBlocked} onClick={handlePrimaryBid}>
					{pending === "quick" || pending === "custom" ? <Loader2 className="size-4 animate-spin" /> : "Dar lance"}
				</Button>
				<Button type="button" variant="outline" size="icon" className="size-11 shrink-0 border-primary text-primary hover:bg-primary/5" aria-label="Configurar notificações deste leilão" aria-haspopup="dialog" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(true)}>
					<Bell className="size-4" />
				</Button>
			</div>

			<button type="button" aria-expanded={showAdvanced} aria-controls={showAdvanced ? `advanced-bid-options-${lot.externalId}` : undefined} onClick={() => setShowAdvanced((value) => !value)} className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
				{showAdvanced ? "Ocultar opções de lance" : "Mais opções de lance"}
				<ChevronDown className={`size-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} aria-hidden="true" />
			</button>
			{showAdvanced ? <div id={`advanced-bid-options-${lot.externalId}`} className="space-y-3 border-t pt-4">
				{registration !== "approved" ? registration === "pending" ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700"><Clock3 className="size-4" />Aguardando validação</span> : registration === "suspended" ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700"><CircleAlert className="size-4" />Não habilitado</span> : <Button type="button" size="sm" variant="outline" onClick={() => void requireRegistration()} disabled={registration === "checking"}>{registration === "checking" ? "Verificando…" : "Solicitar habilitação"}</Button> : null}
				<label className="grid gap-1.5 text-sm font-bold text-foreground" htmlFor={`bid-value-${lot.externalId}`}>
					Valor do próximo lance
					<select id={`bid-value-${lot.externalId}`} value={effectiveSelectedBidValue} onChange={(event) => setSelectedBidValue(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={!bidWindowOpen || busy || registrationBlocksCommands}>
						{quickBidOptions.map((option) => <option key={option.value} value={option.value}>{formatCents(option.value, snapshot.auction.currency)}</option>)}
						<option value="custom">Outro valor personalizado</option>
					</select>
				</label>
				{effectiveSelectedBidValue === "custom" ? <label className="grid gap-1.5 text-xs font-medium text-muted-foreground" htmlFor={`custom-bid-${lot.externalId}`}>
					Valor personalizado
					<Input id={`custom-bid-${lot.externalId}`} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="1.250,00" inputMode="decimal" disabled={!bidWindowOpen || busy || registrationBlocksCommands} />
				</label> : null}
				{!isShopping && lot.fixedPriceCents ? <div className="border-t pt-3"><p className="text-xs text-muted-foreground">Compra imediata por {formatCents(lot.fixedPriceCents, snapshot.auction.currency)}.</p></div> : null}
				{proxyMaxBidCents ? <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs leading-5 text-primary">Teto automático ativo até <strong>{formatCents(proxyMaxBidCents, snapshot.auction.currency)}</strong>.</p> : null}
				{unavailableMessage ? <p className="inline-flex items-center gap-2 text-xs text-amber-700"><CircleAlert className="size-4 shrink-0" />{unavailableMessage}</p> : null}
				<p className="flex items-center justify-between gap-2 border-t pt-3 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />Atualização automática</span><button type="button" className="inline-flex items-center gap-1 font-semibold hover:text-foreground" onClick={() => void getEngineSnapshotAction(snapshot.auction.externalId).then((result) => { if (result.success && result.data) applySnapshot(result.data); })}><RefreshCw className="size-3" />Sincronizar</button>{lastSync ? <span className="sr-only">Última sincronização às {lastSync.toLocaleTimeString("pt-BR")}</span> : null}</p>
			</div> : null}
			</>}

			{feedback ? <p role={feedback.type === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-xs leading-5 ${feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{feedback.message}</p> : null}
			<Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Notificações deste leilão</DialogTitle>
						<DialogDescription>
							Receba pelo WhatsApp avisos de lances validados, superações e arremates. Você pode revogar a autorização quando quiser.
						</DialogDescription>
					</DialogHeader>
					{registration === "approved" ? <AuctionWhatsAppConsentControl auctionId={snapshot.auction.externalId} /> : (
						<div className="space-y-3 rounded-xl border bg-muted/40 p-4">
							<p role={registration === "suspended" ? "alert" : "status"} className="text-sm leading-6 text-muted-foreground">
								{registration === "checking"
									? "Verificando sua participação neste leilão…"
									: registration === "pending"
										? "Sua participação está aguardando validação. Depois da habilitação, você poderá gerenciar os avisos por WhatsApp aqui."
										: registration === "suspended"
											? "Sua participação não está habilitada neste leilão. Fale com a equipe PR Leilões para regularizar o acesso."
												: "Solicite participação para escolher se deseja receber avisos deste leilão pelo WhatsApp."}
							</p>
							{registration === "available" ? <Button type="button" onClick={() => { setNotificationsOpen(false); void requireRegistration(); }}>
								Solicitar participação
							</Button> : null}
						</div>
					)}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setNotificationsOpen(false)}>Fechar</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Clock3 className="size-5 text-amber-600" aria-hidden="true" />
							Lance recebido, aguardando validação
						</DialogTitle>
						<DialogDescription>
							Sua participação ainda não está habilitada. A equipe PR Leilões vai verificar seu cadastro e validar o lance enviado.
						</DialogDescription>
					</DialogHeader>
					<div role="status" className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
						<p className="font-bold">Este lance ainda não foi aceito nem entrou no placar oficial.</p>
						<p>Ele permanece pendente enquanto a equipe conclui a análise. Aguarde antes de enviar outro lance para evitar duplicidade.</p>
					</div>
					<DialogFooter>
						<Button type="button" onClick={() => setValidationDialogOpen(false)}>Entendi</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
		<ShoppingPurchaseDialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen} lotTitle={lot.title} priceLabel={formatCents(fixedPriceCents, snapshot.auction.currency)} isSubmitting={pending === "reserve"} onConfirm={() => void confirmPurchase()} />
		<AuctionLoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} shopping={isShopping} />
		<AuctionRegistrationDialog auctionId={snapshot.auction.externalId} open={registrationDialogOpen} onOpenChange={setRegistrationDialogOpen} onConfirm={confirmRegistration} />
		</>
	);
}
