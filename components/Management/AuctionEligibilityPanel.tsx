"use client";

import { useState, useTransition } from "react";
import { Loader2, Search, ShieldCheck } from "lucide-react";
import { searchAuctionParticipantsAction, setAuctionParticipantEligibilityAction } from "@/hooks/actions/auctionEngineActions";
import type { AuctionParticipantSearchResult } from "@/lib/auctions/engine-types";
import { Button } from "@/components/ui/button";

export function AuctionEligibilityPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AuctionParticipantSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function search(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    startTransition(async () => {
      setError(""); setNotice("");
      const result = await searchAuctionParticipantsAction(query.trim());
      setResults(result.data ?? []); setSearched(true);
      if (!result.success) setError(result.error || "Não foi possível pesquisar.");
    });
  }
  function change(participant: AuctionParticipantSearchResult) {
    if (participant.enabled && !window.confirm(`Bloquear ${participant.displayName} em todos os leilões?`)) return;
    startTransition(async () => {
      setError(""); setNotice("");
      const result = await setAuctionParticipantEligibilityAction(participant.id, !participant.enabled);
      if (!result.success) { setError(result.error || "Não foi possível atualizar a habilitação."); return; }
      setResults((current) => current.map((item) => item.id === participant.id ? { ...item, enabled: !item.enabled, ...result.data } : item));
      setNotice(`${participant.displayName}: ${participant.enabled ? "bloqueio" : "habilitação"} aplicado a todos os leilões.`);
      window.dispatchEvent(new Event("auction-participants-updated"));
    });
  }
  return <section className="space-y-5" aria-labelledby="eligibility-title" aria-busy={pending}>
    <header><h1 id="eligibility-title" className="flex items-center gap-3 text-2xl font-bold"><ShieldCheck className="size-6 text-secondary" />Habilitações globais</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Gerencie quem pode participar dos leilões. A habilitação vale para toda a plataforma; não é necessário abrir um leilão.</p></header>
    <form onSubmit={search} className="rounded-xl border bg-card p-5"><label htmlFor="eligibility-search" className="text-sm font-semibold">Buscar participante</label><div className="mt-2 flex flex-wrap gap-2"><input id="eligibility-search" className="management-field min-w-0 flex-1 basis-48" value={query} onChange={(event) => { setQuery(event.target.value); setSearched(false); setResults([]); }} placeholder="Nome, e-mail, CPF ou CNPJ" disabled={pending} /><Button disabled={pending || query.trim().length < 2}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}Pesquisar</Button></div><p className="mt-2 text-xs text-muted-foreground">Digite pelo menos 2 caracteres. Refine a busca para localizar outros participantes.</p></form>
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
    {notice ? <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p> : null}
    {searched && !error && !results.length ? <p role="status" className="p-5 text-sm text-muted-foreground">Nenhum participante encontrado. Tente outro nome ou documento.</p> : null}
    <div className="divide-y rounded-xl border bg-card empty:hidden">{results.map((participant) => <article key={participant.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="min-w-0"><h2 className="font-semibold break-words">{participant.displayName}</h2><p className="mt-1 break-all text-sm text-muted-foreground">{participant.email || participant.maskedDocument || "Cadastro rápido"}</p><p className="mt-2 text-xs font-semibold">{participant.participantType === "QUICK" ? "Cadastro rápido · apenas lances assistidos" : participant.enabled ? "Habilitado em todos os leilões" : "Aguardando habilitação ou bloqueado"}</p></div>{participant.participantType === "USER" ? <Button variant={participant.enabled ? "outline" : "default"} disabled={pending} onClick={() => change(participant)}>{participant.enabled ? "Bloquear globalmente" : "Habilitar globalmente"}</Button> : null}</article>)}</div>
  </section>;
}
