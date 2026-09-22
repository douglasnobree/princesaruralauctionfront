"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { AuctionBannerField } from "./AuctionBannerField";
import { Button } from "@/components/ui/button";
import { saveAuctionPlatformBannerAction } from "@/hooks/actions/auctionActions";
import type { AuctionPlatformBanners } from "@/types/auction-admin";

export function AuctionPlatformBannerForm({ initialData, initialError }: {
  initialData?: AuctionPlatformBanners;
  initialError?: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState<AuctionPlatformBanners | null>(null);
  const [files, setFiles] = useState<Partial<Record<"desktop" | "mobile", File | null>>>({});
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const banners = saved ?? initialData;
  const dirty = Object.keys(files).length > 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      setFeedback(null);
      for (const device of ["desktop", "mobile"] as const) {
        if (files[device] === undefined) continue;
        const result = await saveAuctionPlatformBannerAction(device, files[device] ?? null);
        if (!result.success || !result.data) {
          setFeedback({ error: true, message: `Não foi possível salvar o banner ${device === "mobile" ? "para celular" : "para desktop"}. ${result.error || "Tente novamente."} As alterações já concluídas foram mantidas.` });
          return;
        }
        setSaved(result.data);
        setFiles((current) => { const next = { ...current }; delete next[device]; return next; });
      }
      setFeedback({ error: false, message: "Banners da plataforma salvos." });
      router.refresh();
    });
  }

  return <section className="space-y-5" aria-labelledby="platform-banners-title">
    <header>
      <h1 id="platform-banners-title" className="text-2xl font-bold">Banners da plataforma</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Configure o destaque da página inicial e da agenda do PR Leilões. Estas imagens são globais e independentes dos banners de cada leilão.</p>
    </header>
    {!banners ? <div role="alert" className="space-y-3 rounded-xl border bg-card p-5"><p>{initialError || "Não foi possível carregar os banners."}</p><Button variant="outline" disabled={pending} onClick={() => startTransition(() => router.refresh())}>Tentar novamente</Button></div> : <form onSubmit={submit} className="space-y-5" aria-busy={pending}>
      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <p className="mb-5 text-sm leading-6 text-muted-foreground">As artes aparecem inteiras. Sem uma versão para celular, será usado o banner para desktop. Sem banners da plataforma, o destaque atual da agenda será mantido.</p>
        <div className="grid gap-6 md:grid-cols-2">
          {(["desktop", "mobile"] as const).map((device) => <AuctionBannerField key={device} device={device} savedUrl={device === "desktop" ? banners.desktopBannerUrl : banners.mobileBannerUrl} value={files[device]} disabled={pending} onChange={(file) => { setFeedback(null); setFiles((current) => ({ ...current, [device]: file })); }} />)}
        </div>
      </div>
      {feedback ? <p role={feedback.error ? "alert" : "status"} className={`rounded-lg p-4 text-sm ${feedback.error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"}`}>{feedback.message}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{dirty ? "Há alterações para salvar." : "Selecione ou remova uma imagem para alterar os banners."}</p><Button type="submit" disabled={pending || !dirty} className="min-h-11">{pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{pending ? "Salvando banners…" : "Salvar banners"}</Button></div>
    </form>}
  </section>;
}
