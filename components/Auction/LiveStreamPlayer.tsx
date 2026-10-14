"use client";

import { Radio, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { EngineStream } from "@/lib/auctions/engine-types";
import { YouTubeLivePlayer } from "./YouTubeLivePlayer";

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
  const directMediaUrl = !isMock && isHttpUrl(sourceUrl) && !youtubeId ? sourceUrl : null;
  const isHls = provider === "hls" || (directMediaUrl?.toLowerCase().split("?")[0].endsWith(".m3u8") ?? false);
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

  return (
    <section
      aria-label={`Transmissão ${title}`}
      className="overflow-hidden rounded-xl bg-neutral-950 text-white"
    >
      <div className={youtubeId ? undefined : "relative aspect-video w-full overflow-hidden"}>
        {youtubeId ? (
          <YouTubeLivePlayer key={youtubeId} videoId={youtubeId} title={title} />
        ) : directMediaUrl && !mediaError ? (
          <video
            ref={videoRef}
            className="absolute inset-0 size-full object-contain"
            controls
            autoPlay
            muted
            playsInline
            preload="metadata"
            src={isHls ? undefined : directMediaUrl}
            onError={() => { if (!isHls) setMediaErrorKey(sourceKey); }}
          />
        ) : (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <div className="max-w-md">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80">
                  {mediaError ? <TriangleAlert className="size-5" /> : <Radio className="size-5" />}
                </span>
                <p className="mt-4 text-sm font-semibold">
                  {mediaError ? "Não foi possível carregar a transmissão" : "Aguardando transmissão"}
                </p>
                <p className="mt-1 text-xs leading-5 text-white/65">
                  {mediaError
                    ? "Tente atualizar a página para assistir novamente."
                    : manager
                      ? "Configure uma fonte do YouTube, HLS ou stream direto no control room."
                      : "O vídeo aparecerá aqui assim que a transmissão começar."}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
