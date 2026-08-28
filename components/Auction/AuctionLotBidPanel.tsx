"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Bell,
	CircleAlert,
	Clock3,
	Coins,
	Loader2,
	RefreshCw,
	Send,
} from "lucide-react";
import { AuctionLoginDialog } from "@/components/Auction/AuctionLoginDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	getAuctionRegistrationAction,
	getEngineSnapshotAction,
	getOwnProxyBidAction,
	issueRealtimeTicketAction,
	placeBidAction,
	registerAuctionAction,
	reserveShoppingLotAction,
	setProxyBidAction,
} from "@/hooks/actions/auctionEngineActions";
import type {
	EngineAuctionSnapshot,
	EngineBidResult,
} from "@/lib/auctions/engine-types";
import {
	getEngineQuickBidOptions,
} from "@/lib/auctions/engine-formatters";
import { auctionAcceptsBids } from "@/lib/auctions/bid-window";
import { isAuctionAuthenticationError } from "@/lib/auctions/auth";
import { getBidderDisplayName, mergeKnownBidderNames } from "@/lib/auctions/bidder-display";

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
						endsAt: result.endsAt,
						lotSequence: result.lotSequence,
						version: result.version,
					},
		),
	};
}

function formatBidMessage(result: EngineBidResult, currency: string) {
	if (result.status === "PENDING_ELIGIBILITY") return "Lance recebido. Ele ficará oculto e fora da contagem oficial até sua participação ser habilitada.";
	if (result.status === "PENDING_APPROVAL") return "Este retorno pertence ao fluxo legado de aprovação. Atualize a página e envie o lance novamente.";
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
	closingLabel,
}: {
	initialSnapshot: EngineAuctionSnapshot;
	lotExternalId: string;
	closingLabel?: string | null;
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
	const [loginDialogOpen, setLoginDialogOpen] = useState(false);
	const [nowMs, setNowMs] = useState(() => Date.now());

	const applySnapshot = useCallback((next: EngineAuctionSnapshot) => {
		const merged = mergeKnownBidderNames(snapshotRef.current, next);
		snapshotRef.current = merged;
		setSnapshot(merged);
		setLastSync(new Date());
	}, []);

	const lot = snapshot.lots.find(
		(item) => item.externalId === lotExternalId || item.id === lotExternalId,
	);
	const isLotClosed = Boolean(lot && ["SOLD", "UNSOLD", "CLOSED", "CANCELLED"].includes(lot.status));
	const quickBidOptions = useMemo(() => {
		if (!lot) return [];
		return getEngineQuickBidOptions(lot);
	}, [lot]);
	const quickBids = useMemo(() => quickBidOptions.map((option) => option.value), [quickBidOptions]);
	const effectiveSelectedBidValue = selectedBidValue !== "custom" && !quickBids.includes(selectedBidValue) ? quickBids[0] ?? "custom" : selectedBidValue;

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
			if (nextState === "approved") setFeedback({ type: "success", message: "Seu cadastro foi aprovado. Você já pode enviar lances." });
		};
		const timer = window.setInterval(() => void check(), 5000);
		return () => { active = false; window.clearInterval(timer); };
	}, [registration, snapshot.auction.externalId]);

	useEffect(() => {
		if (registration !== "approved" || !lot) return;
		let active = true;
		void getOwnProxyBidAction(snapshot.auction.externalId, lot.externalId).then((result) => {
			if (active && result.success) setProxyMaxBidCents(result.data?.maxBidCents ?? null);
		});
		return () => {
			active = false;
		};
	}, [lot, registration, snapshot.auction.externalId]);

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
			!snapshot.auction.preBidStartsAt &&
			!snapshot.auction.preBidEndsAt
		)
			return;
		const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, [
		lot?.endsAt,
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

	const bidWindowOpen = auctionAcceptsBids(snapshot.auction, nowMs) && lot.status === "OPEN";
	const bidderName = getBidderDisplayName(lot);
	const requireRegistration = async () => {
		if (registration === "pending") {
			setFeedback({ type: "success", message: "Sua solicitação está aguardando a validação da equipe Princesa Rural." });
			return;
		}
		if (registration === "suspended") {
			setFeedback({ type: "error", message: "Sua participação não está habilitada para este leilão. Entre em contato com a equipe Princesa Rural." });
			return;
		}
		setRegistration("checking");
		const result = await registerAuctionAction(snapshot.auction.externalId, snapshot.auction.regulationVersion);
		if (result.success && result.data) {
			const nextState = registrationState(result.data.status);
			setRegistration(nextState);
			setFeedback({ type: "success", message: nextState === "approved" ? "Cadastro confirmado. Você já pode enviar lances neste lote." : "Solicitação enviada. A equipe Princesa Rural fará a validação do seu cadastro." });
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
			setFeedback({ type: "error", message: "Sua participação não está habilitada para este leilão. Entre em contato com a equipe Princesa Rural." });
			return false;
		}
		setRegistration("checking");
		const result = await registerAuctionAction(snapshot.auction.externalId, snapshot.auction.regulationVersion);
		if (!result.success || !result.data) {
			setRegistration("available");
			if (isAuctionAuthenticationError(result.errorCode)) {
				setFeedback(null);
				setLoginDialogOpen(true);
				return false;
			}
			setFeedback({ type: "error", message: result.error || "Não foi possível registrar sua intenção de participar." });
			return false;
		}
		const nextState = registrationState(result.data.status);
		setRegistration(nextState);
		return nextState !== "suspended";
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
				if (bidResult.status === "ACCEPTED") {
					applySnapshot(updateLotFromBid(snapshotRef.current, bidResult));
					if (bidResult.proxyMaxBidCents) setProxyMaxBidCents(bidResult.proxyMaxBidCents);
				}
				setFeedback({ type: "success", message: formatBidMessage(bidResult, snapshot.auction.currency) });
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

	const reserve = async () => {
		if (busy) return;
		if (isLotClosed) {
			setFeedback({ type: "error", message: "Este lote já foi encerrado e não aceita reservas." });
			return;
		}
		if (registration !== "approved") {
			await requireRegistration();
			return;
		}
		setBusy(true);
		setPending("reserve");
		const result = await reserveShoppingLotAction(snapshot.auction.externalId, lot.externalId);
		if (!result.success && isAuctionAuthenticationError(result.errorCode)) {
			setFeedback(null);
			setLoginDialogOpen(true);
		} else {
			setFeedback({ type: result.success ? "success" : "error", message: result.success ? "Reserva registrada para este lote." : result.error || "Não foi possível reservar este lote." });
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
	const remainingSeconds = lot.endsAt
		? Math.max(0, Math.floor((new Date(lot.endsAt).getTime() - nowMs) / 1000))
		: null;
	const closingText = remainingSeconds !== null
		? remainingSeconds > 0
			? `Lote fecha em ${formatCountdown(remainingSeconds)}`
			: "Lote encerrado"
		: closingLabel && closingLabel !== "Data não informada"
			? `Lote fecha em ${closingLabel}`
			: "Lote fecha em —";
	const handlePrimaryBid = () => {
		if (effectiveSelectedBidValue === "custom") {
			void submitCustom(false);
			return;
		}
		void submit(effectiveSelectedBidValue, false, "quick");
	};

	return (
		<>
		<section className="space-y-4" aria-label={`Lances do lote ${lot.lotNumber}`}>
			<div className="border-l-[3px] border-primary pl-4">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Último lance</p>
						<p className="mt-1 text-[2rem] font-bold leading-none tabular-nums text-primary">{formatCents(lot.currentPriceCents, snapshot.auction.currency)}</p>
					</div>
					<span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground">
						<Clock3 className="size-3.5" /> Últimos 10 lance(s)
					</span>
				</div>
				<p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">
					{bidderName ? <>Lance feito por <span className="text-foreground">{bidderName}</span></> : "Nenhum lance confirmado"}
				</p>
			</div>

			<div className="rounded-lg bg-muted px-4 py-3 text-center text-sm font-semibold text-muted-foreground">
				<Clock3 className="mr-1 inline size-4" />{closingText}
			</div>

			<div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground">
				<Coins className="size-4 shrink-0" />
				<span>Próximo lance: <strong className="text-foreground">{formatCents(lot.nextBidCents, snapshot.auction.currency)}</strong></span>
			</div>

			{isLotClosed ? <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
				<p className="font-bold">{lot.status === "SOLD" ? "Lote vendido" : lot.status === "CANCELLED" ? "Lote cancelado" : "Lote encerrado"}</p>
				<p className="mt-1">Não é possível enviar novos lances neste lote.</p>
			</div> : <>
			<div className="flex gap-2">
				<Button type="button" className="h-11 flex-1 bg-primary text-primary-foreground hover:bg-primary/90" disabled={!bidWindowOpen || busy || registrationBlocksCommands || selectedFixedBidIsBlocked} onClick={handlePrimaryBid}>
					{pending === "quick" || pending === "custom" ? <Loader2 className="size-4 animate-spin" /> : "Dar lance"}
				</Button>
				<Button type="button" variant="outline" size="icon" className="size-11 shrink-0 border-primary text-primary hover:bg-primary/5" aria-label="Abrir opções avançadas de lance" aria-expanded={showAdvanced} onClick={() => setShowAdvanced((value) => !value)}>
					<Bell className="size-4" />
				</Button>
			</div>

			{showAdvanced ? <div className="space-y-3 border-t pt-4">
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
				<div className="grid gap-2 sm:grid-cols-2">
					<Button type="button" size="sm" variant="secondary" disabled={!bidWindowOpen || busy || registrationBlocksCommands} onClick={() => effectiveSelectedBidValue === "custom" ? void submitCustom(false) : void submit(effectiveSelectedBidValue, false, "quick")}>{pending === "custom" || pending === "quick" ? <Loader2 className="size-4 animate-spin" /> : <><Send className="size-4" />Dar lance</>}</Button>
				</div>
				{lot.fixedPriceCents ? <div className="border-t pt-3"><p className="text-xs text-muted-foreground">Compra imediata por {formatCents(lot.fixedPriceCents, snapshot.auction.currency)}.</p><Button type="button" variant="ghost" size="sm" className="mt-1 px-0 text-secondary" disabled={busy || lot.status !== "OPEN"} onClick={() => void reserve()}>{pending === "reserve" ? <Loader2 className="size-4 animate-spin" /> : "Reservar unidade"}</Button></div> : null}
				{proxyMaxBidCents ? <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs leading-5 text-primary">Teto automático ativo até <strong>{formatCents(proxyMaxBidCents, snapshot.auction.currency)}</strong>.</p> : null}
				{unavailableMessage ? <p className="inline-flex items-center gap-2 text-xs text-amber-700"><CircleAlert className="size-4 shrink-0" />{unavailableMessage}</p> : null}
				<p className="flex items-center justify-between gap-2 border-t pt-3 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />Atualização automática</span><button type="button" className="inline-flex items-center gap-1 font-semibold hover:text-foreground" onClick={() => void getEngineSnapshotAction(snapshot.auction.externalId).then((result) => { if (result.success && result.data) applySnapshot(result.data); })}><RefreshCw className="size-3" />Sincronizar</button>{lastSync ? <span className="sr-only">Última sincronização às {lastSync.toLocaleTimeString("pt-BR")}</span> : null}</p>
			</div> : null}
			</>}

			{feedback ? <p role={feedback.type === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-xs leading-5 ${feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{feedback.message}</p> : null}
		</section>
		<AuctionLoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
		</>
	);
}
