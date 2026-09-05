"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Save } from "lucide-react";
import { BookBuyerForm } from "./BookBuyerForm";
import { updateAuctionReportLotCompletionAction } from "@/hooks/actions/auctionActions";
import type { AuctionReportCompleteness, AuctionReportMissingInfo, AuctionReportBuyerDetail } from "@/types/auction-report";


type CompletionLot = {
  id: string;
  number: number;
  title: string;
  sellerName: string;
  quantity: number;
  quantityProvided: boolean;
  winnerName: string | null;
  details?: unknown;
  missing: AuctionReportMissingInfo[];
};

function LotCompletionForm({ auctionId, lot }: { auctionId: string; lot: CompletionLot }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [seller, setSeller] = useState(lot.sellerName === "Não informado" ? "" : lot.sellerName);
  const [quantity, setQuantity] = useState(lot.quantityProvided ? String(lot.quantity) : "");
  const [message, setMessage] = useState<string | null>(null);

  function save() {
    setMessage(null);
    if (!seller.trim()) {
      setMessage("Informe o vendedor do lote.");
      return;
    }
    const parsedQuantity = Number(quantity.trim());
    if (lot.missing.some((item) => item.code === "LOT_QUANTITY") && (!Number.isSafeInteger(parsedQuantity) || parsedQuantity < 1)) {
      setMessage("Informe uma quantidade inteira maior que zero.");
      return;
    }
    startTransition(async () => {
      const result = await updateAuctionReportLotCompletionAction(auctionId, lot.id, {
        sellerName: seller.trim(),
        ...(Number.isSafeInteger(parsedQuantity) && parsedQuantity > 0 ? { quantity: parsedQuantity } : {}),
      });
      if (!result.success) {
        setMessage(result.error || "Não foi possível salvar os dados do lote.");
        return;
      }
      setMessage("Dados salvos. O relatório será atualizado.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold">Lote {lot.number} · {lot.title}</p>
          <p className="mt-1 text-xs text-slate-700">Preencha os campos abaixo para liberar o book.</p>
        </div>
        <button type="button" onClick={save} disabled={isPending} className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#075b3e] px-3 text-xs font-bold text-white transition-[background-color,scale] hover:bg-[#064d35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24] active:scale-[0.96] disabled:opacity-50">
          <Save className="size-3.5" aria-hidden="true" />{isPending ? "Salvando…" : "Salvar dados do lote"}
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-slate-700">Vendedor<input value={seller} onChange={(event) => setSeller(event.target.value)} className="management-field mt-1" placeholder="Nome do vendedor" /></label>
        <label className="text-xs font-semibold text-slate-700">Quantidade<input value={quantity} onChange={(event) => setQuantity(event.target.value)} className="management-field mt-1" inputMode="numeric" placeholder="Ex.: 1" /></label>
        <div className="text-xs font-semibold">Comprador identificado<p className="mt-2 text-sm">{lot.winnerName || "Aguardando identificação pelo histórico"}</p></div>
      </div>
      {message ? <p className={`mt-2 text-xs ${message.startsWith("Dados") ? "text-emerald-700" : "text-red-700"}`}>{message}</p> : null}
    </div>
  );
}

export function AuctionReportCompleteness({
  auctionId,
  completeness,
  lots,
  buyers,
}: {
  auctionId: string;
  completeness: AuctionReportCompleteness;
  lots: CompletionLot[];
  buyers: AuctionReportBuyerDetail[];
}) {
  if (completeness.missing.length === 0) {
    return <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 print:hidden"><CheckCircle2 className="size-4" aria-hidden="true" />Book pronto para geração. Todos os campos essenciais estão preenchidos.</div>;
  }

  const required = completeness.missing.filter((item) => item.severity === "REQUIRED");
  const recommended = completeness.missing.filter((item) => item.severity === "RECOMMENDED");

  return (
    <section className="space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 print:hidden">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
        <div><h2 className="font-bold">Complete as informações antes de gerar o book</h2><p className="mt-1 text-sm">{required.length ? `${required.length} campo(s) obrigatório(s) impedem o PDF final.` : "Os campos essenciais estão prontos."}{recommended.length ? ` Ainda há ${recommended.length} recomendação(ões) para enriquecer as fichas.` : ""}</p></div>
      </div>
      {required.length ? <div className="rounded-lg border border-amber-200 bg-white p-3"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Pendências obrigatórias</p><ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">{required.map((item) => <li key={`${item.code}-${item.lotId || item.participantName || "auction"}`}>• {item.label}</li>)}</ul></div> : null}
      {lots.length ? <div className="space-y-3"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Preenchimento rápido dos lotes</p>{lots.map((lot) => <LotCompletionForm key={lot.id} auctionId={auctionId} lot={lot} />)}</div> : null}
      {buyers.map((buyer) => <BookBuyerForm key={`${buyer.participantId || buyer.name}-${JSON.stringify(buyer.address)}-${buyer.document}`} auctionId={auctionId} buyer={buyer} />)}
    </section>
  );
}

export type { CompletionLot };
