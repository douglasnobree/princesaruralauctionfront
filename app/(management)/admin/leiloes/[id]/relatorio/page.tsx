import type { Metadata } from "next";
import Link from "next/link";
import { ReportPrintButton } from "@/components/Management/ReportPrintButton";
import { getAdminAuctionAction, getAdminAuctionReportAction } from "@/hooks/actions/auctionActions";
import { acquisitionSourceLabel } from "@/lib/auctions/acquisition-sources";
import { formatAuctionDate, formatCents, formatLotStatus } from "@/lib/auctions/admin-utils";
import { permissionsToAuctionCapabilities } from "@/components/Management/capabilities";
import { getAuctionManagementAccess } from "@/lib/permissions/server/auction-access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Relatório do leilão" };

function formatReportCents(value: string | null | undefined, currency = "BRL") {
  if (value == null) return "—";
  return formatCents(Number(value), currency);
}

export default async function AuctionReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, permissions } = await getAuctionManagementAccess();
  const capabilities = permissionsToAuctionCapabilities(permissions, session.user.accountType);
  if (!capabilities.canViewReports) {
    return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"><h1 className="font-semibold">Acesso negado</h1><p className="mt-1">Seu perfil não possui a permissão para consultar relatórios.</p></section>;
  }

  const [auction, report] = await Promise.all([getAdminAuctionAction(id), getAdminAuctionReportAction(id)]);
  if (!report.success || !report.data) {
    return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"><h1 className="font-semibold">Relatório indisponível</h1><p className="mt-1">{report.error || "Não foi possível carregar o relatório."}</p></section>;
  }

  const data = report.data;
  const currency = data.auction.currency || "BRL";
  const summaryCards = [
    ["Lotes", String(data.summary.lotCount)],
    ["Vendidos", String(data.summary.soldLots)],
    ["Lances", String(data.summary.totalBids)],
    ["Receita", formatReportCents(data.summary.revenueCents, currency)],
  ] as const;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={`/admin/leiloes/${id}`} className="text-sm font-semibold text-[#075b3e] underline-offset-4 hover:underline">← Voltar ao workspace</Link>
          <h1 className="mt-3 text-3xl font-bold">Relatório do leilão</h1>
          <p className="mt-2 text-sm text-slate-600">{auction.data?.title ?? data.auction.title} · {formatAuctionDate(data.auction.startsAt)}</p>
        </div>
        <ReportPrintButton />
      </div>

      {data.warnings.length > 0 ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{data.warnings.join(" ")}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(([label, value]) => <Metric key={label} label={label} value={value} />)}
      </div>

      <section className="rounded-2xl border border-[#dfe8e2] bg-white p-4 shadow-sm sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#08734e]">Aquisição</p>
          <h2 className="mt-1 text-xl font-bold">Origem dos participantes</h2>
          <p className="mt-1 text-sm text-slate-600">Inscrições e lances oficiais agrupados pela origem registrada no momento da participação.</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead className="border-b border-[#e9efeb] text-xs uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-3 py-3 font-bold">Origem</th><th className="px-3 py-3 font-bold">Participantes</th><th className="px-3 py-3 font-bold">Lances</th><th className="px-3 py-3 text-right font-bold">Receita</th></tr></thead>
            <tbody className="divide-y divide-[#e9efeb]">{data.summary.acquisitionSources.length > 0 ? data.summary.acquisitionSources.map((item) => <tr key={item.source}><td className="px-3 py-3 font-semibold">{acquisitionSourceLabel(item.source)}</td><td className="px-3 py-3 tabular-nums">{item.participantCount}</td><td className="px-3 py-3 tabular-nums">{item.bidCount}</td><td className="px-3 py-3 text-right font-semibold tabular-nums">{formatReportCents(item.revenueCents, currency)}</td></tr>) : <tr><td colSpan={4} className="px-3 py-6 text-slate-500">Nenhuma origem registrada.</td></tr>}</tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#dfe8e2] bg-white shadow-sm">
        <div className="hidden grid-cols-[6rem_1fr_9rem_12rem_9rem] gap-3 border-b border-[#e9efeb] bg-[#fbfdfb] px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500 md:grid"><span>Lote</span><span>Título</span><span>Status</span><span>Vencedor</span><span>Valor</span></div>
        <div className="divide-y divide-[#e9efeb]">{data.lots.map((lot) => <div key={lot.id} className="grid gap-2 px-4 py-4 text-sm md:grid-cols-[6rem_1fr_9rem_12rem_9rem] md:items-center md:gap-3"><span className="font-semibold">Lote {String(lot.number).padStart(2, "0")}</span><span>{lot.title}</span><span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{formatLotStatus(lot.status as Parameters<typeof formatLotStatus>[0]) || lot.status}</span><span className="text-slate-600">{lot.winnerName || "—"}</span><span className="font-semibold tabular-nums">{formatReportCents(lot.currentPriceCents, currency)}</span></div>)}</div>
      </section>

      <section className="rounded-2xl border border-[#dfe8e2] bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-xl font-bold">Lances recentes</h2>
        <div className="mt-4 divide-y divide-[#e9efeb]">{data.recentBids.length > 0 ? data.recentBids.slice(0, 10).map((bid) => <div key={bid.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">Lote {String(bid.lotNumber).padStart(2, "0")} · {bid.bidderAlias}</p><p className="mt-1 text-xs text-slate-500">{acquisitionSourceLabel(bid.acquisitionSource)} · {bid.origin} · {formatAuctionDate(bid.acceptedAt)}</p></div><span className="font-semibold tabular-nums">{formatReportCents(bid.amountCents, currency)}</span></div>) : <p className="py-5 text-sm text-slate-500">Nenhum lance oficial registrado.</p>}</div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#dfe8e2] bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-[#08734e]">{value}</p></div>;
}
