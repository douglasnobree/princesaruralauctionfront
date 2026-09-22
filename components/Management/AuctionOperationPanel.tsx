"use client";

import {
  CheckCircle2,
  Gavel,
  Loader2,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Square,
  Undo2,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";
import {
  createQuickParticipantAction,
  managerAuctionCommandAction,
  managerFloorBidAction,
  managerLotCommandAction,
  managerCurrentLotAction,
  managerStreamAction,
  searchAuctionParticipantsAction,
} from "@/hooks/actions/auctionEngineActions";
import { managerRead } from "@/lib/auctions/manager-read";
import { parseManagementAmount } from "@/lib/auctions/management-input";
import { useVisiblePoll } from "@/hooks/use-visible-poll";
import { AuctionPendingEligibilityBids } from "@/components/Management/AuctionPendingEligibilityBids";
import { AuctionParticipantsPanel } from "@/components/Management/AuctionParticipantsPanel";
import { AuctionBroadcastPanel } from "@/components/Management/AuctionBroadcastPanel";
import { AuctionBidHistory } from "@/components/Management/AuctionBidHistory";
import { AuctionCommunicationPanel } from "@/components/Management/AuctionCommunicationPanel";
import type { AuctionAdminLot } from "@/types/auction-admin";
import type { AuctionCapabilities } from "@/components/Management/capabilities";
import type {
  AuctionParticipantSearchResult,
  EngineAuctionSnapshot,
  EngineLot,
} from "@/lib/auctions/engine-types";
import { acquisitionSourceOptions, type AcquisitionSource } from "@/lib/auctions/acquisition-sources";

const auctionLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  REVIEW: "Em revisão",
  SCHEDULED: "Pré-lances abertos",
  RUNNING: "Em andamento",
  PAUSED: "Pausado",
  FINISHED: "Encerrado",
  CANCELLED: "Cancelado",
  ABORTED: "Abortado",
};
const lotLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  QUEUED: "Na fila",
  OPEN: "Aberto",
  PAUSED: "Pausado",
  CLOSING: "Fechando",
  SOLD: "Vendido",
  UNSOLD: "Não vendido",
  CANCELLED: "Cancelado",
};
function auctionActionAllowed(
  status: string,
  action: "start" | "pause" | "resume" | "finish",
  mode: EngineAuctionSnapshot["auction"]["mode"],
) {
  if (action === "start") return mode === "LIVE" && status === "SCHEDULED";
  if (action === "pause") return mode === "LIVE" && status === "RUNNING";
  if (action === "resume") return mode === "LIVE" && status === "PAUSED";
  return mode === "LIVE"
    ? ["RUNNING", "PAUSED"].includes(status)
    : ["SCHEDULED", "RUNNING", "PAUSED"].includes(status);
}
function lotActionAllowed(
  status: string,
  action: "open" | "pause" | "resume" | "sell",
) {
  return action === "open"
    ? status === "QUEUED"
    : action === "pause"
      ? status === "OPEN"
      : action === "resume"
        ? status === "PAUSED"
        : ["OPEN", "PAUSED", "CLOSING"].includes(status);
}
function money(value: string | null, currency: string) {
  return value === null
    ? "Sem lance"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
        Number(value) / 100,
      );
}
function isValidStreamUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
function streamProviderLabel(provider: string) {
  return provider === "youtube"
    ? "YouTube Live"
    : provider === "hls"
      ? "HLS (.m3u8)"
      : provider === "direct"
        ? "Stream direto"
        : "Outro serviço";
}

export function AuctionOperationPanel({
  auctionId,
  initialSnapshot,
  capabilities,
  lots = [],
}: {
  auctionId: string;
  initialSnapshot: EngineAuctionSnapshot | null;
  capabilities: AuctionCapabilities;
  lots?: AuctionAdminLot[];
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [streamProvider, setStreamProvider] = useState(
    initialSnapshot?.stream?.provider || "youtube",
  );
  const [streamUrl, setStreamUrl] = useState(
    initialSnapshot?.stream?.playbackUrl || "",
  );
  const [providerStreamId, setProviderStreamId] = useState(
    initialSnapshot?.stream?.providerStreamId || "",
  );
  const [tool, setTool] = useState<"bids" | "participants" | "broadcast" | "communication">("bids");
  const [selectedLot, setSelectedLot] = useState("");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const streamDirty = useRef(false);
  const requestVersion = useRef(0);
  const streamVersionRef = useRef(initialSnapshot?.stream?.version);
  async function refresh(successMessage?: string, signal?: AbortSignal) {
    const request = ++requestVersion.current;
    try {
      const data = await managerRead<EngineAuctionSnapshot>(`auctions/${encodeURIComponent(auctionId)}/snapshot`, signal);
      if (signal?.aborted || request !== requestVersion.current) return;
      if (!streamDirty.current && streamVersionRef.current !== data.stream?.version) {
        setStreamProvider(data.stream?.provider || "youtube");
        setStreamUrl(data.stream?.playbackUrl || "");
        setProviderStreamId(data.stream?.providerStreamId || "");
      }
      streamVersionRef.current = data.stream?.version;
      setSnapshot((current) => current && current.auction.version === data.auction.version && current.stream?.version === data.stream?.version && current.lots.length === data.lots.length && current.lots.every((lot, index) => lot.id === data.lots[index]?.id && lot.version === data.lots[index]?.version) ? current : data);
      setSyncError(null);
      if (successMessage) setMessage(successMessage);
    } catch (cause) {
      if (!signal?.aborted && request === requestVersion.current) setSyncError(cause instanceof Error ? cause.message : "Não foi possível atualizar o estado.");
    } finally { if (!signal?.aborted) setRefreshing(false); }
  }
  useVisiblePoll(async (signal) => { if (!isPending && !refreshing) await refresh(undefined, signal); }, 2500);
  function run(action: () => Promise<{ success: boolean; error?: string }>, confirmation?: string) {
    if (confirmation && !window.confirm(confirmation)) return;
    startTransition(async () => {
      setError(null);
      setMessage(null);
      ++requestVersion.current;
      const result = await action();
      if (!result.success) {
        setError(result.error || "Comando não executado.");
        await refresh();
        return;
      }
      await refresh("Comando registrado.");
    });
  }
  if (!snapshot)
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <h2 className="font-semibold">Operação ainda não disponível</h2>
        <p className="mt-1 leading-6">
          {syncError || error ||
            "Publique o leilão e aguarde o motor preparar o snapshot oficial."}
        </p>
        <button type="button" disabled={refreshing} onClick={() => { setRefreshing(true); void refresh(); }} className="mt-3 min-h-11 underline">{refreshing ? "Atualizando…" : "Tentar novamente"}</button>
      </section>
    );
  const auction = snapshot.auction;
  const canOperate = capabilities.canManageStatus && !syncError;
  const canBid = capabilities.canManageBids;
  function setStream(status: "LIVE" | "ENDED") {
    const provider = streamProvider.trim().toLowerCase() || "custom";
    const playbackUrl = streamUrl.trim();
    if (
      status === "LIVE" &&
      provider !== "mock" &&
      !isValidStreamUrl(playbackUrl)
    ) {
      setError(
        "Informe uma URL HTTPS da transmissão antes de colocar o sinal ao vivo.",
      );
      return;
    }
    run(async () => {
      const result = await managerStreamAction(auctionId, {
        provider,
        status,
        ...(playbackUrl ? { playbackUrl } : {}),
        ...(providerStreamId.trim()
          ? { providerStreamId: providerStreamId.trim() }
          : {}),
        ...(provider === "mock" && !playbackUrl
          ? { playbackUrl: `https://mock-stream.invalid/${auction.externalId}` }
          : {}),
      });
      if (result.success) streamDirty.current = false;
      return result;
    });
  }
  const historyLot = snapshot.lots.find((lot) => lot.externalId === selectedLot) ?? snapshot.lots.find((lot) => lot.status === "OPEN") ?? snapshot.lots[0];
  return (
    <section className="space-y-5" aria-labelledby="operation-title" aria-busy={isPending}>
      <div className="flex flex-col gap-3 border-b border-[#e9efeb] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="operation-title" className="text-xl font-bold">
            {auction.mode === "LIVE"
              ? "Operação ao vivo"
              : auction.mode === "SHOPPING"
                ? "Operação de compra imediata"
                : "Operação de pré-lance"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Controle lotes, registre lances e acompanhe participantes nesta página.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold shadow-sm">
          <span
            className={`size-2 rounded-full ${auction.status === "FINISHED" ? "bg-slate-400" : "bg-emerald-500"}`}
            aria-hidden="true"
          />
          {auctionLabels[auction.status] ?? auction.status}
        </span>
      </div>
      <section className="rounded-2xl border border-[#dfe8e2] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap gap-2" aria-label="Comandos do leilão">
          <CommandButton
            label="Iniciar ao vivo"
            icon={<Play className="size-4" />}
            disabled={
              !canOperate ||
              isPending ||
              !auctionActionAllowed(auction.status, "start", auction.mode)
            }
            onClick={() =>
              run(() =>
                managerAuctionCommandAction(
                  auctionId,
                  "start",
                  auction.version,
                ),
              )
            }
          />
          <CommandButton
            label="Pausar"
            icon={<Pause className="size-4" />}
            disabled={
              !canOperate ||
              isPending ||
              !auctionActionAllowed(auction.status, "pause", auction.mode)
            }
            onClick={() =>
              run(() =>
                managerAuctionCommandAction(
                  auctionId,
                  "pause",
                  auction.version,
                ),
              )
            }
          />
          <CommandButton
            label="Retomar"
            icon={<Undo2 className="size-4" />}
            disabled={
              !canOperate ||
              isPending ||
              !auctionActionAllowed(auction.status, "resume", auction.mode)
            }
            onClick={() =>
              run(() =>
                managerAuctionCommandAction(
                  auctionId,
                  "resume",
                  auction.version,
                ),
              )
            }
          />
          <CommandButton
            danger
            label="Encerrar leilão"
            icon={<Square className="size-4" />}
            disabled={
              !canOperate ||
              isPending ||
              !auctionActionAllowed(auction.status, "finish", auction.mode)
            }
            onClick={() =>
              run(() =>
                managerAuctionCommandAction(
                  auctionId,
                  "finish",
                  auction.version,
                ),
                "Encerrar este leilão? Confira os lotes e lances antes de confirmar.",
              )
            }
          />
          <button
            type="button"
            onClick={() => { setRefreshing(true); void refresh("Estado atualizado."); }}
            disabled={isPending || refreshing}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dfe8e2] px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            Atualizar estado
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Os controles ficam disponíveis conforme o estado atual do leilão.
        </p>
      </section>
      {isPending ? <p role="status" className="flex items-center gap-2 text-sm font-semibold text-secondary"><Loader2 className="size-4 animate-spin" />Executando comando…</p> : null}
      {syncError ? <p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Atualização interrompida. {syncError} Os valores exibidos podem estar desatualizados.</p> : null}
      {message ? (
        <p
          role="status"
          className="inline-flex items-center gap-2 rounded-lg bg-[#e8f4ee] px-4 py-3 text-sm font-semibold text-[#075b3e]"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
      <section
        className="overflow-hidden rounded-2xl border border-[#dfe8e2] bg-white shadow-sm"
        aria-labelledby="engine-lots-title"
      >
        <div className="border-b border-[#e9efeb] px-4 py-4 sm:px-5">
          <h3 id="engine-lots-title" className="font-semibold">
            Controle dos lotes
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Acompanhe o valor e a liderança de cada lote. Selecione um lote para consultar seus lances.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3 border-b px-4 py-3 sm:px-5">
          <label className="min-w-0 flex-1 basis-full text-xs font-semibold sm:basis-64" htmlFor="operation-lot">Selecionar lote
            <select id="operation-lot" className="admin-field" value={historyLot?.externalId ?? ""} onChange={(event) => setSelectedLot(event.target.value)}>
              {[...snapshot.lots].sort((a, b) => a.lotNumber - b.lotNumber).map((lot) => <option key={lot.externalId} value={lot.externalId}>Lote {lot.lotNumber} — {lot.title} · {lotLabels[lot.status] ?? lot.status}</option>)}
            </select>
          </label>
          {historyLot && capabilities.canManageLots && auction.mode === "LIVE" ? <button type="button" disabled={isPending || Boolean(syncError)} onClick={() => run(() => managerCurrentLotAction(auctionId, historyLot.externalId, auction.version))} className="min-h-11 rounded-lg border px-3 text-xs font-semibold disabled:opacity-40">Destacar na transmissão</button> : null}
          <span className="pb-3 text-xs text-muted-foreground">{snapshot.lots.filter((lot) => lot.status === "SOLD").length} vendido(s) · {snapshot.lots.length} lote(s)</span>
        </div>
        {historyLot ? <EngineLotRow key={historyLot.id} auctionId={auctionId} currency={auction.currency} lot={historyLot}
          canOperate={canOperate} onSelect={() => { setTool("bids"); document.getElementById("operation-tools")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} selected
          isPending={isPending} run={run} /> : <p className="p-5 text-sm text-muted-foreground">Nenhum lote disponível. Cadastre e publique os lotes para começar.</p>}

      </section>
      {canBid && auction.mode !== "SHOPPING" ? (
        <FloorBidPanel
          auctionId={auctionId}
          snapshot={snapshot}
          disabled={isPending || Boolean(syncError)}
          onDone={() =>
            void refresh("Lance assistido registrado e placar atualizado.")
          }
        />
      ) : auction.mode !== "SHOPPING" ? (
        <p className="rounded-xl border border-[#dfe8e2] bg-white px-4 py-3 text-sm text-slate-600">
          Seu perfil pode acompanhar a operação, mas não possui permissão para
          registrar lances assistidos.
        </p>
      ) : null}
      <section id="operation-tools" className="scroll-mt-24 space-y-4">
        <nav aria-label="Ferramentas da operação" className="flex flex-wrap gap-2 border-b pb-3">
          {([{ value: "bids", label: "Lances e habilitações", visible: capabilities.canViewBids || canOperate }, { value: "participants", label: "Participantes", visible: canOperate }, { value: "broadcast", label: "Transmissão / OBS", visible: auction.mode === "LIVE" }, { value: "communication", label: "Comunicação", visible: capabilities.canNotifyParticipants }] as const).filter((item) => item.visible).map((item) => <button type="button" key={item.value} aria-pressed={tool === item.value} onClick={() => setTool(item.value)} className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${tool === item.value ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>{item.label}</button>)}
        </nav>
        <div key={tool} className="management-panel-enter">
          {tool === "bids" ? <div className="space-y-4">{historyLot && capabilities.canViewBids ? <AuctionBidHistory key={historyLot.externalId} auctionId={auctionId} lot={historyLot} canManage={canBid && !syncError} onChanged={() => void refresh()} /> : null}{canOperate ? <AuctionPendingEligibilityBids auctionId={auctionId} canManageParticipants={canOperate} /> : null}</div> : null}
          {tool === "participants" && canOperate ? <AuctionParticipantsPanel auctionId={auctionId} lots={lots} capabilities={capabilities} /> : null}
          {tool === "broadcast" ? <div className="space-y-4">      {auction.mode === "LIVE" ? (
        <details className="rounded-2xl border border-[#dfe8e2] bg-white p-4 shadow-sm sm:p-5">
          <summary className="min-h-11 cursor-pointer font-semibold">Fonte da transmissão · {snapshot.stream?.status === "LIVE" ? "Ao vivo" : "Configurar"}</summary>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-[#08734e]" aria-hidden="true" />
                <h3 className="font-semibold">Fonte da transmissão</h3>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Conecte uma live do YouTube, uma playlist HLS ou uma URL pública
                de vídeo. O OBS e a tela pública usam esta mesma fonte.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-[12rem_minmax(0,1fr)_14rem]">
                <label className="text-xs font-semibold text-slate-700">
                  Serviço
                  <select
                    value={streamProvider}
                    onChange={(event) => {
                      streamDirty.current = true;
                      const next = event.target.value;
                      setStreamProvider(next);
                      setStreamUrl("");
                      setProviderStreamId("");
                    }}
                    disabled={!canOperate || isPending}
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe8e2] bg-white px-3 text-sm font-medium text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24]"
                  >
                    <option value="youtube">YouTube Live</option>
                    <option value="hls">HLS (.m3u8)</option>
                    <option value="direct">Stream direto</option>
                    <option value="custom">Outro serviço</option>
                    <option value="mock">Mock (somente ensaio)</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  URL pública da transmissão
                  <input
                    value={streamUrl}
                    onChange={(event) => { streamDirty.current = true; setStreamUrl(event.target.value); }}
                    disabled={!canOperate || isPending}
                    placeholder={
                      streamProvider === "youtube"
                        ? "https://www.youtube.com/live/..."
                        : "https://cdn.exemplo.com/live.m3u8"
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe8e2] bg-white px-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#f08a24]"
                    inputMode="url"
                    type="url"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  ID no serviço
                  <input
                    value={providerStreamId}
                    onChange={(event) => { streamDirty.current = true; setProviderStreamId(event.target.value); }}
                    disabled={!canOperate || isPending}
                    placeholder="Opcional"
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe8e2] bg-white px-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#f08a24]"
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Em produção, use HTTPS. Para YouTube, informe a URL da live;
                para outras plataformas, informe a URL de reprodução compatível.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 lg:min-w-44">
              <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span
                  className={`size-2.5 rounded-full ${snapshot.stream?.status === "LIVE" ? "bg-emerald-500" : "bg-slate-300"}`}
                  aria-hidden="true"
                />
                {snapshot.stream?.status === "LIVE"
                  ? "Ao vivo"
                  : snapshot.stream?.status === "ENDED"
                    ? "Encerrado"
                    : "Aguardando"}
              </p>
              <p className="text-xs text-slate-500">
                {streamProviderLabel(streamProvider)}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStream("LIVE")}
                  disabled={
                    !canOperate ||
                    isPending
                  }
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#08734e] px-3 text-sm font-semibold text-white hover:bg-[#075b3e] disabled:opacity-50"
                >
                  <Play className="size-4" aria-hidden="true" />
                  {snapshot.stream?.status === "LIVE" ? "Atualizar transmissão" : "Colocar ao vivo"}
                </button>
                <button
                  type="button"
                  onClick={() => setStream("ENDED")}
                  disabled={
                    !canOperate ||
                    isPending ||
                    snapshot.stream?.status !== "LIVE"
                  }
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe8e2] px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Square className="size-4" aria-hidden="true" />
                  Encerrar sinal
                </button>
              </div>
            </div>
          </div>
        </details>
      ) : null}
<AuctionBroadcastPanel auctionId={auctionId} canManage={canOperate} /></div> : null}
          {tool === "communication" && capabilities.canNotifyParticipants ? <AuctionCommunicationPanel auctionId={auctionId} canNotify /> : null}
        </div>
      </section>
    </section>
  );
}

function CommandButton({
  label,
  icon,
  danger,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-white disabled:opacity-50 ${danger ? "bg-red-700 hover:bg-red-800" : "bg-[#0d3427] hover:bg-[#075b3e]"}`}
    >
      {icon}
      {label}
    </button>
  );
}
function EngineLotRow({
  auctionId,
  currency,
  lot,
  canOperate,
  onSelect,
  selected,
  isPending,
  run,
}: {
  auctionId: string;
  currency: string;
  lot: EngineLot;
  canOperate: boolean;
  onSelect: () => void;
  selected: boolean;
  isPending: boolean;
  run: (action: () => Promise<{ success: boolean; error?: string }>, confirmation?: string) => void;
}) {
  return (
    <article className={`p-4 transition-colors duration-200 sm:p-5 ${selected ? "bg-secondary/5" : ""}`}>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500">
              LOTE {String(lot.lotNumber).padStart(2, "0")}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lot.status === "OPEN" ? "bg-[#e8f4ee] text-[#075b3e]" : lot.status === "SOLD" || lot.status === "UNSOLD" ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-800"}`}
            >
              {lotLabels[lot.status] ?? lot.status}
            </span>
          </div>
          <h4 className="mt-2 truncate font-bold">{lot.title}</h4>
          <p className="mt-1 truncate text-xs text-slate-500">
            Próximo lance: {money(lot.nextBidCents, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Preço oficial</p>
          <p key={lot.currentPriceCents} className="management-value-change mt-1 text-lg font-bold tabular-nums">
            {money(lot.currentPriceCents, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Liderança</p>
          <p className="mt-1 truncate font-semibold">
            {lot.currentBidderName || lot.currentBidderAlias || "Sem lances"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-3">
          <button type="button" onClick={onSelect} aria-pressed={selected} className="min-h-11 rounded-lg border px-3 text-xs font-semibold">Ver lances</button>
          <button type="button" disabled={!canOperate || isPending || ["SOLD", "UNSOLD", "CANCELLED"].includes(lot.status)} onClick={() => run(() => managerLotCommandAction(auctionId, lot.externalId, "announce", lot.version))} className="min-h-11 rounded-lg border px-3 text-xs font-semibold disabled:opacity-40">Anunciar lote</button>
          <button type="button" disabled={!canOperate || isPending || !["DRAFT", "QUEUED", "OPEN", "PAUSED"].includes(lot.status)} onClick={() => run(() => managerLotCommandAction(auctionId, lot.externalId, "withdraw", lot.version), `Retirar o lote ${lot.lotNumber} deste leilão?`)} className="min-h-11 rounded-lg border px-3 text-xs font-semibold text-red-700 disabled:opacity-40">Retirar lote</button>
          <button
            type="button"
            onClick={() =>
              run(() =>
                managerLotCommandAction(
                  auctionId,
                  lot.externalId,
                  "open",
                  lot.version,
                ),
              )
            }
            disabled={
              !canOperate || isPending || !lotActionAllowed(lot.status, "open")
            }
            className="inline-flex min-h-9 items-center rounded-lg border border-[#dfe8e2] px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Abrir
          </button>
          <button
            type="button"
            onClick={() =>
              run(() =>
                managerLotCommandAction(
                  auctionId,
                  lot.externalId,
                  "pause",
                  lot.version,
                ),
              )
            }
            disabled={
              !canOperate || isPending || !lotActionAllowed(lot.status, "pause")
            }
            className="inline-flex min-h-9 items-center rounded-lg border border-[#dfe8e2] px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Pausar
          </button>
          <button
            type="button"
            onClick={() =>
              run(() =>
                managerLotCommandAction(
                  auctionId,
                  lot.externalId,
                  "resume",
                  lot.version,
                ),
              )
            }
            disabled={
              !canOperate ||
              isPending ||
              !lotActionAllowed(lot.status, "resume")
            }
            className="inline-flex min-h-9 items-center rounded-lg bg-[#e8f4ee] px-3 text-xs font-semibold text-[#075b3e] hover:bg-[#d5ecdf] disabled:opacity-40"
          >
            Retomar
          </button>
          <button
            type="button"
            onClick={() =>
              run(() =>
                managerLotCommandAction(
                  auctionId,
                  lot.externalId,
                  "sell",
                  lot.version,
                ),
                `Encerrar o lote ${lot.lotNumber} por ${money(lot.currentPriceCents, currency)}?`,
              )
            }
            disabled={
              !canOperate || isPending || !lotActionAllowed(lot.status, "sell")
            }
            className="inline-flex min-h-9 items-center rounded-lg bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-40"
          >
            {lot.currentPriceCents ? "Vender" : "Encerrar sem venda"}
          </button>
        </div>
      </div>
    </article>
  );
}

function FloorBidPanel({
  auctionId,
  snapshot,
  disabled,
  onDone,
}: {
  auctionId: string;
  snapshot: EngineAuctionSnapshot;
  disabled: boolean;
  onDone: () => void;
}) {
  const [query, setQuery] = useState("");
  const [participants, setParticipants] = useState<
    AuctionParticipantSearchResult[]
  >([]);
  const [selected, setSelected] =
    useState<AuctionParticipantSearchResult | null>(null);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [lotId, setLotId] = useState(
    snapshot.lots.find((lot) => lot.status === "OPEN")?.externalId ?? "",
  );
  const activeLotId = snapshot.lots.some((lot) => lot.externalId === lotId && lot.status === "OPEN") ? lotId : snapshot.lots.find((lot) => lot.status === "OPEN")?.externalId ?? "";
  const [amount, setAmount] = useState("");
  const [origin, setOrigin] = useState<"FLOOR" | "PHONE">("FLOOR");
  const [acquisitionSource, setAcquisitionSource] = useState<AcquisitionSource>("UNKNOWN");
  const [notice, setNotice] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickDocument, setQuickDocument] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickWhatsappOptIn, setQuickWhatsappOptIn] = useState(false);
  const [quickNotice, setQuickNotice] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  function search() {
    startTransition(async () => {
      const result = await searchAuctionParticipantsAction(query);
      setParticipants(result.data ?? []);
      if (result.success) setNotice(result.data?.length ? null : "Nenhum participante encontrado. Tente outro nome ou documento.");
      if (!result.success)
        setNotice(result.error || "Não foi possível pesquisar.");
    });
  }
  function createQuickParticipant() {
    setQuickNotice(null);
    startTransition(async () => {
      const result = await createQuickParticipantAction({ name: quickName, document: quickDocument, phone: quickPhone, whatsappOptIn: quickWhatsappOptIn });
      if (!result.success || !result.data) {
        setQuickNotice({ type: "error", message: result.error || "Não foi possível cadastrar o participante rápido." });
        return;
      }
      const displayName = result.data.displayName?.trim() || quickName.trim();
      setSelected(result.data);
      setSelectedLabel(displayName);
      setQuery(displayName);
      setParticipants([]);
      setQuickName("");
      setQuickDocument("");
      setQuickPhone("");
      setQuickWhatsappOptIn(false);
      setQuickOpen(false);
      setNotice(
        result.data.participantType === "QUICK"
          ? "Cadastro rápido criado e selecionado."
          : "Usuário cadastrado selecionado.",
      );
    });
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lot = snapshot.lots.find((item) => item.externalId === activeLotId);
    if (disabled || !lot || lot.status !== "OPEN" || !selected) {
      setNotice("Escolha um lote aberto e um participante.");
      return;
    }
    const amountCents = parseManagementAmount(amount);
    if (!amountCents || BigInt(amountCents) < BigInt(lot.nextBidCents)) {
      setNotice(`Informe um valor válido a partir de ${money(lot.nextBidCents, snapshot.auction.currency)}.`);
      return;
    }
    startTransition(async () => {
      const result = await managerFloorBidAction(auctionId, lot.externalId, {
        participantId: selected.id,
        amountCents,
        origin,
        acquisitionSource,
        expectedVersion: lot.version,
      });
      if (!result.success) {
        setNotice(result.error || "Não foi possível registrar o lance.");
        return;
      }
      setNotice("Lance assistido registrado.");
      setAmount("");
      onDone();
    });
  }
  return (
    <section className="rounded-2xl border border-[#dfe8e2] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <Gavel className="size-5 text-[#08734e]" aria-hidden="true" />
        <div>
          <h3 className="font-semibold">Lance de piso ou telefone</h3>
          <p className="mt-1 text-xs text-slate-500">
            Selecione o participante e confira o valor antes de registrar o lance.
          </p>
        </div>
      </div>
      <form
        onSubmit={submit}
        className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 lg:items-end"
      >
        <Field label="Lote" id="floor-lot">
          <select
            id="floor-lot"
            value={activeLotId}
            onChange={(e) => setLotId(e.target.value)}
            className="admin-field"
          >
            <option value="">Escolha o lote aberto</option>
            {snapshot.lots
              .filter((lot) => lot.status === "OPEN")
              .map((lot) => (
                <option key={lot.externalId} value={lot.externalId}>
                  Lote {lot.lotNumber} — {lot.title}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Participante" id="floor-participant">
          <div className="flex gap-2">
            <input
              id="floor-participant"
              value={selected ? selectedLabel || selected.displayName : query}
              onChange={(e) => {
                setSelected(null);
                setSelectedLabel("");
                setQuery(e.target.value);
              }}
              placeholder="Nome ou e-mail"
              className="admin-field min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={search}
              disabled={pending || query.trim().length < 2}
              className="grid size-10 shrink-0 place-items-center rounded-lg border border-[#dfe8e2] text-[#075b3e] hover:bg-[#e8f4ee] disabled:opacity-50"
              aria-label="Pesquisar participantes"
            >
              <Search className="size-4" aria-hidden="true" />
            </button>
          </div>
          {participants.length > 0 && !selected ? (
            <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-[#dfe8e2] bg-white">
              {participants.map((participant) => (
                <button
                  type="button"
                  key={participant.id}
                  onClick={() => {
                    const displayName =
                      participant.displayName.trim();
                    setSelected(participant);
                    setSelectedLabel(displayName);
                    setQuery(displayName);
                    setParticipants([]);
                  }}
                  className="block min-h-10 w-full px-3 text-left text-xs hover:bg-[#f3f9f5] focus-visible:bg-[#f3f9f5]"
                >
                  {participant.displayName}{" "}
                  <span className="text-slate-500">
                    {participant.participantType === "QUICK"
                      ? `Cadastro rápido · ${participant.maskedDocument}`
                      : participant.email}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          {selected ? (
            <p className="mt-2 text-xs font-medium text-[#075b3e]" role="status">
              Participante selecionado: {selectedLabel || selected.displayName}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setQuickOpen((current) => !current);
              setQuickNotice(null);
            }}
            className="mt-2 inline-flex min-h-9 items-center rounded-lg border border-dashed border-[#08734e]/50 px-3 text-xs font-semibold text-[#075b3e] hover:bg-[#e8f4ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24]"
          >
            {quickOpen ? "Fechar cadastro rápido" : "Cadastrar participante rápido"}
          </button>
          {quickOpen ? (
            <div className="mt-3 space-y-3 rounded-lg border border-dashed border-[#08734e]/40 bg-[#f3f9f5] p-3">
              <div>
                <p className="text-xs font-bold text-[#075b3e]">Cadastro rápido</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-600">
                  Esse cadastro não cria conta. O telefone é opcional; marque a
                  autorização somente quando o participante tiver consentido com
                  o contato.
                </p>
              </div>
              <label className="block text-xs font-semibold text-slate-700" htmlFor="quick-participant-name">
                Nome
                <input
                  id="quick-participant-name"
                  value={quickName}
                  onChange={(event) => setQuickName(event.target.value)}
                  maxLength={120}
                  autoComplete="off"
                  className="admin-field mt-1"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700" htmlFor="quick-participant-phone">
                WhatsApp (opcional)
                <input
                  id="quick-participant-phone"
                  value={quickPhone}
                  onChange={(event) => setQuickPhone(event.target.value)}
                  inputMode="tel"
                  maxLength={30}
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  className="admin-field mt-1"
                />
              </label>
              <label className="flex items-start gap-2 text-xs leading-5 text-slate-700">
                <input type="checkbox" className="mt-1" checked={quickWhatsappOptIn} onChange={(event) => setQuickWhatsappOptIn(event.target.checked)} disabled={!quickPhone.trim()} />
                O participante autorizou receber mensagens deste leilão pelo WhatsApp.
              </label>
              <label className="block text-xs font-semibold text-slate-700" htmlFor="quick-participant-document">
                CPF ou CNPJ
                <input
                  id="quick-participant-document"
                  value={quickDocument}
                  onChange={(event) => setQuickDocument(event.target.value)}
                  inputMode="numeric"
                  maxLength={18}
                  autoComplete="off"
                  className="admin-field mt-1"
                />
              </label>
              {quickNotice ? (
                <p role={quickNotice.type === "error" ? "alert" : "status"} className={`text-xs ${quickNotice.type === "error" ? "text-red-700" : "text-[#075b3e]"}`}>
                  {quickNotice.message}
                </p>
              ) : null}
              <button
                type="button"
                onClick={createQuickParticipant}
                disabled={pending || quickName.trim().length < 2 || ![11, 14].includes(quickDocument.replace(/\D/g, "").length)}
                className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[#08734e] px-3 text-xs font-semibold text-white hover:bg-[#075b3e] disabled:opacity-50"
              >
                {pending ? "Salvando…" : "Criar e selecionar"}
              </button>
            </div>
          ) : null}
        </Field>
        <Field label="Valor (R$)" id="floor-amount">
          <input
            id="floor-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className="admin-field"
          />
        </Field>
        <Field label="Origem" id="floor-origin">
          <select
            id="floor-origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value as "FLOOR" | "PHONE")}
            className="admin-field"
          >
            <option value="FLOOR">Piso</option>
            <option value="PHONE">Telefone</option>
          </select>
        </Field>
        <Field label="Origem do participante" id="acquisition-source">
          <select
            id="acquisition-source"
            value={acquisitionSource}
            onChange={(event) => setAcquisitionSource(event.target.value as AcquisitionSource)}
            className="admin-field"
          >
            {acquisitionSourceOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>
        <button
          type="submit"
          disabled={pending || disabled || !selected || !activeLotId || !amount.trim()}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#08734e] px-4 text-sm font-semibold text-white hover:bg-[#075b3e] disabled:opacity-50 "
        >
          {pending ? "Enviando…" : "Registrar lance"}
        </button>
      </form>
      {notice ? (
        <p role="status" className="mt-4 text-sm text-slate-700">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-xs font-semibold text-slate-700">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}
