"use client";

import { BellRing, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { getAuctionRegistrationAction, setAuctionWhatsAppConsentAction } from "@/hooks/actions/auctionEngineActions";

export function AuctionWhatsAppConsentControl({ auctionId }: { auctionId: string }) {
  const [state, setState] = useState<{ approved: boolean; hasWhatsApp: boolean; optedIn: boolean; maskedPhone: string | null } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    void getAuctionRegistrationAction(auctionId).then((result) => {
      if (!active || !result.success || !result.data) return;
      setState({ approved: result.data.status === "APPROVED", hasWhatsApp: result.data.hasWhatsApp === true, optedIn: result.data.whatsappOptIn === true, maskedPhone: result.data.maskedPhone ?? null });
    });
    return () => { active = false; };
  }, [auctionId]);

  if (!state?.approved) return null;
  function change(next: boolean) {
    startTransition(async () => {
      const result = await setAuctionWhatsAppConsentAction(auctionId, next);
      if (result.success && result.data) {
        setState((current) => current ? { ...current, optedIn: result.data?.whatsappOptIn === true } : current);
        setNotice(next ? "Notificações ativadas." : "Notificações revogadas. Mensagens automáticas pendentes serão canceladas.");
      } else setNotice(result.error || "Não foi possível atualizar as notificações.");
    });
  }
  return <div className="rounded-xl border bg-card p-4 shadow-xs">
    <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><BellRing className="mt-0.5 size-5 text-primary" aria-hidden="true" /><div><p className="text-sm font-semibold">Notificações pelo WhatsApp</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{state.hasWhatsApp ? `${state.maskedPhone ?? "Telefone cadastrado"}. Você pode revogar a autorização a qualquer momento.` : "Cadastre um telefone válido no seu perfil para ativar."}</p></div></div><button type="button" role="switch" aria-checked={state.optedIn} aria-label="Notificações pelo WhatsApp" onClick={() => change(!state.optedIn)} disabled={!state.hasWhatsApp || pending} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${state.optedIn ? "bg-primary" : "bg-muted-foreground/30"} disabled:opacity-50`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${state.optedIn ? "left-6" : "left-1"}`} />{pending ? <Loader2 className="absolute left-4 top-1.5 size-4 animate-spin text-foreground" /> : null}</button></div>
    {notice ? <p role="status" className="mt-3 text-xs text-muted-foreground">{notice}</p> : null}
  </div>;
}
