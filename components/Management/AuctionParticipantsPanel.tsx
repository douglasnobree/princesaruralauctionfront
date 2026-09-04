"use client";

import { AlertTriangle, CheckCircle2, MessageCircle, RefreshCw, Search, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  listAuctionRegistrationsAction,
  searchAuctionParticipantsAction,
  setAuctionParticipantEligibilityAction,
  setAuctionRegistrationEnabledAction,
} from "@/hooks/actions/auctionEngineActions";
import { sendAuctionWhatsAppMessageAction } from "@/hooks/actions/auctionActions";
import type { AuctionCapabilities } from "@/components/Management/capabilities";
import type { AuctionParticipantSearchResult, EngineAuctionRegistration } from "@/lib/auctions/engine-types";
import type { AuctionAdminLot } from "@/types/auction-admin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function AuctionParticipantsPanel({ auctionId, lots, capabilities }: { auctionId: string; lots: AuctionAdminLot[]; capabilities: AuctionCapabilities }) {
  const [registrations, setRegistrations] = useState<EngineAuctionRegistration[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<AuctionParticipantSearchResult[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [messageParticipant, setMessageParticipant] = useState<EngineAuctionRegistration | null>(null);
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
          <div className="hidden grid-cols-[1fr_10rem_18rem] gap-3 bg-[#fbfdfb] px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500 sm:grid"><span>Participante</span><span>Status</span><span>Ações</span></div>
          {!canManage ? <p className="px-4 py-8 text-sm text-slate-600">A consulta de inscrições exige a permissão de gestão do status.</p> : registrations.length === 0 ? <p className="px-4 py-8 text-sm text-slate-600">Nenhuma inscrição encontrada.</p> : <div className="divide-y divide-[#e9efeb]">{registrations.map((registration) => <div key={registration.registrationId} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_10rem_18rem] sm:items-center"><div><p className="text-sm font-semibold">{registration.displayName || registration.email || registration.userId}</p><p className="mt-1 text-xs text-slate-500">{registration.email || registration.maskedPhone || "Contato protegido"}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${registration.enabled === false || registration.status === "SUSPENDED" ? "bg-red-50 text-red-700" : "bg-[#e8f4ee] text-[#075b3e]"}`}>{registration.enabled === false || registration.status === "SUSPENDED" ? "Bloqueado" : registration.status}</span><div className="flex flex-wrap gap-2"><button type="button" onClick={() => runRegistration(registration, registration.enabled === false)} disabled={isPending} className="inline-flex min-h-9 w-fit items-center gap-2 rounded-lg border border-[#dfe8e2] px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{registration.enabled === false ? <><CheckCircle2 className="size-3.5" aria-hidden="true" />Habilitar</> : <><UserX className="size-3.5" aria-hidden="true" />Bloquear</>}</button>{capabilities.canNotifyParticipants ? <button type="button" onClick={() => setMessageParticipant(registration)} disabled={isPending || registration.hasWhatsApp !== true} title={registration.hasWhatsApp ? "Enviar mensagem" : "Participante sem telefone válido"} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#e8f4ee] px-3 text-xs font-semibold text-[#075b3e] hover:bg-[#d5ecdf] disabled:opacity-50"><MessageCircle className="size-3.5" />Enviar WhatsApp</button> : null}</div></div>)}</div>}
        </div>
      </section>

      <section className="rounded-2xl border border-[#dfe8e2] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2"><Search className="size-5 text-[#08734e]" aria-hidden="true" /><h3 className="font-semibold">Elegibilidade global</h3></div>
        <p className="mt-1 text-sm text-slate-600">Pesquise usuários para revisar a habilitação global usada pelo motor.</p>
        <div className="mt-4 flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} disabled={!canManage} placeholder="Nome ou e-mail" className="admin-field min-w-0 flex-1" /><button type="button" onClick={find} disabled={!canManage || isPending || search.trim().length < 2} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0d3427] px-3 text-sm font-semibold text-white hover:bg-[#075b3e] disabled:opacity-50"><Search className="size-4" aria-hidden="true" />Pesquisar</button></div>
        {results.length > 0 ? <div className="mt-4 divide-y divide-[#e9efeb] rounded-xl border border-[#e9efeb]">{results.map((participant) => <div key={participant.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><p className="text-sm font-semibold">{participant.displayName}</p><p className="text-xs text-slate-500">{participant.participantType === "QUICK" ? `Cadastro rápido · ${participant.maskedDocument ?? "CPF/CNPJ protegido"}` : participant.email}</p></div>{participant.participantType === "QUICK" ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Apenas lance assistido</span> : <button type="button" onClick={() => runGlobal(participant, !participant.enabled)} disabled={!canManage || isPending} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${participant.enabled ? "border border-red-200 text-red-700 hover:bg-red-50" : "bg-[#e8f4ee] text-[#075b3e] hover:bg-[#d5ecdf]"} disabled:opacity-50`}>{participant.enabled ? "Bloquear globalmente" : "Habilitar globalmente"}</button>}</div>)}</div> : null}
      </section>
      <ManualWhatsAppDialog key={messageParticipant?.registrationId ?? "closed"} auctionId={auctionId} lots={lots} participant={messageParticipant} onOpenChange={(open) => { if (!open) setMessageParticipant(null); }} onSent={(message) => setNotice(message)} />
    </section>
  );
}

function ManualWhatsAppDialog({ auctionId, lots, participant, onOpenChange, onSent }: { auctionId: string; lots: AuctionAdminLot[]; participant: EngineAuctionRegistration | null; onOpenChange: (open: boolean) => void; onSent: (message: string) => void }) {
  const [text, setText] = useState(() => participant ? `Olá, ${participant.displayName || "participante"}! Entramos em contato sobre sua participação no leilão.` : "");
  const [lotId, setLotId] = useState("");
  const [override, setOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const needsOverride = participant?.whatsappOptIn !== true;

  function applyTemplate(template: string) {
    const lot = lots.find((item) => item.id === lotId);
    const name = participant?.displayName || "participante";
    if (template === "lot") setText(`Olá, ${name}! Temos uma atualização sobre o lote ${lot ? `${lot.number} — ${lot.title}` : "selecionado"}.`);
    else if (template === "documents") setText(`Olá, ${name}! A equipe Princesa Rural precisa falar com você sobre a documentação do leilão.`);
    else setText(`Olá, ${name}! Entramos em contato sobre sua participação no leilão.`);
  }

  function send() {
    if (!participant) return;
    if (needsOverride && !override) { setError("Confirme explicitamente o envio sem consentimento."); return; }
    startTransition(async () => {
      const result = await sendAuctionWhatsAppMessageAction(auctionId, participant.userId, { text, allowWithoutConsent: needsOverride && override, ...(lotId ? { lotId } : {}) });
      if (!result.success) { setError(result.error || "Não foi possível enviar a mensagem."); return; }
      onSent(result.data?.status === "SENT" ? "Mensagem enviada e auditada." : `Mensagem registrada com status ${result.data?.status ?? "PENDING"}.`);
      onOpenChange(false);
    });
  }

  return <Dialog open={Boolean(participant)} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Enviar WhatsApp</DialogTitle><DialogDescription>Mensagem para {participant?.displayName || "participante"} · {participant?.maskedPhone ?? "telefone protegido"}. O texto final será guardado no histórico.</DialogDescription></DialogHeader><div className="space-y-4"><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-semibold">Modelo rápido<select className="admin-field mt-1" defaultValue="general" onChange={(event) => applyTemplate(event.target.value)}><option value="general">Contato geral</option><option value="lot">Atualização de lote</option><option value="documents">Documentação</option></select></label><label className="text-xs font-semibold">Lote (opcional)<select className="admin-field mt-1" value={lotId} onChange={(event) => setLotId(event.target.value)}><option value="">Nenhum lote</option>{lots.map((lot) => <option key={lot.id} value={lot.id}>Lote {lot.number} — {lot.title}</option>)}</select></label></div><label className="block text-xs font-semibold">Mensagem<textarea className="admin-field mt-1 min-h-36 resize-y py-3" maxLength={4096} value={text} onChange={(event) => setText(event.target.value)} /></label><p className="text-right text-xs text-muted-foreground">{text.length}/4.096</p>{needsOverride ? <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span><span className="block font-semibold">Participante sem consentimento ativo</span><span className="mt-1 block text-xs leading-5">O envio manual pode ignorar somente o consentimento. Marque para confirmar; telefone ausente ou inválido continua bloqueado.</span><span className="mt-2 flex items-center gap-2"><input type="checkbox" checked={override} onChange={(event) => setOverride(event.target.checked)} />Confirmo o envio sem consentimento</span></span></label> : null}{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}</div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancelar</Button><Button type="button" onClick={send} disabled={pending || !text.trim() || text.length > 4096}>{pending ? "Enviando…" : "Enviar WhatsApp"}</Button></DialogFooter></DialogContent></Dialog>;
}
