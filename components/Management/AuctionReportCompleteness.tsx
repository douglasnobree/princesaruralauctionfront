"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Save } from "lucide-react";
import { updateAuctionReportLotCompletionAction } from "@/hooks/actions/auctionActions";
import type { AuctionReportCompleteness, AuctionReportMissingInfo } from "@/types/auction-report";

type DetailEntry = { label: string; value: string };

type CompletionLot = {
  id: string;
  number: number;
  title: string;
  details?: unknown;
  missing: AuctionReportMissingInfo[];
};

function entriesFrom(details: unknown): DetailEntry[] {
  if (Array.isArray(details)) {
    return details.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const record = entry as Record<string, unknown>;
      return typeof record.label === "string" && typeof record.value === "string"
        ? [{ label: record.label, value: record.value }]
        : [];
    });
  }
  if (!details || typeof details !== "object") return [];
  return Object.entries(details as Record<string, unknown>).flatMap(([label, value]) =>
    typeof value === "string" ? [{ label, value }] : [],
  );
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function valueFor(details: unknown, labels: string[]) {
  const expected = new Set(labels.map(normalize));
  return entriesFrom(details).find((entry) => expected.has(normalize(entry.label)))?.value || "";
}

function LotCompletionForm({ auctionId, lot }: { auctionId: string; lot: CompletionLot }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [seller, setSeller] = useState(valueFor(lot.details, ["vendedor", "produtor", "proprietario", "seller", "owner"]));
  const [quantity, setQuantity] = useState(valueFor(lot.details, ["quantidade", "qtde", "qtd", "animais", "quantity"]));
  const [buyer, setBuyer] = useState(valueFor(lot.details, ["comprador", "arrematante", "buyer", "winner"]));
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
    if (lot.missing.some((item) => item.code === "LOT_BUYER") && !buyer.trim()) {
      setMessage("Informe o comprador do lote.");
      return;
    }
    startTransition(async () => {
      const result = await updateAuctionReportLotCompletionAction(auctionId, lot.id, {
        sellerName: seller.trim(),
        ...(Number.isSafeInteger(parsedQuantity) && parsedQuantity > 0 ? { quantity: parsedQuantity } : {}),
        ...(buyer.trim() ? { buyerName: buyer.trim() } : {}),
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
        <label className="text-xs font-semibold text-slate-700">Comprador<input value={buyer} onChange={(event) => setBuyer(event.target.value)} className="management-field mt-1" placeholder="Nome do comprador" /></label>
      </div>
      {message ? <p className={`mt-2 text-xs ${message.startsWith("Dados") ? "text-emerald-700" : "text-red-700"}`}>{message}</p> : null}
    </div>
  );
}

export function AuctionReportCompleteness({
  auctionId,
  completeness,
  lots,
}: {
  auctionId: string;
  completeness: AuctionReportCompleteness;
  lots: CompletionLot[];
}) {
  if (completeness.missing.length === 0) {
    return <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 print:hidden"><CheckCircle2 className="size-4" aria-hidden="true" />Book pronto para geração. Todos os campos essenciais estão preenchidos.</div>;
  }

  const required = completeness.missing.filter((item) => item.severity === "REQUIRED");
  const recommended = completeness.missing.filter((item) => item.severity === "RECOMMENDED");
  const participantMissing = recommended.filter((item) => item.action === "PARTICIPANT");

  return (
    <section className="space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 print:hidden">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
        <div><h2 className="font-bold">Complete as informações antes de gerar o book</h2><p className="mt-1 text-sm">{required.length ? `${required.length} campo(s) obrigatório(s) impedem o PDF final.` : "Os campos essenciais estão prontos."}{recommended.length ? ` Ainda há ${recommended.length} recomendação(ões) para enriquecer as fichas.` : ""}</p></div>
      </div>
      {required.length ? <div className="rounded-lg border border-amber-200 bg-white p-3"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Pendências obrigatórias</p><ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">{required.map((item) => <li key={`${item.code}-${item.lotId || item.participantName || "auction"}`}>• {item.label}</li>)}</ul></div> : null}
      {lots.length ? <div className="space-y-3"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Preenchimento rápido dos lotes</p>{lots.map((lot) => <LotCompletionForm key={lot.id} auctionId={auctionId} lot={lot} />)}</div> : null}
      {participantMissing.length ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-3"><div><p className="text-sm font-bold">Dados cadastrais dos compradores</p><p className="mt-1 text-xs text-amber-950">CPF/CNPJ, contato e endereço podem completar as fichas do book.</p></div><Link href={`/admin/leiloes/${auctionId}?aba=participantes`} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#075b3e] px-3 text-xs font-bold text-[#075b3e] hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24]"><ExternalLink className="size-3.5" aria-hidden="true" />Abrir participantes</Link></div> : null}
    </section>
  );
}

export type { CompletionLot };
