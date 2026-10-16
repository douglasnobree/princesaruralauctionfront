"use client";

import { Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { prepareCloudflareStreamAction } from "@/hooks/actions/auctionEngineActions";
import { managerRead } from "@/lib/auctions/manager-read";
import type { CloudflareStreamSetup } from "@/lib/auctions/cloudflare-stream";

export function CloudflareStreamSetupPanel({ auctionId, canManage, onPrepared, onBusyChange }: {
  auctionId: string;
  canManage: boolean;
  onPrepared: (input: NonNullable<CloudflareStreamSetup["input"]>) => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}) {
  const [setup, setSetup] = useState<CloudflareStreamSetup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [showPublishUrl, setShowPublishUrl] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!canManage) return;
    const controller = new AbortController();
    void managerRead<CloudflareStreamSetup>(`manager/auctions/${encodeURIComponent(auctionId)}/stream/cloudflare`, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setSetup(result); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os dados da Cloudflare."); });
    return () => controller.abort();
  }, [auctionId, canManage]);

  function prepare() {
    setError(null);
    setNotice("");
    onBusyChange(true);
    startTransition(async () => {
      try {
        const result = await prepareCloudflareStreamAction(auctionId);
        if (!result.success || !result.data?.input) {
          setError(result.error || "Não foi possível preparar a transmissão. Tente novamente.");
          return;
        }
        setSetup(result.data);
        setShowPublishUrl(false);
        await onPrepared(result.data.input);
        setNotice("Transmissão preparada. Configure o OBS e depois selecione Colocar ao vivo.");
      } finally { onBusyChange(false); }
    });
  }

  async function copyPublishUrl() {
    if (!setup?.input) return;
    try {
      await navigator.clipboard.writeText(setup.input.publishUrl);
      setNotice("Endereço do OBS copiado.");
    } catch { setError("Não foi possível copiar. Mostre o endereço do OBS e copie o texto do campo."); }
  }

  if (!canManage) return null;
  const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#dfe8e2] px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#08734e] disabled:opacity-50";

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-[#dfe8e2] bg-slate-50/60 p-4">
      <p className="text-sm font-semibold text-slate-800">Preparar transmissão na Cloudflare</p>
      <p className="text-xs leading-5 text-slate-600">Prepare uma entrada para este leilão ou informe abaixo a URL de reprodução de uma entrada já criada no painel da Cloudflare.</p>
      {setup?.available === false ? (
        <p className="text-xs leading-5 text-amber-900">A configuração automática ainda não está disponível. Use uma entrada criada no painel da Cloudflare ou solicite a configuração ao administrador.</p>
      ) : (
        <button type="button" disabled={pending} onClick={prepare} className={buttonClass}>
          {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          {pending ? "Preparando transmissão…" : setup?.input ? "Carregar dados do OBS" : "Preparar Cloudflare"}
        </button>
      )}
      {setup?.input ? (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Endereço do OBS (WHIP)
            <input type={showPublishUrl ? "text" : "password"} readOnly autoComplete="off" spellCheck={false} value={setup.input.publishUrl}
              className="mt-1 h-11 w-full rounded-lg border border-[#dfe8e2] bg-white px-3 text-base font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-[#08734e]" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowPublishUrl((current) => !current)} className={buttonClass}>
              {showPublishUrl ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}{showPublishUrl ? "Ocultar endereço" : "Mostrar endereço"}
            </button>
            <button type="button" onClick={() => void copyPublishUrl()} className={buttonClass}><Copy aria-hidden="true" className="size-4" />Copiar endereço do OBS</button>
          </div>
          <p className="text-xs leading-5 text-slate-600">No OBS 31 ou posterior, selecione o serviço WHIP, cole este endereço em Servidor e deixe o token vazio. Compartilhe esse endereço apenas com quem vai transmitir.</p>
        </div>
      ) : null}
      <details className="text-xs leading-5 text-slate-600">
        <summary className="min-h-11 cursor-pointer font-semibold text-slate-700">Configuração do OBS e gravação</summary>
        <p className="mt-1">Use vídeo H.264, áudio Opus e B-frames em 0. Comece com 30 quadros por segundo e ajuste o bitrate à conexão. Para guardar o leilão, ative também a gravação no OBS; este modo da Cloudflare ainda não grava automaticamente.</p>
      </details>
      <p role="status" className="text-xs leading-5 text-emerald-800">{notice}</p>
      {error ? <p role="alert" className="text-xs leading-5 text-red-700">{error}</p> : null}
    </div>
  );
}
