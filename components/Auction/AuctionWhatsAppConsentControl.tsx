"use client";

import { BellRing, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { getAuctionRegistrationAction, setAuctionWhatsAppConsentAction } from "@/hooks/actions/auctionEngineActions";

export function AuctionWhatsAppConsentControl({ auctionId }: { auctionId: string }) {
  const [state, setState] = useState<{ approved: boolean; hasWhatsApp: boolean; optedIn: boolean; maskedPhone: string | null } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    void getAuctionRegistrationAction(auctionId).then((result) => {
      if (!active) return;
      if (!result.success || !result.data) {
        setState(null);
        setLoadError(result.error || "Não foi possível carregar suas preferências de notificação.");
        return;
      }
      setState({ approved: result.data.status === "APPROVED", hasWhatsApp: result.data.hasWhatsApp === true, optedIn: result.data.whatsappOptIn === true, maskedPhone: result.data.maskedPhone ?? null });
    }).catch(() => {
      if (active) {
        setState(null);
        setLoadError("Não foi possível carregar suas preferências de notificação.");
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [auctionId, reload]);

  function retryLoad() {
    setLoading(true);
    setLoadError(null);
    setReload((value) => value + 1);
  }

  function change(next: boolean) {
    setNotice(null);
    startTransition(async () => {
      const result = await setAuctionWhatsAppConsentAction(auctionId, next);
      if (result.success && result.data) {
        setState((current) => current ? { ...current, optedIn: result.data?.whatsappOptIn === true } : current);
        setNotice(result.data.whatsappOptIn ? "Notificações ativadas para este leilão." : "Autorização revogada para este leilão.");
      } else setNotice(result.error || "Não foi possível atualizar as notificações.");
    });
  }

  if (loading) return <p role="status" className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Carregando suas preferências de notificação…</p>;

  if (loadError) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
    <p>{loadError}</p>
    <button type="button" onClick={retryLoad} className="mt-3 inline-flex min-h-10 items-center rounded-md border border-red-300 px-3 font-semibold hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700">Tentar novamente</button>
  </div>;

  if (!state?.approved) return <p role="status" className="rounded-xl border bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">Sua participação não está habilitada neste leilão. Solicite participação para configurar os avisos por WhatsApp.</p>;

  return <div className="rounded-xl border bg-card p-4 shadow-xs">
    <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><BellRing className="mt-0.5 size-5 text-primary" aria-hidden="true" /><div><p className="text-sm font-semibold">Notificações pelo WhatsApp</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{state.hasWhatsApp ? `${state.maskedPhone ?? "Telefone cadastrado"}. Os avisos de lances, superações e arremates deste leilão podem ser enviados para esse número.` : "Esta conta não tem um número de WhatsApp válido cadastrado."} Você pode revogar a autorização a qualquer momento.</p></div></div><button type="button" role="switch" aria-checked={state.optedIn} aria-label="Notificações pelo WhatsApp" onClick={() => change(!state.optedIn)} disabled={!state.hasWhatsApp || pending} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${state.optedIn ? "bg-primary" : "bg-muted-foreground/30"} disabled:opacity-50`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${state.optedIn ? "left-6" : "left-1"}`} />{pending ? <Loader2 className="absolute left-4 top-1.5 size-4 animate-spin text-foreground" /> : null}</button></div>
    {notice ? <p role="status" className="mt-3 text-xs text-muted-foreground">{notice}</p> : null}
  </div>;
}
