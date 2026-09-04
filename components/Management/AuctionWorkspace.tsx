"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileBarChart,
  Gavel,
  ListOrdered,
  MonitorPlay,
  MessageCircle,
  Pencil,
  Settings2,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelAuctionAction,
  deleteAuctionAction,
  publishAuctionAction,
} from "@/hooks/actions/auctionActions";
import {
  formatAuctionDate,
  formatAuctionStatus,
  formatCents,
} from "@/lib/auctions/admin-utils";
import type { EngineAuctionSnapshot } from "@/lib/auctions/engine-types";
import type {
  BroadcastClientInfo,
  BroadcastConfig,
  BroadcastState,
} from "@/lib/broadcast/broadcast-types";
import type { AuctionAdmin, AuctionAdminLot } from "@/types/auction-admin";
import type { AuctionCapabilities } from "@/components/Management/capabilities";
import { AuctionForm } from "@/components/Management/AuctionForm";
import { AuctionLotsPanel } from "@/components/Management/AuctionLotsPanel";
import { AuctionPendingEligibilityBids } from "@/components/Management/AuctionPendingEligibilityBids";
import { AuctionOperationPanel } from "@/components/Management/AuctionOperationPanel";
import { AuctionParticipantsPanel } from "@/components/Management/AuctionParticipantsPanel";
import { AuctionCommunicationPanel } from "@/components/Management/AuctionCommunicationPanel";

type Tab =
  | "resumo"
  | "dados"
  | "lotes"
  | "lances"
  | "participantes"
  | "comunicacao"
  | "operacao"
  | "transmissao";

const tabs: Array<{ value: Tab; label: string; icon: typeof Gavel }> = [
  { value: "resumo", label: "Resumo", icon: Gavel },
  { value: "dados", label: "Dados do leilão", icon: Settings2 },
  { value: "lotes", label: "Lotes", icon: ListOrdered },
  { value: "lances", label: "Lances e pré-lances", icon: Gavel },
  { value: "participantes", label: "Participantes", icon: ShieldCheck },
  { value: "comunicacao", label: "Comunicação", icon: MessageCircle },
  { value: "operacao", label: "Operação", icon: MonitorPlay },
  { value: "transmissao", label: "Broadcast / OBS", icon: MonitorPlay },
];

const statusClasses: Record<AuctionAdmin["status"], string> = {
  DRAFT: "border-amber-200 bg-amber-50 text-amber-700",
  PRE_LAUNCH: "border-sky-200 bg-sky-50 text-sky-700",
  COMING_SOON: "border-indigo-200 bg-indigo-50 text-indigo-700",
  WAITING_OPENING: "border-violet-200 bg-violet-50 text-violet-700",
  OPEN: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CLOSED: "border-slate-200 bg-slate-50 text-slate-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
};

function getTab(value: string | null): Tab {
  return tabs.some((tab) => tab.value === value) ? (value as Tab) : "resumo";
}

export function AuctionWorkspace({
  auction,
  lots,
  capabilities,
  engineSnapshot,
  engineError,
  broadcastState,
  broadcastConfig,
  broadcastClients,
}: {
  auction: AuctionAdmin;
  lots: AuctionAdminLot[];
  capabilities: AuctionCapabilities;
  engineSnapshot: EngineAuctionSnapshot | null;
  engineError?: string;
  broadcastState: BroadcastState | null;
  broadcastConfig: BroadcastConfig | null;
  broadcastClients: BroadcastClientInfo[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = getTab(params.get("aba"));

  function changeTab(next: Tab) {
    router.replace(`${pathname}?aba=${next}`, { scroll: false });
  }

  const workspaceCapabilities = {
    ...capabilities,
    canEdit: capabilities.canEdit && (auction.availableActions?.canEdit ?? true),
    canManageLots:
      capabilities.canManageLots &&
      (auction.availableActions?.canManageLots ?? true),
  };
  const readiness = [
    Boolean(auction.title && auction.category && auction.startsAt),
    Boolean(auction.startsAt),
    Boolean(auction.coverImage || auction.coverImageUrl),
    lots.some((lot) => ["OPEN", "SOLD", "CLOSED"].includes(lot.status)),
  ];
  const completed = readiness.filter(Boolean).length;

  return (
    <div className="w-full space-y-6 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Link
            href="/admin/leiloes"
            className="inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground outline-none transition-[background-color,color,scale] duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para leilões
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusClasses[auction.status]}`}>
                {formatAuctionStatus(auction.status)}
              </span>
              <span className="text-xs text-muted-foreground">{auction.mode} · /{auction.slug}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{auction.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Início {formatAuctionDate(auction.startsAt)} · {auction.lotCount} lote(s) · incremento {formatCents(auction.incrementCents)}
            </p>
            <AuctionStatusControls auction={auction} capabilities={capabilities} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {workspaceCapabilities.canEdit ? <Link href={`/admin/leiloes/${auction.id}?aba=dados`} className="inline-flex min-h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-semibold outline-none transition-[background-color,scale] duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"><Pencil className="size-4" aria-hidden="true" />Editar dados</Link> : null}
          {workspaceCapabilities.canManageLots ? <Link href={`/admin/leiloes/${auction.id}?aba=lotes`} className="inline-flex min-h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-semibold outline-none transition-[background-color,scale] duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"><ListOrdered className="size-4" aria-hidden="true" />Gerenciar lotes</Link> : null}
          {capabilities.canViewReports ? <Link href={`/admin/leiloes/${auction.id}/relatorio`} className="inline-flex min-h-9 items-center gap-2 rounded-md bg-secondary px-3 text-sm font-semibold text-secondary-foreground outline-none transition-[background-color,scale] duration-150 hover:bg-secondary/90 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"><FileBarChart className="size-4" aria-hidden="true" />Ver relatório</Link> : null}
          {capabilities.canDelete && (auction.availableActions?.canDelete ?? true) ? <DeleteAuctionButton auction={auction} /> : null}
        </div>
      </header>

      <nav className="overflow-x-auto pb-1" aria-label="Seções do workspace">
        <div className="flex min-w-max gap-1 rounded-xl border bg-card p-1">
          {tabs.filter((item) => item.value !== "comunicacao" || capabilities.canNotifyParticipants).map(({ value, label, icon: Icon }) => (
            <button
              type="button"
              key={value}
              onClick={() => changeTab(value)}
              aria-current={tab === value ? "page" : undefined}
              className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium outline-none transition-[background-color,color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] sm:px-4 ${tab === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {tab === "resumo" ? (
        <div className="space-y-5">
          <section className="rounded-xl border bg-card p-5 shadow-sm" aria-labelledby="readiness-title">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="readiness-title" className="font-semibold">Prontidão para publicar</h2>
                <p className="mt-1 text-sm text-muted-foreground">{completed} de {readiness.length} itens concluídos</p>
              </div>
              <span className="text-2xl font-bold text-secondary">{Math.round((completed / readiness.length) * 100)}%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-secondary transition-[width] duration-300" style={{ width: `${(completed / readiness.length) * 100}%` }} /></div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {["Dados básicos", "Agenda configurada", "Capa adicionada", "Lote visível"].map((label, index) => (
                <li key={label} className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5 text-sm">
                  <span className="flex items-center gap-2">{readiness[index] ? <CheckCircle2 className="size-4 text-secondary" aria-hidden="true" /> : <Circle className="size-4 text-muted-foreground" aria-hidden="true" />}{label}</span>
                  {!readiness[index] ? <button type="button" onClick={() => changeTab(index === 3 ? "lotes" : "dados")} className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring">Corrigir</button> : null}
                </li>
              ))}
            </ul>
          </section>
          <div className="grid overflow-hidden rounded-xl border bg-card sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Formato" value={auction.mode === "LIVE" ? "Leilão ao vivo" : auction.mode === "SHOPPING" ? "Shopping / compra imediata" : "Pré-lance"} />
            <Metric label="Início" value={formatAuctionDate(auction.startsAt)} />
            <Metric label="Encerramento" value={formatAuctionDate(auction.endsAt)} />
            <Metric label="Lotes e incremento" value={`${auction.lotCount} · ${formatCents(auction.incrementCents)}`} />
          </div>
          {auction.availableActions?.reasons.publish ? <div className="space-y-2"><div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><p className="font-semibold">Publicação pendente</p><p className="mt-1">{auction.availableActions.reasons.publish.message}</p></div><button type="button" onClick={() => changeTab("dados")} className="text-sm font-medium text-primary underline underline-offset-2">Abrir correção</button></div> : null}
        </div>
      ) : null}
      {tab === "dados" ? <AuctionForm initialData={auction} capabilities={workspaceCapabilities} /> : null}
      {tab === "lotes" ? <AuctionLotsPanel auctionId={auction.id} initialLots={lots} capabilities={capabilities} engineLots={engineSnapshot?.lots} /> : null}
      {tab === "lances" ? (
        <section className="space-y-5" aria-labelledby="pending-bids-title">
          <header className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 text-secondary">
              <Gavel className="size-5" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Gestão de lances</p>
            </div>
            <h2 id="pending-bids-title" className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">Lances e pré-lances</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Consulte os lances enviados por participantes que ainda aguardam habilitação, confira os dados do usuário e libere sua participação sem sair desta página.
            </p>
          </header>

          {engineSnapshot?.lots.length ? (
            <div className="space-y-4" aria-label="Lances e pré-lances aguardando habilitação">
              {engineSnapshot.lots.map((lot) => (
                <AuctionPendingEligibilityBids
                  key={lot.externalId}
                  auctionId={auction.id}
                  lotId={lot.externalId}
                  lotNumber={lot.lotNumber}
                  lotTitle={lot.title}
                  currency={engineSnapshot.auction.currency ?? "BRL"}
                  canManageParticipants={capabilities.canManageStatus}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
              {engineError || "Os lances aparecerão aqui quando o leilão possuir lotes publicados no motor."}
            </div>
          )}
        </section>
      ) : null}
      {tab === "participantes" ? <AuctionParticipantsPanel auctionId={auction.id} lots={lots} capabilities={capabilities} /> : null}
      {tab === "comunicacao" ? <AuctionCommunicationPanel auctionId={auction.id} canNotify={capabilities.canNotifyParticipants} /> : null}
      {tab === "operacao" ? <AuctionOperationPanel auctionId={auction.id} initialSnapshot={engineSnapshot} capabilities={capabilities} /> : null}
      {tab === "transmissao" ? <BroadcastSummary auctionId={auction.id} state={broadcastState} config={broadcastConfig} clients={broadcastClients} error={engineError} /> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="border-b p-4 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function AuctionStatusControls({ auction, capabilities }: { auction: AuctionAdmin; capabilities: AuctionCapabilities }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canPublish = capabilities.canManageStatus && auction.availableActions?.canPublish !== false && auction.status !== "OPEN" && auction.status !== "CLOSED" && auction.status !== "CANCELLED";

  function publish() {
    startTransition(async () => {
      const result = await publishAuctionAction(auction.id);
      setNotice(result.success ? "Leilão publicado." : result.error || "Não foi possível publicar.");
      if (result.success) window.location.reload();
    });
  }

  function cancel() {
    if (!window.confirm("Cancelar este leilão? Esta transição não pode ser desfeita.")) return;
    startTransition(async () => {
      const result = await cancelAuctionAction(auction.id);
      setNotice(result.success ? "Leilão cancelado." : result.error || "Não foi possível cancelar.");
      if (result.success) window.location.reload();
    });
  }

  return <div className="mt-3 flex flex-wrap items-center gap-2">{canPublish ? <button type="button" onClick={publish} disabled={pending} className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground outline-none transition-[background-color,scale] duration-150 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] disabled:opacity-50"><CheckCircle2 className="size-4" aria-hidden="true" />Publicar</button> : null}{capabilities.canManageStatus && auction.status !== "CANCELLED" && auction.status !== "CLOSED" ? <button type="button" onClick={cancel} disabled={pending} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-destructive/30 px-3 text-sm font-semibold text-destructive outline-none transition-[background-color,scale] duration-150 hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/40 active:scale-[0.96] disabled:opacity-50"><XCircle className="size-4" aria-hidden="true" />Cancelar</button> : null}{notice ? <span role="status" className="text-xs font-semibold text-muted-foreground">{notice}</span> : null}</div>;
}

function DeleteAuctionButton({ auction }: { auction: AuctionAdmin }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function remove() {
    if (!window.confirm(`Excluir o leilão “${auction.title}”? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const result = await deleteAuctionAction(auction.id);
      if (result.success) {
        router.push("/admin/leiloes");
        router.refresh();
      } else {
        window.alert(result.error || "Não foi possível excluir o leilão.");
      }
    });
  }
  return <button type="button" onClick={remove} disabled={pending} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-destructive/30 px-3 text-sm font-semibold text-destructive outline-none transition-[background-color,scale] duration-150 hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/40 active:scale-[0.96] disabled:opacity-50"><Trash2 className="size-4" aria-hidden="true" />Excluir</button>;
}

function BroadcastSummary({ auctionId, state, config, clients, error }: { auctionId: string; state: BroadcastState | null; config: BroadcastConfig | null; clients: BroadcastClientInfo[]; error?: string }) {
  return <section className="space-y-5" aria-labelledby="broadcast-summary-title"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-secondary"><MonitorPlay className="size-4" aria-hidden="true" />Transmissão</div><h2 id="broadcast-summary-title" className="mt-2 text-xl font-bold">Broadcast / OBS</h2><p className="mt-1 text-sm text-muted-foreground">O overlay é somente leitura; os comandos continuam no Auction Engine.</p></div><Link href={`/admin/leiloes/${auctionId}/broadcast`} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground outline-none transition-[background-color,scale] duration-150 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"><ExternalLink className="size-4" aria-hidden="true" />Abrir control room</Link></div>{error ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">{error}</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Estado" value={state?.status ?? "Sem snapshot"} /><Metric label="Lote atual" value={state?.currentLot ? `Lote ${state.currentLot.number} · ${state.currentLot.title}` : "Nenhum"} /><Metric label="Versão" value={state ? String(state.version) : "—"} /><Metric label="Clientes / delay" value={`${clients.length} · ${config?.overlayDelayMs ?? 0} ms`} /></div>}</section>;
}
