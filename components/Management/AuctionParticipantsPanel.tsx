"use client";

import { CheckCircle2, RefreshCw, Search, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  listAuctionRegistrationsAction,
  searchAuctionParticipantsAction,
  setAuctionParticipantEligibilityAction,
  setAuctionRegistrationEnabledAction,
} from "@/hooks/actions/auctionEngineActions";
import type { AuctionCapabilities } from "@/components/Management/capabilities";
import type { AuctionParticipantSearchResult, EngineAuctionRegistration } from "@/lib/auctions/engine-types";

export function AuctionParticipantsPanel({ auctionId, capabilities }: { auctionId: string; capabilities: AuctionCapabilities }) {
  const [registrations, setRegistrations] = useState<EngineAuctionRegistration[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<AuctionParticipantSearchResult[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canManage = capabilities.canManageStatus;

  const load = useCallback(async () => {
    if (!canManage) return;
    const result = await listAuctionRegistrationsAction(auctionId, { limit: "100" });
    if (result.success) setRegistrations(result.data?.items ?? []);
    else setNotice(result.error || "Não foi possível carregar os participantes.");
  }, [auctionId, canManage]);

  useEffect(() => {
    if (!canManage) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [canManage, load]);

  function runRegistration(registration: EngineAuctionRegistration, enabled: boolean) {
    if (!canManage) return;
    startTransition(async () => {
      const result = await setAuctionRegistrationEnabledAction(auctionId, registration.registrationId, enabled);
      setNotice(result.success ? (enabled ? "Participante habilitado." : "Participante bloqueado.") : result.error || "Não foi possível atualizar a habilitação.");
      if (result.success && result.data) {
        setRegistrations((current) => current.map((item) => item.registrationId === registration.registrationId ? result.data! : item));
      }
    });
  }

  function find() {
    if (!canManage) return;
    startTransition(async () => {
      const result = await searchAuctionParticipantsAction(search);
      setResults(result.data ?? []);
      if (!result.success) setNotice(result.error || "Não foi possível pesquisar os usuários.");
    });
  }

  function runGlobal(participant: AuctionParticipantSearchResult, enabled: boolean) {
    if (!canManage) return;
    startTransition(async () => {
      const result = await setAuctionParticipantEligibilityAction(participant.id, enabled);
      setNotice(result.success ? "Elegibilidade global atualizada." : result.error || "Não foi possível atualizar a elegibilidade.");
      if (result.success) setResults((current) => current.map((item) => item.id === participant.id ? { ...item, enabled } : item));
    });
  }

  return (
    <section className="space-y-5" aria-labelledby="participants-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#08734e]"><ShieldCheck className="size-5" aria-hidden="true" /><p className="text-xs font-bold uppercase tracking-[0.16em]">Acesso</p></div>
          <h2 id="participants-title" className="mt-2 text-xl font-bold">Participantes</h2>
          <p className="mt-1 text-sm text-slate-600">Acompanhe inscrições e habilite participantes sem alterar o estado do leilão diretamente.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={!canManage || isPending} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe8e2] px-3 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-50"><RefreshCw className="size-4" aria-hidden="true" />Atualizar</button>
      </div>

      {notice ? <p role="status" className="rounded-xl border border-[#dfe8e2] bg-white px-4 py-3 text-sm text-slate-700">{notice}</p> : null}
      {!canManage ? <p className="rounded-xl border border-[#dfe8e2] bg-white px-4 py-3 text-sm text-slate-600">Seu perfil pode consultar o leilão, mas não possui permissão para administrar inscrições ou elegibilidade.</p> : null}

      <section className="rounded-2xl border border-[#dfe8e2] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2"><UserCheck className="size-5 text-[#08734e]" aria-hidden="true" /><h3 className="font-semibold">Inscrições neste leilão</h3></div>
        <div className="mt-4 overflow-hidden rounded-xl border border-[#e9efeb]">
          <div className="hidden grid-cols-[1fr_10rem_10rem] gap-3 bg-[#fbfdfb] px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500 sm:grid"><span>Participante</span><span>Status</span><span>Ação</span></div>
          {!canManage ? <p className="px-4 py-8 text-sm text-slate-600">A consulta de inscrições exige a permissão de gestão do status.</p> : registrations.length === 0 ? <p className="px-4 py-8 text-sm text-slate-600">Nenhuma inscrição encontrada.</p> : <div className="divide-y divide-[#e9efeb]">{registrations.map((registration) => <div key={registration.registrationId} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_10rem_10rem] sm:items-center"><div><p className="text-sm font-semibold">{registration.displayName || registration.email || registration.userId}</p><p className="mt-1 text-xs text-slate-500">{registration.email || registration.userId}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${registration.enabled === false || registration.status === "SUSPENDED" ? "bg-red-50 text-red-700" : "bg-[#e8f4ee] text-[#075b3e]"}`}>{registration.enabled === false || registration.status === "SUSPENDED" ? "Bloqueado" : registration.status}</span><button type="button" onClick={() => runRegistration(registration, registration.enabled === false)} disabled={isPending} className="inline-flex min-h-9 w-fit items-center gap-2 rounded-lg border border-[#dfe8e2] px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{registration.enabled === false ? <><CheckCircle2 className="size-3.5" aria-hidden="true" />Habilitar</> : <><UserX className="size-3.5" aria-hidden="true" />Bloquear</>}</button></div>)}</div>}
        </div>
      </section>

      <section className="rounded-2xl border border-[#dfe8e2] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2"><Search className="size-5 text-[#08734e]" aria-hidden="true" /><h3 className="font-semibold">Elegibilidade global</h3></div>
        <p className="mt-1 text-sm text-slate-600">Pesquise usuários para revisar a habilitação global usada pelo motor.</p>
        <div className="mt-4 flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} disabled={!canManage} placeholder="Nome ou e-mail" className="admin-field min-w-0 flex-1" /><button type="button" onClick={find} disabled={!canManage || isPending || search.trim().length < 2} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0d3427] px-3 text-sm font-semibold text-white hover:bg-[#075b3e] disabled:opacity-50"><Search className="size-4" aria-hidden="true" />Pesquisar</button></div>
        {results.length > 0 ? <div className="mt-4 divide-y divide-[#e9efeb] rounded-xl border border-[#e9efeb]">{results.map((participant) => <div key={participant.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><p className="text-sm font-semibold">{participant.displayName}</p><p className="text-xs text-slate-500">{participant.participantType === "QUICK" ? `Cadastro rápido · ${participant.maskedDocument ?? "CPF/CNPJ protegido"}` : participant.email}</p></div>{participant.participantType === "QUICK" ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Apenas lance assistido</span> : <button type="button" onClick={() => runGlobal(participant, !participant.enabled)} disabled={!canManage || isPending} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${participant.enabled ? "border border-red-200 text-red-700 hover:bg-red-50" : "bg-[#e8f4ee] text-[#075b3e] hover:bg-[#d5ecdf]"} disabled:opacity-50`}>{participant.enabled ? "Bloquear globalmente" : "Habilitar globalmente"}</button>}</div>)}</div> : null}
      </section>
    </section>
  );
}
