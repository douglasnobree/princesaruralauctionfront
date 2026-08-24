import { Camera, CircleDot, Maximize2, Mic2, Play, Radio, Signal, Volume2 } from "lucide-react";
import type { EngineStream } from "@/lib/auctions/engine-types";

function streamLabel(status: string) {
  return status === "LIVE" ? "Ao vivo" : status === "STARTING" ? "Preparando transmissão" : status === "ENDED" ? "Transmissão encerrada" : "Transmissão indisponível";
}

export function MockStreamPlayer({ stream, title, manager = false }: { stream: EngineStream | null; title: string; manager?: boolean }) {
  const isMock = stream?.provider === "mock" || !stream?.playbackUrl?.startsWith("http");
  const isLive = stream?.status === "LIVE";

  return <section aria-label={`Transmissão ${title}`} className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.7)]">
    <div className="relative aspect-video min-h-[230px] overflow-hidden rounded-xl bg-slate-900">
      {isMock ? <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_70%_25%,rgba(245,158,11,0.32),transparent_28%),linear-gradient(135deg,#152238_0%,#0f172a_46%,#3f2518_100%)]"><div className="absolute -left-10 bottom-[-30%] h-[75%] w-[70%] rotate-[-12deg] rounded-[45%] bg-emerald-700/25 blur-2xl" /><div className="absolute right-[12%] top-[17%] size-28 rounded-full border border-amber-200/20 bg-amber-100/10 blur-[1px]" /><div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent" /></div> : <video className="absolute inset-0 size-full object-cover" controls playsInline src={stream?.playbackUrl ?? undefined} />}
      <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${isLive ? "bg-red-500 text-white" : "bg-white/15 text-white/80"}`}><CircleDot className={`size-3 ${isLive ? "animate-pulse" : ""}`} />{streamLabel(stream?.status ?? "FAILED")}</span><span className="rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium text-white/75">{isMock ? "Mock de transmissão" : stream?.provider}</span></div><button type="button" className="rounded-full bg-black/30 p-2 text-white/80 transition-colors hover:bg-black/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Tela cheia indisponível no mock"><Maximize2 className="size-4" /></button></div><div><div className="flex items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/65"><Camera className="size-3.5" />Estúdio Princesa Rural</p><h2 className="mt-1 max-w-xl text-xl font-bold tracking-tight sm:text-2xl">{title}</h2></div>{isMock ? <div className="hidden items-center gap-2 text-xs text-white/70 sm:flex"><Mic2 className="size-4" /><Volume2 className="size-4" /><Signal className="size-4" /></div> : null}</div></div></div>
      {isMock ? <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full border border-white/15 bg-black/30 px-4 py-3 text-sm font-semibold backdrop-blur-sm"><span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground"><Play className="ml-0.5 size-4 fill-current" /></span>{manager ? "Prévia monitorada pelo control room" : "Você está acompanhando ao vivo"}</div> : null}
    </div>
    <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs text-white/60 sm:px-5"><span className="inline-flex items-center gap-2"><Radio className="size-3.5 text-emerald-400" />Fonte oficial da transmissão</span><span className="inline-flex items-center gap-1.5"><Signal className="size-3.5" />{isLive ? "Sinal estável" : "Aguardando sinal"}</span></div>
  </section>;
}
