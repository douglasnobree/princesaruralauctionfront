"use client";

import { AlertTriangle, Loader2, MessageCircle, RefreshCw, Settings2 } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { getAuctionWhatsAppMessagesAction, getAuctionWhatsAppSettingsAction, updateAuctionWhatsAppSettingsAction } from "@/hooks/actions/auctionActions";
import type { AuctionWhatsAppMessage, AuctionWhatsAppSettings } from "@/types/auction-whatsapp";

const eventOptions: Array<{ key: keyof Pick<AuctionWhatsAppSettings, "participationApprovedEnabled" | "bidAcceptedEnabled" | "outbidEnabled" | "lotWonEnabled">; label: string; description: string }> = [
  { key: "participationApprovedEnabled", label: "Participação habilitada", description: "Confirma ao participante que ele já pode participar." },
  { key: "bidAcceptedEnabled", label: "Lance aceito", description: "Inclui lance validado, validado mas superado e teto automático aplicado." },
  { key: "outbidEnabled", label: "Lance superado", description: "Avisa o líder anterior quando a liderança muda." },
  { key: "lotWonEnabled", label: "Lote arrematado", description: "Envia somente ao vencedor depois do fechamento." },
];

const statusStyles: Record<string, string> = {
  SENT: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700",
  SKIPPED: "bg-amber-50 text-amber-800",
  PENDING: "bg-sky-50 text-sky-700",
  PROCESSING: "bg-violet-50 text-violet-700",
};

export function AuctionCommunicationPanel({ auctionId, canNotify }: { auctionId: string; canNotify: boolean }) {
  const [settings, setSettings] = useState<AuctionWhatsAppSettings | null>(null);
  const [messages, setMessages] = useState<AuctionWhatsAppMessage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    if (!canNotify) return;
    const [settingsResult, messagesResult] = await Promise.all([getAuctionWhatsAppSettingsAction(auctionId), getAuctionWhatsAppMessagesAction(auctionId)]);
    if (settingsResult.success && settingsResult.data) setSettings(settingsResult.data);
    else setNotice(settingsResult.error || "Não foi possível carregar a configuração.");
    if (messagesResult.success) setMessages(messagesResult.data?.items ?? []);
  }, [auctionId, canNotify]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  function change(input: Partial<AuctionWhatsAppSettings>) {
    startTransition(async () => {
      const result = await updateAuctionWhatsAppSettingsAction(auctionId, input);
      if (result.success && result.data) { setSettings(result.data); setNotice("Configuração salva."); }
      else setNotice(result.error || "Não foi possível salvar.");
    });
  }

  if (!canNotify) return <p className="rounded-xl border bg-card px-4 py-5 text-sm text-muted-foreground">Seu perfil não possui a permissão para notificar participantes.</p>;
  return <section className="space-y-5" aria-labelledby="communication-title">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-primary"><MessageCircle className="size-5" /><p className="text-xs font-bold uppercase tracking-[0.14em]">WhatsApp</p></div><h2 id="communication-title" className="mt-2 text-xl font-bold">Comunicação</h2><p className="mt-1 text-sm text-muted-foreground">Configure os eventos deste leilão e acompanhe cada tentativa sem expor o número completo.</p></div><button type="button" onClick={() => void load()} disabled={pending} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold"><RefreshCw className="size-4" />Atualizar</button></header>
    {notice ? <p role="status" className="rounded-lg border bg-card px-4 py-3 text-sm">{notice}</p> : null}
    {!settings ? <div className="grid min-h-40 place-items-center rounded-xl border bg-card"><Loader2 className="size-6 animate-spin text-primary" /></div> : <>
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><Settings2 className="mt-0.5 size-5 text-primary" /><div><h3 className="font-semibold">Integração e automação</h3><p className="mt-1 text-sm text-muted-foreground">{settings.integration.enabled && settings.integration.configured ? `Evolution API disponível · ${settings.integration.instanceName ?? "instância configurada"}` : "A integração não está disponível neste ambiente. As mensagens ficam auditadas e as tentativas falham sem envio."}</p></div></div><Toggle checked={settings.automationEnabled} disabled={pending} label="Automação geral" onChange={(checked) => change({ automationEnabled: checked })} /></div>
        {!settings.integration.enabled || !settings.integration.configured ? <p className="mt-4 inline-flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><AlertTriangle className="mt-0.5 size-4 shrink-0" />Configure e habilite o provedor antes de ligar a automação.</p> : null}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{eventOptions.map((option) => <div key={option.key} className="flex items-start justify-between gap-4 rounded-xl border p-4"><div><p className="text-sm font-semibold">{option.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p></div><Toggle checked={settings[option.key]} disabled={pending} label={option.label} onChange={(checked) => change({ [option.key]: checked })} /></div>)}</div>
      </section>
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm"><div className="border-b px-5 py-4"><h3 className="font-semibold">Histórico de mensagens</h3><p className="mt-1 text-xs text-muted-foreground">Últimas 50 mensagens automáticas e manuais.</p></div>{messages.length === 0 ? <p className="px-5 py-8 text-sm text-muted-foreground">Nenhuma mensagem registrada para este leilão.</p> : <div className="divide-y">{messages.map((message) => <article key={message.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[10rem_1fr_8rem] lg:items-start"><div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[message.status] ?? "bg-muted"}`}>{message.status}</span><p className="mt-2 text-xs text-muted-foreground">{message.origin === "MANUAL" ? "Manual" : message.type.replaceAll("_", " ")}</p></div><div><p className="text-sm leading-6">{message.text}</p><p className="mt-1 text-xs text-muted-foreground">{message.maskedPhone ?? "Sem telefone válido"}{message.lot ? ` · Lote ${message.lot.number}` : ""}</p>{message.lastError ? <p className="mt-2 text-xs text-red-700">{message.lastError}</p> : null}</div><div className="text-xs text-muted-foreground"><p>{message.attempts}/{message.maxAttempts} tentativa(s)</p><p className="mt-1">{new Date(message.createdAt).toLocaleString("pt-BR")}</p>{message.allowWithoutConsent ? <p className="mt-2 font-semibold text-amber-700">Override auditado</p> : null}</div></article>)}</div>}</section>
    </>}
  </section>;
}

function Toggle({ checked, disabled, label, onChange }: { checked: boolean; disabled: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} disabled={disabled} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted-foreground/30"} disabled:opacity-50`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-[left] ${checked ? "left-6" : "left-1"}`} /></button>;
}
