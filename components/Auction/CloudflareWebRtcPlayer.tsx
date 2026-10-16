"use client";

import { Maximize, Pause, Play, Radio, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { startWhepPlayback, WhepPlaybackError } from "@/lib/auctions/whep-client";

type ViewState = "connecting" | "waiting" | "reconnecting" | "live" | "unsupported";

export function CloudflareWebRtcPlayer({ playbackUrl, title }: { playbackUrl: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const failures = useRef(0);
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

    const reconnect = (waiting = false) => {
      if (disposed || reconnectTimer) return;
      void session?.close();
      setReady(false);
      setPlaying(false);
      setView(waiting ? "waiting" : "reconnecting");
      clearTimeout(startupTimer.current);
      failures.current += 1;
      reconnectTimer = setTimeout(() => setAttempt((current) => current + 1), Math.min(15000, 1500 * 2 ** Math.min(failures.current - 1, 4)));
    };

    startupTimer.current = setTimeout(() => reconnect(true), 25000);
    void startWhepPlayback(playbackUrl, {
      signal: controller.signal,
      onStream: (media) => {
        if (disposed || !video) return;
        if (video.srcObject !== media) video.srcObject = media;
        setReady(true);
        void video.play().catch(() => { if (!disposed) { clearTimeout(startupTimer.current); setView("live"); setPlaying(false); } });
      },
      onConnectionState: (state) => {
        if (disposed) return;
        clearTimeout(disconnectedTimer);
        if (state === "failed") reconnect();
        if (state === "disconnected") disconnectedTimer = setTimeout(() => reconnect(), 5000);
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
      reconnect(cause instanceof WhepPlaybackError && [404, 409, 425].includes(cause.status));
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

  const status = view === "connecting" ? "Conectando à transmissão" : view === "waiting" ? "Aguardando transmissão"
    : view === "reconnecting" ? "Reconectando à transmissão" : view === "unsupported" ? "Seu navegador não suporta esta transmissão" : "Transmissão conectada";
  const controlClass = "inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50";

  return (
    <div ref={containerRef} className="bg-neutral-950 text-white">
      <p role="status" className="sr-only">{status}</p>
      <div className="relative aspect-video w-full">
        <video ref={videoRef} autoPlay muted playsInline aria-label={`Transmissão ao vivo de ${title}`} className="absolute inset-0 size-full object-contain"
          onPlaying={() => { clearTimeout(startupTimer.current); failures.current = 0; setView("live"); setPlaying(true); }}
          onPause={() => setPlaying(false)} onVolumeChange={() => setMuted(videoRef.current?.muted ?? true)} />
        {view !== "live" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950 px-5 text-center">
            <Radio aria-hidden="true" className="size-7 text-white/70" />
            <p className="text-sm font-semibold">{status}</p>
            <p className="max-w-sm text-xs leading-5 text-white/70">{view === "unsupported" ? "Abra o leilão em uma versão atual do Chrome, Edge ou Safari." : "A reprodução será retomada automaticamente quando o sinal estiver disponível."}</p>
            {view !== "unsupported" ? <button type="button" onClick={retry} className={controlClass}><RefreshCw aria-hidden="true" className="size-4" />Tentar novamente</button> : null}
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
