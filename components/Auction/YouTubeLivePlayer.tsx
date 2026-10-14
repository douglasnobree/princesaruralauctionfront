"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type YouTubePlayer = {
  destroy: () => void;
  getIframe: () => HTMLIFrameElement;
  isMuted: () => boolean;
  mute: () => void;
  unMute: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
};

type YouTubeApi = {
  Player: new (element: HTMLElement, options: {
    host: string;
    videoId: string;
    width: string;
    height: string;
    playerVars: Record<string, string | number>;
    events: {
      onReady: (event: { target: YouTubePlayer }) => void;
      onStateChange: (event: { target: YouTubePlayer; data: number }) => void;
      onAutoplayBlocked: () => void;
      onError: () => void;
    };
  }) => YouTubePlayer;
};

type YouTubeWindow = Window & {
  YT?: YouTubeApi;
  onYouTubeIframeAPIReady?: () => void;
};

let apiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi() {
  const youtubeWindow = window as YouTubeWindow;
  if (youtubeWindow.YT?.Player) return Promise.resolve(youtubeWindow.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previousReady = youtubeWindow.onYouTubeIframeAPIReady;
    youtubeWindow.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (youtubeWindow.YT?.Player) resolve(youtubeWindow.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      script.remove();
      reject(new Error("Não foi possível carregar o player do YouTube."));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

export function YouTubeLivePlayer({ videoId, title }: { videoId: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    void loadYouTubeApi().then((api) => {
      if (disposed || !containerRef.current) return;
      // The API replaces this child; React retains ownership of the container.
      const target = document.createElement("div");
      containerRef.current.appendChild(target);
      const player = new api.Player(target, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          disablekb: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: ({ target: readyPlayer }) => {
            if (disposed) return;
            readyPlayer.mute();
            readyPlayer.playVideo();
            setReady(true);
          },
          onStateChange: ({ target: currentPlayer, data }) => {
            if (disposed) return;
            setPlaying(data === 1 || data === 3);
            setMuted(currentPlayer.isMuted());
          },
          onAutoplayBlocked: () => { if (!disposed) setPlaying(false); },
          onError: () => { if (!disposed) setFailed(true); },
        },
      });
      player.getIframe().title = `Transmissão ao vivo de ${title}`;
      player.getIframe().allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      player.getIframe().tabIndex = -1;
      playerRef.current = player;
    }).catch(() => { if (!disposed) setFailed(true); });

    return () => {
      disposed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId, title]);

  function togglePlayback() {
    if (playing) playerRef.current?.pauseVideo();
    else playerRef.current?.playVideo();
  }

  function toggleSound() {
    const player = playerRef.current;
    if (!player) return;
    if (muted) player.unMute();
    else player.mute();
    setMuted(!muted);
  }

  return (
    <>
      <div className="relative aspect-video w-full">
        <div ref={containerRef} className="absolute inset-0 size-full [&_iframe]:pointer-events-none [&_iframe]:size-full [&_iframe]:border-0" />
      </div>
      {failed ? (
        <p role="alert" className="px-4 py-3 text-sm text-white/80">
          Não foi possível carregar a transmissão. Tente atualizar a página.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-2 py-1">
          <button
            type="button"
            disabled={!ready}
            onClick={togglePlayback}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
          >
            {playing ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
            {playing ? "Pausar" : "Reproduzir"}
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={toggleSound}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
          >
            {muted ? <VolumeX aria-hidden="true" className="size-4" /> : <Volume2 aria-hidden="true" className="size-4" />}
            {muted ? "Ativar som" : "Silenciar"}
          </button>
        </div>
      )}
    </>
  );
}
