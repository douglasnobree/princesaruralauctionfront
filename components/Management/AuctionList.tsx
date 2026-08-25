"use client";

import { CalendarClock, Gavel, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { deleteAuctionAction } from "@/hooks/actions/auctionActions";
import { formatAuctionDate, formatAuctionStatus } from "@/lib/auctions/admin-utils";
import { categoryLabel } from "@/lib/auctions/form-mappers";
import type { AuctionAdmin, AuctionAdminStatus } from "@/types/auction-admin";
import type { AuctionCapabilities } from "@/components/Management/capabilities";
import { AccessDenied } from "@/components/Management/AccessDenied";

const statuses: Array<AuctionAdminStatus | "ALL"> = ["ALL", "DRAFT", "PRE_LAUNCH", "WAITING_OPENING", "OPEN", "CLOSED", "CANCELLED"];

export function AuctionList({ auctions, capabilities, error }: { auctions: AuctionAdmin[]; capabilities: AuctionCapabilities; error?: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AuctionAdminStatus | "ALL">("ALL");
  const [notice, setNotice] = useState(error ?? "");
  const [isPending, startTransition] = useTransition();
  const filtered = useMemo(() => auctions.filter((auction) => (!query.trim() || `${auction.title} ${auction.slug}`.toLowerCase().includes(query.trim().toLowerCase())) && (status === "ALL" || auction.status === status)), [auctions, query, status]);

  if (!capabilities.canView) return <AccessDenied message="Seu perfil não possui a permissão de consulta de leilões." />;

  function removeAuction(auction: AuctionAdmin) {
    if (!capabilities.canDelete || !window.confirm(`Excluir o leilão “${auction.title}”? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const result = await deleteAuctionAction(auction.id);
      setNotice(result.success ? "Leilão excluído." : result.error || "Não foi possível excluir o leilão.");
      if (result.success) window.location.reload();
    });
  }

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 border-b border-[#dfe8e2] pb-6 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-[#08734e]"><Gavel className="size-5" aria-hidden="true" /><p className="text-xs font-bold uppercase tracking-[0.16em]">Operação</p></div><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Leilões</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Prepare dados e lotes, acompanhe o estado oficial e conduza a operação ao vivo em um único espaço.</p></div>{capabilities.canCreate ? <Link href="/admin/leiloes/novo" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#08734e] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#075b3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24] focus-visible:ring-offset-2"><Plus className="size-4" aria-hidden="true" />Novo leilão</Link> : null}</header>
    {notice ? <p role="status" className="rounded-xl border border-[#dfe8e2] bg-white px-4 py-3 text-sm text-slate-700">{notice}</p> : null}
    <section className="flex flex-col gap-3 rounded-2xl border border-[#dfe8e2] bg-white p-4 shadow-sm sm:flex-row"><label className="min-w-0 flex-1 text-xs font-semibold text-slate-600">Buscar<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título ou slug" className="mt-1.5 h-10 w-full rounded-lg border border-[#dfe8e2] bg-white px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24]" /></label><label className="text-xs font-semibold text-slate-600 sm:w-56">Status<select value={status} onChange={(event) => setStatus(event.target.value as AuctionAdminStatus | "ALL")} className="mt-1.5 h-10 w-full rounded-lg border border-[#dfe8e2] bg-white px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24]"><option value="ALL">Todos</option>{(statuses.slice(1) as AuctionAdminStatus[]).map((item) => <option key={item} value={item}>{formatAuctionStatus(item)}</option>)}</select></label></section>
    <section className="overflow-hidden rounded-2xl border border-[#dfe8e2] bg-white shadow-sm" aria-labelledby="auction-list-title"><div className="flex items-center justify-between border-b border-[#dfe8e2] px-4 py-4 sm:px-5"><div><h2 id="auction-list-title" className="font-semibold">Agenda operacional</h2><p className="mt-1 text-xs text-slate-500">{filtered.length} leilão(ões) encontrado(s)</p></div><CalendarClock className="size-5 text-[#08734e]" aria-hidden="true" /></div>{filtered.length === 0 ? <div className="px-5 py-12 text-center text-sm text-slate-600">Nenhum leilão corresponde aos filtros atuais.</div> : <div className="divide-y divide-[#e9efeb]">{filtered.map((auction) => <article key={auction.id} className="flex flex-col gap-4 px-4 py-5 transition-colors hover:bg-[#fbfdfb] sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e8f4ee] px-2.5 py-1 text-xs font-semibold text-[#075b3e]">{formatAuctionStatus(auction.status)}</span><span className="text-xs text-slate-500">{categoryLabel(auction.category)} · {auction.mode}</span></div><h3 className="mt-2 truncate text-base font-bold text-slate-950">{auction.title}</h3><p className="mt-1 text-xs text-slate-500">Início: {formatAuctionDate(auction.startsAt)} · {auction.lotCount} lote(s)</p></div><div className="flex flex-wrap gap-2"><Link href={`/admin/leiloes/${auction.id}`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#0d3427] px-3.5 text-sm font-semibold text-white hover:bg-[#075b3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24] focus-visible:ring-offset-2">Abrir workspace</Link>{capabilities.canDelete && auction.availableActions?.canDelete !== false ? <button type="button" onClick={() => removeAuction(auction)} disabled={isPending} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50" aria-label={`Excluir ${auction.title}`}><Trash2 className="size-4" aria-hidden="true" />Excluir</button> : null}</div></article>)}</div>}</section>
  </div>;
}
