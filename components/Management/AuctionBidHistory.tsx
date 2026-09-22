"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { deleteManagerBidAction, updateManagerBidAction } from "@/hooks/actions/auctionEngineActions";
import { managerRead } from "@/lib/auctions/manager-read";
import { parseManagementAmount } from "@/lib/auctions/management-input";
import { useVisiblePoll } from "@/hooks/use-visible-poll";
import type { EngineBidHistoryItem, EngineBidHistoryPage, EngineLot } from "@/lib/auctions/engine-types";
import { formatEngineBrlCents } from "@/lib/auctions/engine-formatters";
import { Button } from "@/components/ui/button";

export function AuctionBidHistory({ auctionId, lot, canManage, onChanged }: { auctionId: string; lot: EngineLot; canManage: boolean; onChanged: () => void }) {
  const [page, setPage] = useState<EngineBidHistoryPage | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<{ bid: EngineBidHistoryItem; action: "edit" | "delete"; version: string } | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  async function load(signal?: AbortSignal, cursor?: string) {
    try {
      const query = new URLSearchParams({ limit: "50", ...(cursor ? { beforeSequence: cursor } : {}) });
      const result = await managerRead<EngineBidHistoryPage>(`manager/auctions/${encodeURIComponent(auctionId)}/lots/${encodeURIComponent(lot.externalId)}/bids?${query}`, signal);
      if (signal?.aborted) return;
      setPage((current) => cursor ? { ...result, items: [...(current?.items ?? []), ...result.items] } : result);
      setError("");
    } catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os lances."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }
  useVisiblePoll(async (signal) => { if (!editing && !loading && (!page || page.items.length <= 50)) await load(signal); }, 5000);
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || reason.trim().length < 3) return;
    const amountCents = parseManagementAmount(amount);
    if (editing.action === "edit" && !amountCents) { setError("Informe um valor válido, maior que zero."); return; }
    startTransition(async () => {
      const input = { reason: reason.trim(), expectedVersion: editing.version };
      const result = editing.action === "edit" ? await updateManagerBidAction(editing.bid.id, { ...input, amountCents: amountCents! }) : await deleteManagerBidAction(editing.bid.id, input);
      if (!result.success) { setError(result.error || "Não foi possível alterar o lance. Atualize o histórico antes de tentar novamente."); return; }
      setNotice(editing.action === "edit" ? "Lance corrigido." : "Lance anulado.");
      setEditing(null); setReason(""); onChanged(); await load();
    });
  }
  return <section className="space-y-4 rounded-xl border bg-card p-5" aria-label="Histórico de lances">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Histórico · lote {lot.lotNumber}</h3><Button variant="outline" disabled={pending || loading} onClick={() => { setLoading(true); void load(); }}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Atualizar lances</Button></div>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}{notice ? <p role="status" className="text-sm text-secondary">{notice}</p> : null}
    {!page && !error ? <p role="status" className="management-skeleton p-4">Carregando histórico…</p> : null}
    {page?.items.length === 0 ? <p className="text-sm text-muted-foreground">Este lote ainda não tem lances.</p> : null}
    {editing ? <form onSubmit={save} className="space-y-3 rounded-lg bg-muted/50 p-4"><h4 className="font-semibold">{editing.action === "edit" ? "Corrigir lance" : "Anular lance"} de {editing.bid.bidderAlias}</h4>{editing.action === "edit" ? <label className="block text-sm">Valor (R$)<input className="admin-field" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required disabled={pending} /></label> : null}<label className="block text-sm">Justificativa<input className="admin-field" value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={500} required disabled={pending} /></label><div className="flex gap-2"><Button disabled={pending || reason.trim().length < 3}>{pending ? "Salvando…" : "Confirmar alteração"}</Button><Button type="button" variant="outline" disabled={pending} onClick={() => setEditing(null)}>Cancelar</Button></div></form> : null}
    <div className="divide-y">{page?.items.map((bid) => <article key={bid.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{bid.bidderAlias} · <span className="tabular-nums">{formatEngineBrlCents(bid.amountCents)}</span></p><p className="mt-1 text-xs text-muted-foreground">{bid.status === "VOIDED" ? "Anulado" : "Confirmado"} · {new Date(bid.acceptedAt).toLocaleString("pt-BR")} · {({ ONLINE: "Online", FLOOR: "Piso", PHONE: "Telefone", PROXY: "Automático" })[bid.origin]}</p></div>{canManage ? <div className="flex gap-2">{(["edit", "delete"] as const).filter((action) => action === "edit" ? bid.management?.canEdit : bid.management?.canDelete).map((action) => <Button key={action} variant="outline" size="sm" disabled={pending} onClick={() => { setEditing({ bid, action, version: lot.version }); setAmount((Number(bid.management?.proxyMaxBidCents ?? bid.amountCents) / 100).toFixed(2).replace(".", ",")); setReason(""); setError(""); }}>{action === "edit" ? "Corrigir" : "Anular"}</Button>)}</div> : null}</article>)}</div>
    {page?.hasMore && page.nextBeforeSequence ? <Button variant="outline" disabled={loading || pending} onClick={() => { setLoading(true); void load(undefined, page.nextBeforeSequence!); }}>Carregar lances anteriores</Button> : null}
  </section>;
}
