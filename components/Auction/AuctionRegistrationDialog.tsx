"use client";

import { BellRing, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAuctionWhatsAppAvailabilityAction } from "@/hooks/actions/auctionEngineActions";

export function AuctionRegistrationDialog({ auctionId, open, onOpenChange, onConfirm }: {
  auctionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (whatsappOptIn: boolean) => Promise<void>;
}) {
  const [availability, setAvailability] = useState<{ hasWhatsApp: boolean; maskedPhone: string | null } | null>(null);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void getAuctionWhatsAppAvailabilityAction(auctionId).then((result) => {
      if (cancelled) return;
      setWhatsappOptIn(false);
      setAvailability(result.success && result.data ? result.data : { hasWhatsApp: false, maskedPhone: null });
    });
    return () => {
      cancelled = true;
    };
  }, [auctionId, open]);

  async function confirm() {
    setPending(true);
    try { await onConfirm(whatsappOptIn); }
    finally { setPending(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary sm:mx-0"><BellRing className="size-6" aria-hidden="true" /></div>
        <DialogTitle>Habilitar participação</DialogTitle>
        <DialogDescription>Você pode participar normalmente sem receber mensagens. A autorização abaixo é opcional e pode ser revogada depois.</DialogDescription>
      </DialogHeader>
      <label className={`flex items-start gap-3 rounded-xl border p-4 ${availability?.hasWhatsApp ? "cursor-pointer" : "opacity-65"}`}>
        <input type="checkbox" className="mt-1 size-4 accent-primary" checked={whatsappOptIn} onChange={(event) => setWhatsappOptIn(event.target.checked)} disabled={!availability?.hasWhatsApp || pending} />
        <span><span className="block text-sm font-semibold">Receber atualizações deste leilão pelo WhatsApp</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Lances validados, superações e lotes arrematados. {availability?.hasWhatsApp ? `Telefone: ${availability.maskedPhone}` : availability ? "Cadastre um telefone válido no seu perfil para ativar." : "Verificando telefone…"}</span></span>
      </label>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Agora não</Button>
        <Button type="button" onClick={() => void confirm()} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Confirmar participação</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
