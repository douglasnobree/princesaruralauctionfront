"use client";

import {
  Camera,
  CircleDot,
  ExternalLink,
  Maximize2,
  Radio,
  Signal,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { EngineStream } from "@/lib/auctions/engine-types";

function streamLabel(status: string) {
  return status === "LIVE"
    ? "Ao vivo"
    : status === "STARTING"
      ? "Preparando transmissão"
      : status === "ENDED"
        ? "Transmissão encerrada"
        : "Transmissão indisponível";
}

function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function getYoutubeVideoId(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (hostname === "youtu.be") return url.pathname.slice(1).split("/")[0] || null;
    if (hostname !== "youtube.com" && !hostname.endsWith(".youtube.com") && hostname !== "youtube-nocookie.com") return null;
    if (url.pathname === "/watch") return url.searchParams.get("v");
    if (url.pathname.startsWith("/live/")) return url.pathname.split("/")[2] || null;
    if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] || null;
    if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2] || null;
    return null;
  } catch {
    return null;
  }
}

function getProviderLabel(provider: string) {
  const normalized = provider.toLowerCase();
  if (normalized === "youtube") return "YouTube Live";
  if (normalized === "hls") return "HLS";
  if (normalized === "direct") return "Stream direto";
  if (normalized === "mock") return "Sem fonte configurada";
  return provider || "Fonte externa";
}

export function LiveStreamPlayer({
  stream,
  title,
  manager = false,
}: {
  stream: EngineStream | null;
  title: string;
  manager?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const provider = stream?.provider?.toLowerCase() ?? "";
  const sourceUrl = stream?.playbackUrl;
  const isMock = provider === "mock" || sourceUrl?.includes("mock-stream.invalid");
  const youtubeId = !isMock && sourceUrl && isHttpUrl(sourceUrl)
    ? getYoutubeVideoId(sourceUrl)
    : provider === "youtube"
      ? stream?.providerStreamId ?? null
      : null;
  const youtubeEmbedUrl = youtubeId
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&mute=1&playsinline=1&rel=0`
    : null;
  const directMediaUrl = !isMock && isHttpUrl(sourceUrl) && !youtubeEmbedUrl ? sourceUrl : null;
  const isHls = provider === "hls" || (directMediaUrl?.toLowerCase().split("?")[0].endsWith(".m3u8") ?? false);
  const isLive = stream?.status === "LIVE";
  const hasSource = Boolean(youtubeEmbedUrl || directMediaUrl);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const sourceKey = `${stream?.playbackUrl ?? ""}|${stream?.providerStreamId ?? ""}|${stream?.version ?? ""}`;
  const [mediaErrorKey, setMediaErrorKey] = useState<string | null>(null);
  const mediaError = mediaErrorKey === sourceKey;

  useEffect(() => {
    if (!directMediaUrl || !isHls || !videoRef.current) return;
    let disposed = false;
    const video = videoRef.current;

    void import("hls.js").then(({ default: Hls }) => {
      if (disposed || !videoRef.current) return;
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = directMediaUrl;
        return;
      }
      if (!Hls.isSupported()) {
        setMediaErrorKey(sourceKey);
        return;
      }
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(directMediaUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!disposed && data.fatal) setMediaErrorKey(sourceKey);
      });
    }).catch(() => {
      if (!disposed) setMediaErrorKey(sourceKey);
    });

    return () => {
      disposed = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [directMediaUrl, isHls, sourceKey]);

  function openFullscreen() {
    const target = videoRef.current?.parentElement;
    if (target && document.fullscreenEnabled) void target.requestFullscreen();
  }

  return (
    <section
      aria-label={`Transmissão ${title}`}
      className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.7)]"
    >
      <div className="relative aspect-video min-h-[230px] overflow-hidden rounded-xl bg-slate-900">
        {youtubeEmbedUrl ? (
          <iframe
            src={youtubeEmbedUrl}
            title={`Transmissão ao vivo de ${title}`}
            className="absolute inset-0 size-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : directMediaUrl && !mediaError ? (
          <video
            ref={videoRef}
            className="absolute inset-0 size-full object-cover"
            controls
            autoPlay
            muted
            playsInline
            preload="metadata"
            src={isHls ? undefined : directMediaUrl}
            onError={() => { if (!isHls) setMediaErrorKey(sourceKey); }}
          />
        ) : (
          <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_70%_25%,rgba(16,185,129,0.2),transparent_28%),linear-gradient(135deg,#152238_0%,#0f172a_52%,#17251f_100%)]">
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/75 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <div className="max-w-md">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80">
                  {mediaError ? <TriangleAlert className="size-5" /> : <Radio className="size-5" />}
                </span>
                <p className="mt-4 text-sm font-semibold">
                  {mediaError ? "Não foi possível reproduzir a fonte" : isMock ? "Transmissão aguardando fonte" : "Transmissão aguardando sinal"}
                </p>
                <p className="mt-1 text-xs leading-5 text-white/65">
                  {mediaError
                    ? "Confira se a URL é HTTPS e se o serviço permite reprodução no navegador."
                    : manager
                      ? "Configure uma fonte do YouTube, HLS ou stream direto no control room."
                      : "A transmissão aparecerá aqui assim que uma fonte compatível for conectada."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${isLive && hasSource ? "bg-red-500 text-white" : "bg-white/15 text-white/80"}`}>
                <CircleDot className={`size-3 ${isLive && hasSource ? "animate-pulse" : ""}`} />
                {streamLabel(stream?.status ?? "FAILED")}
              </span>
              <span className="rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium text-white/75">
                {getProviderLabel(stream?.provider ?? "")}
              </span>
            </div>
            {directMediaUrl ? (
              <button
                type="button"
                onClick={openFullscreen}
                className="pointer-events-auto rounded-full bg-black/30 p-2 text-white/80 transition-colors hover:bg-black/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Abrir transmissão em tela cheia"
              >
                <Maximize2 className="size-4" />
              </button>
            ) : null}
          </div>
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
              <Camera className="size-3.5" /> Fonte oficial do leilão
            </p>
            <h2 className="mt-1 max-w-xl text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs text-white/60 sm:px-5">
        <span className="inline-flex items-center gap-2">
          <Signal className={isLive && hasSource ? "size-3.5 text-emerald-400" : "size-3.5"} />
          {hasSource ? getProviderLabel(stream?.provider ?? "") : "Fonte ainda não configurada"}
        </span>
        {sourceUrl && isHttpUrl(sourceUrl) && !youtubeEmbedUrl ? (
          <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-white">
            Abrir fonte <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>
    </section>
  );
}
