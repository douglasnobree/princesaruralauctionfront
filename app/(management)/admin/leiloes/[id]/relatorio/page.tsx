import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ReportPrintButton } from "@/components/Management/ReportPrintButton";
import { AuctionReportCompleteness as AuctionReportCompletenessPanel, type CompletionLot } from "@/components/Management/AuctionReportCompleteness";
import { getAdminAuctionAction, getAdminAuctionReportAction } from "@/hooks/actions/auctionActions";
import { acquisitionSourceLabel } from "@/lib/auctions/acquisition-sources";
import { formatAuctionDate, formatCents } from "@/lib/auctions/admin-utils";
import { permissionsToAuctionCapabilities } from "@/components/Management/capabilities";
import { getAuctionManagementAccess } from "@/lib/permissions/server/auction-access";
import type { AuctionAdmin, AuctionAdminLot } from "@/types/auction-admin";
import type {
  AuctionReport,
  AuctionReportBid,
  AuctionReportBuyerDetail,
  AuctionReportCategorySummary,
  AuctionReportLot,
  AuctionReportRanking,
} from "@/types/auction-report";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Book final do leilão" };

const FALLBACK = "Não informado";

type ReportLotView = AuctionReportLot & {
  sourceLot?: AuctionAdminLot;
  winnerDisplay: string;
  lastBid: AuctionReportBid | null;
};

function text(value: unknown, fallback = FALLBACK) {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function normalizedLabel(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function detailValue(details: unknown, labels: string[]) {
  const expected = new Set(labels.map(normalizedLabel));
  const entries = Array.isArray(details)
    ? details.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const record = entry as Record<string, unknown>;
        return typeof record.label === "string" && typeof record.value === "string"
          ? [{ label: record.label, value: record.value }]
          : [];
      })
    : details && typeof details === "object"
      ? Object.entries(details as Record<string, unknown>).flatMap(([label, value]) =>
          typeof value === "string" ? [{ label, value }] : [],
        )
      : [];
  return entries.find((entry) => expected.has(normalizedLabel(entry.label)))?.value.trim() || null;
}

function quantityFor(lot: AuctionReportLot, sourceLot?: AuctionAdminLot) {
  if (Number.isSafeInteger(lot.quantity) && lot.quantity > 0) return lot.quantity;
  const raw = detailValue(sourceLot?.details, ["quantidade", "qtde", "qtd", "animais", "quantity"]);
  const parsed = raw ? Number(raw.match(/\d+/)?.[0]) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function lastBidFor(lot: AuctionReportLot, reportBids: AuctionReportBid[]) {
  const bids = new Map<string, AuctionReportBid>();
  [...lot.recentBids, ...reportBids.filter((bid) => bid.lotId === lot.id)].forEach((bid) => bids.set(bid.id, bid));
  const list = [...bids.values()];
  return (
    list.filter((bid) => bid.status === "ACTIVE").sort((left, right) => Date.parse(right.acceptedAt) - Date.parse(left.acceptedAt))[0] ||
    null
  );
}

function lotViews(report: AuctionReport, auction?: AuctionAdmin): ReportLotView[] {
  const sourceById = new Map((auction?.lots || []).map((lot) => [lot.id, lot]));
  return report.lots.map((lot) => {
    const sourceLot = sourceById.get(lot.id);
    const lastBid = lastBidFor(lot, report.recentBids);
    const winnerDisplay = text(lot.winnerName, text(lastBid?.bidderAlias));
    return {
      ...lot,
      sourceLot,
      winnerDisplay,
      lastBid,
      sellerName: text(lot.sellerName, text(detailValue(sourceLot?.details, ["vendedor", "produtor", "proprietario", "seller", "owner"]))),
      quantity: quantityFor(lot, sourceLot),
      categoryLabel: text(lot.categoryLabel, text(detailValue(sourceLot?.details, ["categoria", "raca", "raça", "breed", "tipo"]), auction?.category || "Geral")),
      lastBidderName: text(lot.lastBidderName, text(lastBid?.bidderAlias)),
    };
  });
}

function money(value: string | number | null | undefined, currency: string) {
  if (value == null || value === "") return "-";
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? formatCents(amount, currency) : "-";
}

function lotValue(lot: ReportLotView) {
  return lot.winningAmountCents || lot.currentPriceCents || "0";
}

function summaryRows(report: AuctionReport, lots: ReportLotView[]): AuctionReportCategorySummary[] {
  if (report.summary.categorySummaries?.length) return report.summary.categorySummaries;
  const groups = new Map<string, AuctionReportCategorySummary>();
  lots.filter((lot) => lot.status === "SOLD").forEach((lot) => {
    const key = normalizedLabel(lot.categoryLabel);
    const current = groups.get(key) || { description: lot.categoryLabel, lotCount: 0, quantity: 0, totalValueCents: "0", averageValueCents: "0" };
    current.lotCount += 1;
    current.quantity += lot.quantity;
    current.totalValueCents = String(Number(current.totalValueCents) + Number(lotValue(lot)));
    current.averageValueCents = String(Math.floor(Number(current.totalValueCents) / Math.max(1, current.quantity)));
    groups.set(key, current);
  });
  return [...groups.values()];
}

function rankingRows(
  rankings: AuctionReportRanking[] | undefined,
  lots: ReportLotView[],
  kind: "seller" | "buyer",
): AuctionReportRanking[] {
  if (rankings?.length) return rankings;
  const groups = new Map<string, AuctionReportRanking>();
  lots.filter((lot) => lot.status === "SOLD").forEach((lot) => {
    const name = kind === "seller" ? lot.sellerName : lot.winnerDisplay;
    const key = kind === "buyer" && lot.winnerParticipantId ? lot.winnerParticipantId : `${kind}:${normalizedLabel(name)}`;
    const current = groups.get(key) || { position: 0, participantName: name, lotNumbers: [], lotCount: 0, quantity: 0, totalValueCents: "0", averageLotValueCents: "0", averageUnitValueCents: "0" };
    current.lotNumbers.push(lot.number);
    current.lotCount += 1;
    current.quantity += lot.quantity;
    current.totalValueCents = String(Number(current.totalValueCents) + Number(lotValue(lot)));
    current.averageLotValueCents = String(Math.floor(Number(current.totalValueCents) / current.lotCount));
    current.averageUnitValueCents = String(Math.floor(Number(current.totalValueCents) / Math.max(1, current.quantity)));
    groups.set(key, current);
  });
  return [...groups.values()]
    .sort((left, right) => Number(right.totalValueCents) - Number(left.totalValueCents) || left.participantName.localeCompare(right.participantName))
    .map((item, index) => ({ ...item, position: index + 1 }));
}

function buyers(report: AuctionReport, lots: ReportLotView[]): AuctionReportBuyerDetail[] {
  if (report.buyerDetails?.length) return report.buyerDetails;
  return rankingRows(report.summary.buyerRankings, lots, "buyer").map((ranking) => ({
    participantId: null,
    name: ranking.participantName,
    document: null,
    documentType: null,
    phone: null,
    email: null,
    address: null,
    farmName: null,
    farmDocument: null,
    farmState: null,
    farmCity: null,
    lotNumbers: ranking.lotNumbers,
    totalValueCents: ranking.totalValueCents,
  }));
}

function ReportTable({
  headers,
  rows,
  empty = "Nenhum registro encontrado.",
}: {
  headers: string[];
  rows: ReactNode[][];
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-left text-[11px] leading-4 [overflow-wrap:anywhere] print:min-w-0 print:text-[9px]">
        <thead>
          <tr className="bg-[#d7d7d7] text-[10px] uppercase tracking-wide text-slate-700 print:bg-[#d7d7d7]">
            {headers.map((header) => <th key={header} className="border border-slate-500 px-2 py-2 font-bold">{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, rowIndex) => <tr key={rowIndex} className="break-inside-avoid odd:bg-white even:bg-[#fafafa]">{row.map((cell, cellIndex) => <td key={cellIndex} className="border border-slate-400 px-2 py-2 align-top">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="border border-slate-400 px-2 py-4 text-center text-slate-500">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function ReportSection({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return <section className={`report-section break-inside-avoid rounded-xl border border-slate-300 bg-white p-4 shadow-sm print:rounded-none print:border-slate-700 print:p-0 print:shadow-none ${className}`}><div className="mb-3 border-b border-slate-300 pb-2 print:border-slate-700"><h2 className="text-sm font-black uppercase tracking-[0.12em] text-[#075b3e] print:text-black">{title}</h2></div>{children}</section>;
}

function BuyerBlock({ buyer, currency }: { buyer: AuctionReportBuyerDetail; currency: string }) {
  const address = buyer.address ? `${buyer.address.street}, ${buyer.address.number}${buyer.address.complement ? ` - ${buyer.address.complement}` : ""} - ${buyer.address.neighborhood} - ${buyer.address.city}/${buyer.address.state} - CEP ${buyer.address.zipCode}` : "-";
  return <article className="report-buyer break-inside-avoid border border-slate-400"><div className="grid gap-2 bg-[#d7d7d7] px-3 py-2 text-[10px] font-bold uppercase tracking-wide sm:grid-cols-[minmax(0,1fr)_minmax(0,auto)] print:bg-[#d7d7d7]"><span className="min-w-0 break-words">Cliente: {text(buyer.name)}</span><span className="min-w-0 break-words sm:text-right">CPF/CNPJ: {buyer.documentType ? `${buyer.documentType}: ` : ""}{buyer.document || "-"}</span></div><div className="grid gap-0 sm:grid-cols-2"><div className="border-b border-slate-300 p-3 text-[11px] sm:border-r"><p className="font-bold uppercase text-slate-500">Contato</p><p className="mt-1 break-words">{buyer.phone || "-"}{buyer.email ? ` · ${buyer.email}` : ""}</p></div><div className="border-b border-slate-300 p-3 text-[11px]"><p className="font-bold uppercase text-slate-500">Endereço</p><p className="mt-1 break-words">{address}</p></div><div className="border-b border-slate-300 p-3 text-[11px] sm:border-r"><p className="font-bold uppercase text-slate-500">Lotes adquiridos</p><p className="mt-1 break-words">{buyer.lotNumbers.join(", ") || "-"}</p></div><div className="border-b border-slate-300 p-3 text-[11px]"><p className="font-bold uppercase text-slate-500">Total</p><p className="mt-1 font-bold">{money(buyer.totalValueCents, currency)}</p></div></div><div className="grid gap-0 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.5fr)_minmax(0,1fr)]"><div className="min-w-0 p-3 text-[11px] sm:border-r"><p className="font-bold uppercase text-slate-500">Fazenda</p><p className="mt-1 break-words">{buyer.farmName || "-"}</p></div><div className="min-w-0 border-t border-slate-300 p-3 text-[11px] sm:border-r sm:border-t-0"><p className="font-bold uppercase text-slate-500">CNPJ/CPF</p><p className="mt-1 break-words">{buyer.farmDocument || "-"}</p></div><div className="min-w-0 border-t border-slate-300 p-3 text-[11px] sm:border-r sm:border-t-0"><p className="font-bold uppercase text-slate-500">UF</p><p className="mt-1 break-words">{buyer.farmState || "-"}</p></div><div className="min-w-0 border-t border-slate-300 p-3 text-[11px] sm:border-t-0"><p className="font-bold uppercase text-slate-500">Cidade</p><p className="mt-1 break-words">{buyer.farmCity || "-"}</p></div></div></article>;
}

function ReportContent({ report, auction, canComplete }: { report: AuctionReport; auction?: AuctionAdmin; canComplete: boolean }) {
  const currency = report.auction.currency || "BRL";
  const lots = lotViews(report, auction);
  const completeness = report.completeness || { ready: true, requiredCount: 0, recommendedCount: 0, missing: [] };
  const completionLots: CompletionLot[] = lots
    .filter((lot) => completeness.missing.some((item) => item.lotId === lot.id && item.severity === "REQUIRED"))
    .map((lot) => ({
      id: lot.id,
      number: lot.number,
      title: lot.title,
      sellerName: lot.sellerName,
      quantity: lot.quantity,
      quantityProvided: lot.quantityProvided,
      winnerName: lot.winnerName,
      details: lot.sourceLot?.details,
      missing: completeness.missing.filter((item) => item.lotId === lot.id),
    }));
  const soldLots = lots.filter((lot) => lot.status === "SOLD");
  const categories = summaryRows(report, lots);
  const sellers = rankingRows(report.summary.sellerRankings, lots, "seller");
  const buyersRanking = rankingRows(report.summary.buyerRankings, lots, "buyer");
  const buyerDetails = buyers(report, lots);
  const generalQuantity = soldLots.reduce((total, lot) => total + lot.quantity, 0);
  const general = { lotCount: soldLots.length, quantity: generalQuantity, value: report.summary.revenueCents };
  const lastBidRows = lots.map((lot) => [
    <span className="font-bold" key="lot">{lot.number}</span>,
    <span key="title">{lot.title}</span>,
    <span key="winner" className="font-semibold">{lot.winnerDisplay}</span>,
    <span key="bidder">{text(lot.lastBidderName, lot.winnerDisplay)}</span>,
    <span key="date">{lot.lastBidAt ? formatAuctionDate(lot.lastBidAt) : "-"}</span>,
    <span key="value" className="font-semibold tabular-nums">{money(lot.lastBidAmountCents || lotValue(lot), currency)}</span>,
  ]);

  return <>
    <style>{`@page { size: A4; margin: 12mm; } @media print { body { background: white !important; } .report-shell { max-width: none !important; padding: 0 !important; } .report-section { break-inside: avoid; } .report-buyer { break-inside: avoid; } thead { display: table-header-group; } tr { break-inside: avoid; } }`}</style>
    <section className="report-shell mx-auto max-w-[1180px] space-y-5 bg-[#f5f7f5] p-4 text-slate-900 sm:p-6 print:space-y-4 print:bg-white print:p-0">
      <header className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <Link href={`/admin/leiloes/${report.auction.id}`} className="text-sm font-semibold text-[#075b3e] underline-offset-4 hover:underline">← Voltar ao workspace</Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[#f08a24]">Book final</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">{report.auction.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{formatAuctionDate(report.auction.startsAt)} · {report.auction.mode}</p>
        </div>
        <ReportPrintButton downloadHref={`/api/auctions/${encodeURIComponent(report.auction.id)}/report/pdf`} canGenerate={completeness.ready} />
      </header>

      <header className="hidden border-b-2 border-slate-800 pb-3 print:block">
        <div className="flex items-start justify-between"><div><p className="text-lg font-black text-[#075b3e]">PRINCESA <span className="text-[#f08a24]">RURAL</span></p><p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em]">Book final</p><h1 className="mt-1 text-2xl font-black">{report.auction.title}</h1></div><div className="text-right text-[10px] text-slate-600"><p>{formatAuctionDate(report.auction.startsAt)}</p><p>Gerado em {formatAuctionDate(report.generatedAt)}</p></div></div>
      </header>

      {report.warnings.length ? <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:border-slate-400 print:bg-white">{report.warnings.join(" ")}</div> : null}

      <AuctionReportCompletenessPanel auctionId={report.auction.id} completeness={completeness} lots={canComplete ? completionLots : []} buyers={canComplete ? buyerDetails : []} />

      <div className="grid gap-3 sm:grid-cols-4 print:grid-cols-4">
        {[['Lotes', report.summary.lotCount], ['Vendidos', report.summary.soldLots], ['Participantes', report.summary.participantCount], ['Receita', money(report.summary.revenueCents, currency)]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-slate-300 bg-white p-3 shadow-sm print:rounded-none print:border-slate-700 print:shadow-none"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-[#075b3e] print:text-black">{value}</p></div>)}
      </div>

      <ReportSection title="Lotes vendidos">
        <ReportTable headers={["Lote", "Vendedor", "Comprador", "Qtde.", "Valor"]} rows={soldLots.map((lot) => [<span className="font-bold" key="lot">{lot.number}</span>, <span key="seller">{lot.sellerName}</span>, <span key="buyer" className="font-semibold">{lot.winnerDisplay}</span>, <span key="quantity">{lot.quantity}</span>, <span key="value" className="font-semibold tabular-nums">{money(lotValue(lot), currency)}</span>])} empty="Nenhum lote vendido foi encontrado." />
      </ReportSection>

      <ReportSection title="Resumo">
        <ReportTable headers={["Não vendido", "Defendido", "Vendido", "Total"]} rows={[[<span key="unsold">{report.summary.unsoldLots}</span>, <span key="defended">{report.summary.defendedLots || 0}</span>, <span key="sold">{report.summary.soldLots}</span>, <span key="total">{report.summary.lotCount}</span>], [<span key="unsold-value">-</span>, <span key="defended-value">{money(report.summary.defendedValueCents || "0", currency)}</span>, <span key="sold-value">{money(report.summary.revenueCents, currency)}</span>, <span key="total-value">{money(report.summary.currentValueCents, currency)}</span>]]} />
      </ReportSection>

      <ReportSection title="Resumo por categoria">
        <ReportTable headers={["Descrição", "Qtde.", "Valor total", "Média"]} rows={[...categories.map((category) => [<span key="description">{category.description}</span>, <span key="quantity">{category.quantity}</span>, <span key="total">{money(category.totalValueCents, currency)}</span>, <span key="average">{money(category.averageValueCents, currency)}</span>]), [<span className="font-bold" key="general">GERAL</span>, <span className="font-bold" key="general-quantity">{general.quantity}</span>, <span className="font-bold" key="general-value">{money(general.value, currency)}</span>, <span className="font-bold" key="general-average">{money(String(Math.floor(Number(general.value) / Math.max(1, general.quantity))), currency)}</span>], [<span className="font-bold" key="final">RESULTADO FINAL</span>, <span className="font-bold" key="final-quantity">{general.quantity}</span>, <span className="font-bold" key="final-value">{money(general.value, currency)}</span>, <span className="font-bold" key="final-average">{money(String(Math.floor(Number(general.value) / Math.max(1, general.quantity))), currency)}</span>]]} />
      </ReportSection>

      <ReportSection title="Ranking de vendas">
        <ReportTable headers={["Posição", "Vendedor", "Lotes", "Animais", "Total vendas", "Média/lote", "Média/animal"]} rows={sellers.map((item) => [item.position, <span key="name" className="font-semibold">{item.participantName}<br /><span className="font-normal text-slate-500">Lotes: {item.lotNumbers.join(", ")}</span></span>, item.lotCount, item.quantity, money(item.totalValueCents, currency), money(item.averageLotValueCents, currency), money(item.averageUnitValueCents, currency)])} empty="Nenhum vendedor identificado nos lotes vendidos." />
      </ReportSection>

      <ReportSection title="Ranking de compras">
        <ReportTable headers={["Posição", "Comprador", "Lotes", "Animais", "Total compras", "Média/lote", "Média/animal"]} rows={buyersRanking.map((item) => [item.position, <span key="name" className="font-semibold">{item.participantName}<br /><span className="font-normal text-slate-500">Lotes: {item.lotNumbers.join(", ")}</span></span>, item.lotCount, item.quantity, money(item.totalValueCents, currency), money(item.averageLotValueCents, currency), money(item.averageUnitValueCents, currency)])} empty="Nenhum comprador identificado nos lotes vendidos." />
      </ReportSection>

      <ReportSection title="Último lance por lote">
        <ReportTable headers={["Lote", "Descrição", "Vencedor", "Quem deu o último lance", "Data", "Valor"]} rows={lastBidRows} />
      </ReportSection>

      <ReportSection title="Relação de compradores" className="space-y-3">
        {buyerDetails.length ? buyerDetails.map((buyer) => <BuyerBlock key={`${buyer.participantId || buyer.name}-${buyer.lotNumbers.join("-")}`} buyer={buyer} currency={currency} />) : <p className="text-sm text-slate-500">Nenhum comprador identificado.</p>}
      </ReportSection>

      {lots.map((lot) => <ReportSection key={lot.id} title={`Histórico de lances · Lote ${lot.number}`}>
        <ReportTable headers={["Data", "Participante", "Valor", "Canal do lance", "Origem de aquisição", "Situação"]} rows={(lot.bidHistory || lot.recentBids).map((bid) => [formatAuctionDate(bid.acceptedAt), bid.bidderAlias, money(bid.amountCents, currency), ({ ONLINE: "Online", FLOOR: "Presencial", PHONE: "Telefone", PROXY: "Automático" })[bid.origin] || bid.origin, acquisitionSourceLabel(bid.acquisitionSource), bid.status === "VOIDED" ? `Anulado: ${bid.voidReason || "Sem motivo informado"}` : "Válido"])} empty="Nenhum lance disponível para este lote." />
      </ReportSection>)}

      <ReportSection title="Origem dos participantes">
        <ReportTable headers={["Origem", "Participantes", "Lances", "Receita"]} rows={report.summary.acquisitionSources.map((item) => [acquisitionSourceLabel(item.source), item.participantCount, item.bidCount, money(item.revenueCents, currency)])} empty="Nenhuma origem registrada." />
      </ReportSection>

      <p className="pb-3 text-right text-[10px] text-slate-500 print:hidden">Relatório gerado em {formatAuctionDate(report.generatedAt)}.</p>
    </section>
  </>;
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

  return <ReportContent report={report.data} auction={auction.success ? auction.data : undefined} canComplete={capabilities.canManageLots} />;
}
