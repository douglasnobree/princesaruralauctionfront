"use client";

import { useEffect, useEffectEvent } from "react";

/** One request at a time; stop on hidden tabs and abort on unmount. */
export function useVisiblePoll(read: (signal: AbortSignal) => Promise<void>, interval: number) {
  const onRead = useEffectEvent(read);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;
    async function tick() {
      if (stopped || document.hidden || controller) return;
      controller = new AbortController();
      try { await onRead(controller.signal); } catch { /* The caller renders errors. */ }
      finally {
        controller = null;
        if (!stopped) timer = setTimeout(tick, interval);
      }
    }
    function visibility() {
      clearTimeout(timer);
      if (!document.hidden) void tick();
    }
    void tick();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [interval]);
}
