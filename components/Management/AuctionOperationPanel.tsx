"use client";

import {
  CheckCircle2,
  Gavel,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Square,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  createQuickParticipantAction,
  getEngineSnapshotAction,
  managerAuctionCommandAction,
  managerFloorBidAction,
  managerLotCommandAction,
  managerStreamAction,
  searchAuctionParticipantsAction,
} from "@/hooks/actions/auctionEngineActions";
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
}: {
  auctionId: string;
  initialSnapshot: EngineAuctionSnapshot | null;
  capabilities: AuctionCapabilities;
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
  const statusRef = useRef(initialSnapshot?.auction.status);
  const streamVersionRef = useRef(initialSnapshot?.stream?.version);
  useEffect(() => {
    if (!initialSnapshot) return;
    let stopped = false;
    const poll = async () => {
      const result = await getEngineSnapshotAction(auctionId);
      if (!stopped && result.success && result.data) {
        const changed = statusRef.current !== result.data.auction.status;
        const streamChanged =
          streamVersionRef.current !== result.data.stream?.version;
        statusRef.current = result.data.auction.status;
        streamVersionRef.current = result.data.stream?.version;
        if (streamChanged) {
          setStreamProvider(result.data.stream?.provider || "youtube");
          setStreamUrl(result.data.stream?.playbackUrl || "");
          setProviderStreamId(result.data.stream?.providerStreamId || "");
        }
        setSnapshot(result.data);
        if (changed)
          window.dispatchEvent(new Event("auction-management-refresh"));
      }
    };
    const timer = window.setInterval(() => void poll(), 2500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [auctionId, initialSnapshot]);
  async function refresh(successMessage = "Estado oficial atualizado.") {
    const result = await getEngineSnapshotAction(auctionId);
    if (result.success && result.data) {
      streamVersionRef.current = result.data.stream?.version;
      setStreamProvider(result.data.stream?.provider || "youtube");
      setStreamUrl(result.data.stream?.playbackUrl || "");
      setProviderStreamId(result.data.stream?.providerStreamId || "");
      setSnapshot(result.data);
      setError(null);
      setMessage(successMessage);
    } else setError(result.error || "Não foi possível atualizar o estado.");
  }
  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await action();
      if (!result.success) {
        setError(result.error || "Comando não executado.");
        return;
      }
      await refresh("Comando registrado e estado atualizado.");
    });
  }
  if (!snapshot)
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <h2 className="font-semibold">Operação ainda não disponível</h2>
        <p className="mt-1 leading-6">
          {error ||
            "Publique o leilão e aguarde o motor preparar o snapshot oficial."}
        </p>
      </section>
    );
  const auction = snapshot.auction;
  const canOperate = capabilities.canManageStatus;
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
    run(() =>
      managerStreamAction(auctionId, {
        provider,
        status,
        ...(playbackUrl ? { playbackUrl } : {}),
        ...(providerStreamId.trim()
          ? { providerStreamId: providerStreamId.trim() }
          : {}),
        ...(provider === "mock" && !playbackUrl
          ? { playbackUrl: `https://mock-stream.invalid/${auction.externalId}` }
          : {}),
      }),
    );
  }
  return (
    <section className="space-y-5" aria-labelledby="operation-title">
      <div className="flex flex-col gap-3 border-b border-[#e9efeb] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#08734e]">
            <Radio className="size-5" aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-[0.16em]">
              Motor oficial
            </p>
          </div>
          <h2 id="operation-title" className="mt-2 text-xl font-bold">
            {auction.mode === "LIVE"
              ? "Operação ao vivo"
              : auction.mode === "SHOPPING"
                ? "Operação de compra imediata"
                : "Operação de pré-lance"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Os comandos abaixo apenas encaminham ações ao Auction Engine. O
            estado exibido é sempre o snapshot devolvido pelo backend.
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
      {auction.mode === "LIVE" ? (
        <section className="rounded-2xl border border-[#dfe8e2] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                    onChange={(event) => setStreamUrl(event.target.value)}
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
                    onChange={(event) =>
                      setProviderStreamId(event.target.value)
                    }
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
                    isPending ||
                    snapshot.stream?.status === "LIVE"
                  }
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#08734e] px-3 text-sm font-semibold text-white hover:bg-[#075b3e] disabled:opacity-50"
                >
                  <Play className="size-4" aria-hidden="true" />
                  Colocar ao vivo
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
        </section>
      ) : null}
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
              )
            }
          />
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isPending}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dfe8e2] px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Atualizar estado
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Versão oficial {auction.version}. Ações inválidas para o estado atual
          ficam desabilitadas também no backend.
        </p>
      </section>
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
            Lotes no motor
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Acompanhe preço, liderança e versão de cada lote em tempo real.
          </p>
        </div>
        <div className="divide-y divide-[#e9efeb]">
          {snapshot.lots.map((lot) => (
            <EngineLotRow
              key={lot.id}
              auctionId={auctionId}
              currency={auction.currency}
              lot={lot}
              canOperate={canOperate}
              isPending={isPending}
              run={run}
            />
          ))}
        </div>
      </section>
      {canBid ? (
        <FloorBidPanel
          auctionId={auctionId}
          snapshot={snapshot}
          onDone={() =>
            void refresh("Lance assistido registrado e placar atualizado.")
          }
        />
      ) : (
        <p className="rounded-xl border border-[#dfe8e2] bg-white px-4 py-3 text-sm text-slate-600">
          Seu perfil pode acompanhar a operação, mas não possui permissão para
          registrar lances assistidos.
        </p>
      )}
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
  isPending,
  run,
}: {
  auctionId: string;
  currency: string;
  lot: EngineLot;
  canOperate: boolean;
  isPending: boolean;
  run: (action: () => Promise<{ success: boolean; error?: string }>) => void;
}) {
  return (
    <article className="p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(14rem,1fr)_10rem_10rem_auto] lg:items-center">
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
            Versão {lot.version} · sequência {lot.lotSequence}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Preço oficial</p>
          <p className="mt-1 text-lg font-bold tabular-nums">
            {money(lot.currentPriceCents, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Liderança</p>
          <p className="mt-1 truncate font-semibold">
            {lot.currentBidderName || lot.currentBidderAlias || "Sem lances"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
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
              )
            }
            disabled={
              !canOperate || isPending || !lotActionAllowed(lot.status, "sell")
            }
            className="inline-flex min-h-9 items-center rounded-lg bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-40"
          >
            Vender
          </button>
        </div>
      </div>
    </article>
  );
}

function FloorBidPanel({
  auctionId,
  snapshot,
  onDone,
}: {
  auctionId: string;
  snapshot: EngineAuctionSnapshot;
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
  const [amount, setAmount] = useState("");
  const [origin, setOrigin] = useState<"FLOOR" | "PHONE">("FLOOR");
  const [acquisitionSource, setAcquisitionSource] = useState<AcquisitionSource>("UNKNOWN");
  const [notice, setNotice] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickDocument, setQuickDocument] = useState("");
  const [quickNotice, setQuickNotice] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  function search() {
    startTransition(async () => {
      const result = await searchAuctionParticipantsAction(query);
      setParticipants(result.data ?? []);
      if (!result.success)
        setNotice(result.error || "Não foi possível pesquisar.");
    });
  }
  function createQuickParticipant() {
    setQuickNotice(null);
    startTransition(async () => {
      const result = await createQuickParticipantAction({ name: quickName, document: quickDocument });
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
    const lot = snapshot.lots.find((item) => item.externalId === lotId);
    if (!lot || !selected) {
      setNotice("Escolha um lote aberto e um participante.");
      return;
    }
    const normalized = amount.trim().replace(/\./g, "").replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
      setNotice("Informe um valor válido.");
      return;
    }
    startTransition(async () => {
      const result = await managerFloorBidAction(auctionId, lot.externalId, {
        participantId: selected.id,
        amountCents: String(Math.round(Number(normalized) * 100)),
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
            A ação é registrada no Auction Engine com origem e versão esperada.
          </p>
        </div>
      </div>
      <form
        onSubmit={submit}
        className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_10rem_10rem_auto] lg:items-end"
      >
        <Field label="Lote" id="floor-lot">
          <select
            id="floor-lot"
            value={lotId}
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
                      query.trim() || participant.displayName.trim();
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
                  Informe somente Nome e CPF/CNPJ. Esse cadastro não cria conta,
                  senha ou acesso à plataforma.
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
          disabled={pending}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#08734e] px-4 text-sm font-semibold text-white hover:bg-[#075b3e] disabled:opacity-50 lg:col-start-5"
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
    <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
      {label}
      {children}
    </label>
  );
}
