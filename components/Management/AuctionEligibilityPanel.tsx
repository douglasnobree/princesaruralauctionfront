"use client";

import { useState, useTransition } from "react";
import { Loader2, Search, ShieldCheck } from "lucide-react";
import { getEnabledAuctionParticipantsAction, searchAuctionParticipantsAction, setAuctionParticipantEligibilityAction } from "@/hooks/actions/auctionEngineActions";
import type { AuctionEnabledParticipantsPage, AuctionParticipantSearchResult } from "@/lib/auctions/engine-types";
import { Button } from "@/components/ui/button";

export function AuctionEligibilityPanel({ initialPage, initialError }: { initialPage?: AuctionEnabledParticipantsPage; initialError?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AuctionParticipantSearchResult[]>(initialPage?.items ?? []);
  const [nextCursor, setNextCursor] = useState(initialPage?.nextCursor ?? null);
  const [searched, setSearched] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [pending, startTransition] = useTransition();
  function loadEnabled(append = false) {
    startTransition(async () => {
      setError(""); setNotice("");
      const result = await getEnabledAuctionParticipantsAction(append ? nextCursor ?? undefined : undefined);
      if (!result.success || !result.data) { setError(result.error || "Não foi possível carregar os usuários habilitados."); return; }
      const page = result.data;
      setResults((current) => append ? [...new Map([...current, ...page.items].map((item) => [item.id, item])).values()] : page.items);
      setNextCursor(page.nextCursor); setSearched(false);
      if (!append) setQuery("");
    });
  }
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
      setResults((current) => current.map((item) => item.id === participant.id ? { ...item, enabled: !item.enabled, ...result.data } : item).filter((item) => searched || item.enabled));
      setNotice(`${participant.displayName}: ${participant.enabled ? "bloqueio" : "habilitação"} aplicado a todos os leilões.`);
      window.dispatchEvent(new Event("auction-participants-updated"));
    });
  }
  return <section className="space-y-5" aria-labelledby="eligibility-title" aria-busy={pending}>
    <header><h1 id="eligibility-title" className="flex items-center gap-3 text-2xl font-bold"><ShieldCheck className="size-6 text-secondary" />Habilitações globais</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Gerencie quem pode participar dos leilões. A habilitação vale para toda a plataforma; não é necessário abrir um leilão.</p></header>
    <form onSubmit={search} className="rounded-xl border bg-card p-5"><label htmlFor="eligibility-search" className="text-sm font-semibold">Buscar participante</label><div className="mt-2 flex flex-wrap gap-2"><input id="eligibility-search" className="management-field min-w-0 flex-1 basis-48" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, e-mail, CPF ou CNPJ" disabled={pending} /><Button disabled={pending || query.trim().length < 2}><Search className="size-4" />Pesquisar</Button>{searched ? <Button type="button" variant="outline" disabled={pending} onClick={() => loadEnabled()}>Ver habilitados</Button> : null}</div><p className="mt-2 text-xs text-muted-foreground">Digite pelo menos 2 caracteres para buscar entre todos os participantes, incluindo os ainda não habilitados.</p></form>
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
    {notice ? <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p> : null}
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{searched ? "Resultado da pesquisa" : "Usuários habilitados globalmente"}</h2><Button type="button" variant="outline" disabled={pending} onClick={() => loadEnabled()}>Atualizar habilitados</Button></div>
    {pending ? <p role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Atualizando participantes…</p> : null}
    {!searched && !error && !pending && !nextCursor && !results.length ? <p role="status" className="p-5 text-sm text-muted-foreground">Nenhum usuário habilitado globalmente. Use a pesquisa para localizar e habilitar um participante.</p> : null}
    {searched && !error && !results.length ? <p role="status" className="p-5 text-sm text-muted-foreground">Nenhum participante encontrado. Tente outro nome ou documento.</p> : null}
    <div className="divide-y rounded-xl border bg-card empty:hidden">{results.map((participant) => <article key={participant.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="min-w-0"><h3 className="font-semibold break-words">{participant.displayName}</h3><p className="mt-1 break-all text-sm text-muted-foreground">{participant.email || participant.maskedDocument || "Cadastro rápido"}</p><p className="mt-2 text-xs font-semibold">{participant.participantType === "QUICK" ? "Cadastro rápido · apenas lances assistidos" : participant.enabled ? "Habilitado em todos os leilões" : "Aguardando habilitação ou bloqueado"}</p></div>{participant.participantType === "USER" ? <Button variant={participant.enabled ? "outline" : "default"} disabled={pending} onClick={() => change(participant)}>{participant.enabled ? "Bloquear globalmente" : "Habilitar globalmente"}</Button> : null}</article>)}</div>
    {!searched && nextCursor ? <Button type="button" variant="outline" disabled={pending} onClick={() => loadEnabled(true)}>Carregar mais habilitados</Button> : null}
  </section>;
}
