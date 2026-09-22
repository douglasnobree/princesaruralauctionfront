"use client";

import { AlertTriangle, CheckCircle2, MessageCircle, RefreshCw, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  listAuctionRegistrationsAction,
  setAuctionRegistrationEnabledAction,
} from "@/hooks/actions/auctionEngineActions";
import { sendAuctionWhatsAppMessageAction } from "@/hooks/actions/auctionActions";
import type { AuctionCapabilities } from "@/components/Management/capabilities";
import type { EngineAuctionRegistration } from "@/lib/auctions/engine-types";
import type { AuctionAdminLot } from "@/types/auction-admin";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function AuctionParticipantsPanel({ auctionId, lots, capabilities }: { auctionId: string; lots: AuctionAdminLot[]; capabilities: AuctionCapabilities }) {
  const [registrations, setRegistrations] = useState<EngineAuctionRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [messageParticipant, setMessageParticipant] = useState<EngineAuctionRegistration | null>(null);
  const [isPending, startTransition] = useTransition();
  const canManage = capabilities.canManageStatus;

  const load = useCallback(async (cursor?: string) => {
    if (!canManage) return;
    setLoading(true); setLoadError(null);
    const result = await listAuctionRegistrationsAction(auctionId, { limit: "100", ...(cursor ? { cursor } : {}) });
    if (result.success) {
      setRegistrations((current) => cursor ? [...current, ...(result.data?.items ?? [])] : result.data?.items ?? []);
      setNextCursor(result.data?.nextCursor ?? null);
    } else setLoadError(result.error || "Não foi possível carregar os participantes.");
    setLoading(false);
  }, [auctionId, canManage]);

  useEffect(() => {
    if (!canManage) return;
    const timer = window.setTimeout(() => void load(), 0);
    const refresh = () => void load();
    window.addEventListener("auction-participants-updated", refresh);
    return () => { window.clearTimeout(timer); window.removeEventListener("auction-participants-updated", refresh); };
  }, [canManage, load]);

  function runRegistration(registration: EngineAuctionRegistration, enabled: boolean) {
    if (!canManage) return;
    if (!enabled && !window.confirm(`Bloquear ${registration.displayName || "este participante"} em todos os leilões?`)) return;
    startTransition(async () => {
      const result = await setAuctionRegistrationEnabledAction(auctionId, registration.registrationId, enabled);
      setNotice(result.success ? (enabled ? "Participante habilitado globalmente." : "Participante bloqueado globalmente.") : result.error || "Não foi possível atualizar a habilitação.");
      if (result.success && result.data) {
        setRegistrations((current) => current.map((item) => item.registrationId === registration.registrationId ? result.data! : item));
      }
    });
  }

  return (
    <section className="space-y-5" aria-labelledby="participants-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#08734e]"><ShieldCheck className="size-5" aria-hidden="true" /><p className="text-xs font-bold uppercase tracking-[0.16em]">Acesso</p></div>
          <h2 id="participants-title" className="mt-2 text-xl font-bold">Participantes</h2>
          <p className="mt-1 text-sm text-slate-600">Inscritos neste leilão. Habilitar ou bloquear um usuário afeta sua participação em todos os leilões.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={!canManage || isPending || loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe8e2] px-3 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-50"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />Atualizar</button>
      </div>

      {notice ? <p role="status" className="rounded-xl border border-[#dfe8e2] bg-white px-4 py-3 text-sm text-slate-700">{notice}</p> : null}
      {!canManage ? <p className="rounded-xl border border-[#dfe8e2] bg-white px-4 py-3 text-sm text-slate-600">Seu perfil pode consultar o leilão, mas não possui permissão para administrar inscrições ou elegibilidade.</p> : null}

      <section className="rounded-2xl border border-[#dfe8e2] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2"><UserCheck className="size-5 text-[#08734e]" aria-hidden="true" /><h3 className="font-semibold">Inscrições neste leilão</h3></div>
        <div className="mt-4 overflow-hidden rounded-xl border border-[#e9efeb]">
          <div className="hidden grid-cols-[1fr_10rem_18rem] gap-3 bg-[#fbfdfb] px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500 xl:grid"><span>Participante</span><span>Status</span><span>Ações</span></div>
          {!canManage ? <p className="px-4 py-8 text-sm text-slate-600">A consulta de inscrições exige a permissão de gestão do status.</p> : loading && registrations.length === 0 ? <p role="status" className="management-skeleton p-6 text-sm">Carregando participantes…</p> : loadError ? <p role="alert" className="p-6 text-sm text-red-700">{loadError}</p> : registrations.length === 0 ? <p className="px-4 py-8 text-sm text-slate-600">Nenhuma inscrição encontrada.</p> : <div className="divide-y divide-[#e9efeb]">{registrations.map((registration) => <div key={registration.registrationId} className="grid gap-3 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_10rem_18rem] xl:items-center"><div><p className="text-sm font-semibold">{registration.displayName || registration.email || registration.userId}</p><p className="mt-1 text-xs text-slate-500">{registration.email || registration.maskedPhone || "Contato protegido"}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${registration.enabled === false || registration.globallyEnabled === false || registration.status !== "APPROVED" ? "bg-red-50 text-red-700" : "bg-[#e8f4ee] text-[#075b3e]"}`}>{registration.enabled === false || registration.globallyEnabled === false || registration.status !== "APPROVED" ? "Não habilitado" : "Habilitado"}</span><div className="flex flex-wrap gap-2"><button type="button" onClick={() => runRegistration(registration, (registration.enabled === false || registration.globallyEnabled === false || registration.status !== "APPROVED"))} disabled={isPending} className="inline-flex min-h-9 w-fit items-center gap-2 rounded-lg border border-[#dfe8e2] px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{(registration.enabled === false || registration.globallyEnabled === false || registration.status !== "APPROVED") ? <><CheckCircle2 className="size-3.5" aria-hidden="true" />Habilitar globalmente</> : <><UserX className="size-3.5" aria-hidden="true" />Bloquear globalmente</>}</button>{capabilities.canNotifyParticipants ? <button type="button" onClick={() => setMessageParticipant(registration)} disabled={isPending || registration.hasWhatsApp !== true} title={registration.hasWhatsApp ? "Enviar mensagem" : "Participante sem telefone válido"} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#e8f4ee] px-3 text-xs font-semibold text-[#075b3e] hover:bg-[#d5ecdf] disabled:opacity-50"><MessageCircle className="size-3.5" />Enviar WhatsApp</button> : null}</div></div>)}</div>}
        </div>
      </section>

      {nextCursor ? <Button variant="outline" disabled={loading || isPending} onClick={() => void load(nextCursor)}>Carregar mais participantes</Button> : null}
      <Link href="/admin/habilitacoes" className="inline-flex min-h-11 items-center text-sm font-semibold text-secondary underline underline-offset-4">Gerenciar habilitações globais</Link>

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
