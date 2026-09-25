"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileBarChart,
  Gavel,
  ListOrdered,
  MonitorPlay,
  MessageCircle,
  Pencil,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
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
const AuctionBroadcastPanel = dynamic(() => import("@/components/Management/AuctionBroadcastPanel").then((module) => module.AuctionBroadcastPanel), { loading: () => <div role="status" className="management-skeleton rounded-xl border p-6">Carregando seção…</div> });
import type { AuctionAdmin, AuctionAdminLot } from "@/types/auction-admin";
import type { AuctionCapabilities } from "@/components/Management/capabilities";
const AuctionForm = dynamic(() => import("@/components/Management/AuctionForm").then((module) => module.AuctionForm), { loading: () => <div role="status" className="management-skeleton rounded-xl border p-6">Carregando seção…</div> });
const AuctionLotsPanel = dynamic(() => import("@/components/Management/AuctionLotsPanel").then((module) => module.AuctionLotsPanel), { loading: () => <div role="status" className="management-skeleton rounded-xl border p-6">Carregando seção…</div> });
import { AuctionPendingEligibilityBids } from "@/components/Management/AuctionPendingEligibilityBids";
const AuctionOperationPanel = dynamic(() => import("@/components/Management/AuctionOperationPanel").then((module) => module.AuctionOperationPanel), { loading: () => <div role="status" className="management-skeleton rounded-xl border p-6">Carregando seção…</div> });
const AuctionParticipantsPanel = dynamic(() => import("@/components/Management/AuctionParticipantsPanel").then((module) => module.AuctionParticipantsPanel), { loading: () => <div role="status" className="management-skeleton rounded-xl border p-6">Carregando seção…</div> });
const AuctionCommunicationPanel = dynamic(() => import("@/components/Management/AuctionCommunicationPanel").then((module) => module.AuctionCommunicationPanel), { loading: () => <div role="status" className="management-skeleton rounded-xl border p-6">Carregando seção…</div> });
const AuctionMarketSalesPanel = dynamic(() => import("@/components/Management/AuctionMarketSalesPanel").then((module) => module.AuctionMarketSalesPanel), { loading: () => <div role="status" className="management-skeleton rounded-xl border p-6">Carregando seção…</div> });

type Tab =
  | "resumo"
  | "dados"
  | "lotes"
  | "lances"
  | "participantes"
  | "vendas"
  | "comunicacao"
  | "operacao"
  | "transmissao";

const tabs: Array<{ value: Tab; label: string; icon: typeof Gavel }> = [
  { value: "operacao", label: "Operação", icon: MonitorPlay },
  { value: "resumo", label: "Resumo", icon: Gavel },
  { value: "dados", label: "Dados do leilão", icon: Settings2 },
  { value: "lotes", label: "Lotes", icon: ListOrdered },
  { value: "lances", label: "Lances e pré-lances", icon: Gavel },
  { value: "participantes", label: "Participantes", icon: ShieldCheck },
  { value: "vendas", label: "Vendas", icon: ShoppingCart },
  { value: "comunicacao", label: "Comunicação", icon: MessageCircle },
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
}: {
  auction: AuctionAdmin;
  lots: AuctionAdminLot[];
  capabilities: AuctionCapabilities;
  engineSnapshot: EngineAuctionSnapshot | null;
  engineError?: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = getTab(params.get("aba") ?? (auction.status === "OPEN" ? "operacao" : "resumo"));

  function changeTab(next: Tab) {
    const query = new URLSearchParams(params.toString());
    query.set("aba", next);
    window.history.pushState(null, "", `${pathname}?${query.toString()}`);
  }

  const workspaceCapabilities = {
    ...capabilities,
    canEdit: capabilities.canEdit && (auction.availableActions?.canEdit ?? true),
    canManageLots:
      capabilities.canManageLots &&
      (auction.availableActions?.canManageLots ?? true),
  };
  const canEditLots =
    capabilities.canManageLots &&
    (auction.availableActions?.canEditLots ?? true);
  const publicLots = lots.filter((lot) => ["OPEN", "SOLD", "CLOSED"].includes(lot.status));
  const hasPreBidSchedule = Boolean(auction.preBidStartsAt || auction.preBidEndsAt);
  const auctionStartMs = auction.startsAt ? new Date(auction.startsAt).getTime() : Number.NaN;
  const agendaReady = auction.mode === "SHOPPING"
    ? Boolean(auction.startsAt && auction.endsAt && new Date(auction.endsAt).getTime() > new Date(auction.startsAt).getTime())
    : auction.mode === "TIMED"
      ? Boolean(auction.startsAt && publicLots.length > 0 && publicLots.every((lot) => lot.closesAt && new Date(lot.closesAt).getTime() > auctionStartMs))
      : Boolean(auction.startsAt && (!hasPreBidSchedule || (auction.preBidStartsAt && auction.preBidEndsAt && auction.pauseHours)));
  const readiness = [
    Boolean(auction.title && auction.category && auction.startsAt),
    agendaReady,
    Boolean(auction.desktopBannerUrl || auction.mobileBannerUrl),
    publicLots.length > 0,
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
              <span className="text-xs text-muted-foreground">{auction.mode === "LIVE" ? "Ao vivo" : auction.mode === "SHOPPING" ? "Mercado" : "Shopping"} · /{auction.slug}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{auction.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Início {formatAuctionDate(auction.startsAt)} · {auction.lotCount} lote(s) · {auction.mode === "SHOPPING" ? "preço fixo" : `incremento ${formatCents(auction.incrementCents)}`}
            </p>
            <AuctionStatusControls auction={auction} capabilities={capabilities} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {workspaceCapabilities.canEdit ? <Link href={`/admin/leiloes/${auction.id}?aba=dados`} onClick={(event) => { event.preventDefault(); changeTab("dados"); }} className="inline-flex min-h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-semibold outline-none transition-[background-color,scale] duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"><Pencil className="size-4" aria-hidden="true" />Editar dados</Link> : null}
          {canEditLots ? <Link href={`/admin/leiloes/${auction.id}?aba=lotes`} onClick={(event) => { event.preventDefault(); changeTab("lotes"); }} className="inline-flex min-h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-semibold outline-none transition-[background-color,scale] duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"><ListOrdered className="size-4" aria-hidden="true" />{auction.availableActions?.canManageLots === false ? "Editar lotes" : "Gerenciar lotes"}</Link> : null}
          {capabilities.canViewReports ? <Link href={`/admin/leiloes/${auction.id}/relatorio`} className="inline-flex min-h-9 items-center gap-2 rounded-md bg-secondary px-3 text-sm font-semibold text-secondary-foreground outline-none transition-[background-color,scale] duration-150 hover:bg-secondary/90 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"><FileBarChart className="size-4" aria-hidden="true" />Ver relatório</Link> : null}
          {capabilities.canDelete && (auction.availableActions?.canDelete ?? true) ? <DeleteAuctionButton auction={auction} /> : null}
        </div>
      </header>

      <nav className="overflow-x-auto pb-1" aria-label="Seções do workspace">
        <div className="flex min-w-max gap-1 rounded-xl border bg-card p-1">
          {tabs.filter((item) => (item.value !== "comunicacao" || capabilities.canNotifyParticipants) && (item.value !== "lances" || capabilities.canViewBids || capabilities.canManageStatus) && (item.value !== "vendas" || (auction.mode === "SHOPPING" && capabilities.canManageStatus))).map(({ value, label, icon: Icon }) => (
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

      <div key={tab} className="management-panel-enter">
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
              {["Nome e início", "Agenda configurada", "Banner adicionado", "Lote visível"].map((label, index) => (
                <li key={label} className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5 text-sm">
                  <span className="flex items-center gap-2">{readiness[index] ? <CheckCircle2 className="size-4 text-secondary" aria-hidden="true" /> : <Circle className="size-4 text-muted-foreground" aria-hidden="true" />}{label}</span>
                  {!readiness[index] ? <button type="button" onClick={() => changeTab(index === 3 ? "lotes" : "dados")} className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring">Corrigir</button> : null}
                </li>
              ))}
            </ul>
          </section>
          <div className="grid overflow-hidden rounded-xl border bg-card sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Formato" value={auction.mode === "LIVE" ? "Leilão ao vivo" : auction.mode === "SHOPPING" ? "Mercado · preço fixo" : "Shopping · tempo determinado"} />
            <Metric label="Início" value={formatAuctionDate(auction.startsAt)} />
            <Metric label={auction.mode === "SHOPPING" ? "Fim do Mercado" : auction.mode === "TIMED" ? "Encerramento" : "Fim da etapa"} value={auction.mode === "TIMED" ? "Configurado por lote" : formatAuctionDate(auction.endsAt)} />
            <Metric label={auction.mode === "SHOPPING" ? "Lotes" : "Lotes e incremento"} value={auction.mode === "SHOPPING" ? String(auction.lotCount) : `${auction.lotCount} · ${formatCents(auction.incrementCents)}`} />
          </div>
          {auction.availableActions?.reasons.publish ? <div className="space-y-2"><div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><p className="font-semibold">Publicação pendente</p><p className="mt-1">{auction.availableActions.reasons.publish.message}</p></div><button type="button" onClick={() => changeTab("dados")} className="text-sm font-medium text-primary underline underline-offset-2">Abrir correção</button></div> : null}
        </div>
      ) : null}
      {tab === "dados" ? <AuctionForm initialData={auction} capabilities={workspaceCapabilities} /> : null}
      {tab === "lotes" ? <AuctionLotsPanel auctionId={auction.id} initialLots={lots} capabilities={workspaceCapabilities} canEditLots={canEditLots} mode={auction.mode} engineLots={engineSnapshot?.lots} /> : null}
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

          <AuctionPendingEligibilityBids auctionId={auction.id} canManageParticipants={capabilities.canManageStatus} />
        </section>
      ) : null}
      {tab === "participantes" ? <AuctionParticipantsPanel auctionId={auction.id} lots={lots} capabilities={capabilities} /> : null}
      {tab === "vendas" && auction.mode === "SHOPPING" && capabilities.canManageStatus ? <AuctionMarketSalesPanel auctionId={auction.id} /> : null}
      {tab === "comunicacao" ? <AuctionCommunicationPanel auctionId={auction.id} canNotify={capabilities.canNotifyParticipants} /> : null}
      {tab === "operacao" ? <AuctionOperationPanel auctionId={auction.id} initialSnapshot={engineSnapshot} capabilities={capabilities} lots={lots} /> : null}
      {engineError && tab === "resumo" ? <p role="status" className="text-sm text-amber-800">{engineError} A operação permite tentar novamente.</p> : null}
      {tab === "transmissao" ? <AuctionBroadcastPanel auctionId={auction.id} canManage={capabilities.canManageStatus} /> : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="border-b p-4 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function AuctionStatusControls({ auction, capabilities }: { auction: AuctionAdmin; capabilities: AuctionCapabilities }) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canPublish = capabilities.canManageStatus && auction.availableActions?.canPublish !== false && auction.status !== "OPEN" && auction.status !== "CLOSED" && auction.status !== "CANCELLED";

  function publish() {
    startTransition(async () => {
      const result = await publishAuctionAction(auction.id);
      setNotice(result.success ? "Leilão publicado." : result.error || "Não foi possível publicar.");
      if (result.success) router.refresh();
    });
  }

  function cancel() {
    if (!window.confirm("Cancelar este leilão? Esta transição não pode ser desfeita.")) return;
    startTransition(async () => {
      const result = await cancelAuctionAction(auction.id);
      setNotice(result.success ? "Leilão cancelado." : result.error || "Não foi possível cancelar.");
      if (result.success) router.refresh();
    });
  }

  return <div className="mt-3 flex flex-wrap items-center gap-2">{canPublish ? <button type="button" onClick={publish} disabled={pending} className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground outline-none transition-[background-color,scale] duration-150 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] disabled:opacity-50"><CheckCircle2 className="size-4" aria-hidden="true" />{pending ? "Publicando…" : "Publicar"}</button> : null}{capabilities.canManageStatus && auction.availableActions?.canCancel !== false && auction.status !== "CANCELLED" && auction.status !== "CLOSED" ? <button type="button" onClick={cancel} disabled={pending} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-destructive/30 px-3 text-sm font-semibold text-destructive outline-none transition-[background-color,scale] duration-150 hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/40 active:scale-[0.96] disabled:opacity-50"><XCircle className="size-4" aria-hidden="true" />Cancelar</button> : null}{notice ? <span role="status" className="text-xs font-semibold text-muted-foreground">{notice}</span> : null}</div>;
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
