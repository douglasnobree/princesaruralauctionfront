"use client";

import { useLayoutEffect, useRef } from "react";
import type { BroadcastLot } from "@/lib/broadcast/broadcast-types";
import styles from "@/components/Broadcast/broadcast-overlay.module.css";

export function CurrentLot({ lot }: { lot: BroadcastLot | null }) {
  const cardRef = useRef<HTMLElement>(null);
  const sweepRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousLotIdRef = useRef<string | undefined>(undefined);
  const lotId = lot?.id ?? "empty-lot";

  useLayoutEffect(() => {
    const previousLotId = previousLotIdRef.current;
    previousLotIdRef.current = lotId;

    if (
      previousLotId === undefined ||
      previousLotId === lotId ||
      lotId === "empty-lot"
    ) {
      return;
    }

    const animations = [
      cardRef.current?.animate(
        [
          { opacity: 0.72, transform: "translateX(-18px) scale(0.985)" },
          { opacity: 1, transform: "translateX(3px) scale(1.006)", offset: 0.68 },
          { opacity: 1, transform: "translateX(0) scale(1)" },
        ],
        {
          duration: 850,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        },
      ),
      sweepRef.current?.animate(
        [
          { opacity: 0, transform: "translateX(0)" },
          { opacity: 0.42, offset: 0.26 },
          { opacity: 0.12, transform: "translateX(360%)", offset: 0.78 },
          { opacity: 0, transform: "translateX(360%)" },
        ],
        {
          duration: 920,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both",
        },
      ),
      titleRef.current?.animate(
        [
          { opacity: 0.55, transform: "translateY(12px)", filter: "blur(3px)" },
          { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
        ],
        {
          duration: 760,
          delay: 70,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        },
      ),
    ].filter((animation): animation is Animation => animation !== undefined);

    return () => animations.forEach((animation) => animation.cancel());
  }, [lotId]);

  const statusLabel =
    lot?.status === "sold"
      ? "Vendido"
      : lot?.status === "passed"
        ? "Encerrado"
        : lot?.status === "open"
          ? "Em disputa"
          : "Aguardando abertura";

  return (
    <section
      ref={cardRef}
      className={styles.lotCard}
      aria-label={lot ? `Lote ${lot.number}` : "Lote atual"}
    >
      <span ref={sweepRef} className={styles.lotSweep} aria-hidden="true" />
      <div className={styles.lotHeading}>
        <span className={styles.eyebrow}>
          {lot ? `Lote ${String(lot.number).padStart(3, "0")}` : "Aguardando lote"}
        </span>
        {lot ? <span className={styles.lotStatus}>{statusLabel}</span> : null}
      </div>
      <h1
        ref={titleRef}
        className={lot ? styles.lotTitle : styles.emptyValue}
      >
        {lot?.title ?? "Próximo lote em instantes"}
      </h1>
    </section>
  );
}
