"use client";

import { Maximize, Pause, Play, Radio, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { startWhepPlayback, WhepPlaybackError } from "@/lib/auctions/whep-client";

type ViewState = "connecting" | "loading" | "waiting" | "reconnecting" | "live" | "blocked" | "unsupported";

export function CloudflareWebRtcPlayer({ playbackUrl, title }: { playbackUrl: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const failures = useRef(0);
  const discoverIceServers = useRef(false);
  const hasPlayed = useRef(false);
  const startupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<ViewState>("connecting");
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const video = videoRef.current;
    let disposed = false;
    let session: Awaited<ReturnType<typeof startWhepPlayback>> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let disconnectedTimer: ReturnType<typeof setTimeout> | undefined;

    const reconnect = (waiting = false, retryWithIceServers = false) => {
      if (disposed || reconnectTimer) return;
      if (retryWithIceServers) discoverIceServers.current = true;
      controller.abort();
      void session?.close();
      if (video) video.srcObject = null;
      setReady(false);
      setPlaying(false);
      setView(hasPlayed.current ? "reconnecting" : waiting ? "waiting" : "connecting");
      clearTimeout(startupTimer.current);
      failures.current += 1;
      reconnectTimer = setTimeout(() => setAttempt((current) => current + 1), Math.min(5000, 500 * 2 ** Math.min(failures.current - 1, 4)));
    };

    startupTimer.current = setTimeout(() => reconnect(false, true), discoverIceServers.current ? 25000 : 12000);
    void startWhepPlayback(playbackUrl, {
      signal: controller.signal,
      discoverIceServers: discoverIceServers.current,
      onStream: (media) => {
        if (disposed || controller.signal.aborted || !video) return;
        if (video.srcObject !== media) video.srcObject = media;
        setReady(true);
        void video.play().catch(() => {
          if (!disposed && !controller.signal.aborted && video.paused) {
            clearTimeout(startupTimer.current);
            setView("blocked");
            setPlaying(false);
          }
        });
      },
      onConnectionState: (state) => {
        if (disposed || controller.signal.aborted) return;
        clearTimeout(disconnectedTimer);
        if (state === "connected" && !video?.videoWidth) setView("loading");
        if (state === "failed") reconnect(false, true);
        if (state === "disconnected") disconnectedTimer = setTimeout(() => reconnect(false, true), 2000);
      },
    }).then((connected) => {
      if (disposed || reconnectTimer) { void connected.close(); return; }
      session = connected;
    }).catch((cause: unknown) => {
      if (disposed || controller.signal.aborted) return;
      if (cause instanceof Error && cause.message === "WEBRTC_UNSUPPORTED") {
        clearTimeout(startupTimer.current);
        setView("unsupported");
        return;
      }
      const waitingForPublisher = cause instanceof WhepPlaybackError && [404, 409, 425].includes(cause.status);
      reconnect(waitingForPublisher, !(cause instanceof WhepPlaybackError));
    });

    const online = () => {
      if (disposed) return;
      setReady(false);
      setPlaying(false);
      setView("connecting");
      setAttempt((current) => current + 1);
    };
    window.addEventListener("online", online);
    return () => {
      disposed = true;
      clearTimeout(startupTimer.current);
      clearTimeout(reconnectTimer);
      clearTimeout(disconnectedTimer);
      window.removeEventListener("online", online);
      controller.abort();
      void session?.close();
      if (video) video.srcObject = null;
    };
  }, [playbackUrl, attempt]);

  function retry() {
    failures.current = 0;
    setView("connecting");
    setReady(false);
    setAttempt((current) => current + 1);
  }

  function showVideo() {
    if (!videoRef.current?.videoWidth) return;
    clearTimeout(startupTimer.current);
    failures.current = 0;
    hasPlayed.current = true;
    setView("live");
    setReady(true);
    setPlaying(!videoRef.current.paused);
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setPlaying(false));
    else video.pause();
  }

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (video.paused) void video.play().catch(() => setPlaying(false));
  }

  async function fullscreen() {
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    try {
      if (containerRef.current?.requestFullscreen) await containerRef.current.requestFullscreen();
      else video?.webkitEnterFullscreen?.();
    } catch { /* Fullscreen is optional; playback stays available. */ }
  }

  const status = view === "connecting" ? "Conectando à transmissão" : view === "loading" ? "Carregando vídeo" : view === "waiting" ? "Conectando ao sinal do leilão"
    : view === "reconnecting" ? "Retomando a transmissão" : view === "blocked" ? "Pronto para assistir" : view === "unsupported" ? "Seu navegador não suporta esta transmissão" : "Transmissão conectada";
  const description = view === "unsupported" ? "Abra o leilão no Chrome, Edge ou Safari atualizado."
    : view === "blocked" ? "Selecione reproduzir para iniciar o vídeo."
      : view === "loading" ? "Preparando a imagem para você."
        : view === "reconnecting" ? "O vídeo será retomado automaticamente."
          : view === "waiting" ? "A conexão continua automaticamente." : "O vídeo começará automaticamente.";
  const loading = !["live", "blocked", "unsupported"].includes(view);
  const controlClass = "inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50";

  return (
    <div ref={containerRef} className="bg-neutral-950 text-white">
      <p role="status" className="sr-only">{status}</p>
      <div className="relative aspect-video w-full" aria-busy={loading}>
        <video ref={videoRef} autoPlay muted playsInline aria-label={`Transmissão ao vivo de ${title}`} className="absolute inset-0 size-full object-contain"
          onLoadedData={showVideo} onPlaying={showVideo}
          onPause={() => setPlaying(false)} onVolumeChange={() => setMuted(videoRef.current?.muted ?? true)} />
        {view !== "live" ? (
          <div data-stream-loading className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[var(--pr-forest,#062518)] p-3 text-center sm:gap-3 sm:p-6">
            {loading ? (
              <div aria-hidden="true" className="flex h-6 items-center gap-1.5 text-[var(--pr-gold,#fbaa34)] sm:h-8">
                {["h-2", "h-4", "h-6", "h-4", "h-2"].map((height, index) => (
                  <span key={index} className={`w-1 rounded-full bg-current animate-pulse ${height}`} style={{ animationDelay: `${index * 140}ms` }} />
                ))}
              </div>
            ) : <Radio aria-hidden="true" className="size-6 text-[var(--pr-gold,#fbaa34)]" />}
            <p className="text-base font-semibold leading-6 tracking-tight text-white sm:text-xl">{status}</p>
            <p className="max-w-80 text-xs leading-4 text-white/75 sm:text-sm sm:leading-5">{description}</p>
            {view === "blocked" ? <button type="button" onClick={togglePlayback} className={`${controlClass} mt-1 bg-white/10`}><Play aria-hidden="true" className="size-4" />Reproduzir transmissão</button>
              : view === "waiting" || view === "reconnecting" ? <button type="button" onClick={retry} className={`${controlClass} mt-1 bg-white/10`}><RefreshCw aria-hidden="true" className="size-4" />Conectar novamente</button> : null}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-white/10 px-2 py-1">
        <button type="button" disabled={!ready} onClick={togglePlayback} className={controlClass}>
          {playing ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}{playing ? "Pausar" : "Reproduzir"}
        </button>
        <div className="flex items-center">
          <button type="button" disabled={!ready} onClick={toggleSound} className={controlClass}>
            {muted ? <VolumeX aria-hidden="true" className="size-4" /> : <Volume2 aria-hidden="true" className="size-4" />}{muted ? "Ativar som" : "Silenciar"}
          </button>
          <button type="button" disabled={!ready} onClick={() => void fullscreen()} aria-label="Tela cheia" className={controlClass}><Maximize aria-hidden="true" className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}
