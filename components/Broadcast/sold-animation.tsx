"use client";

import { useLayoutEffect, useRef } from "react";
import type { BroadcastBid, BroadcastLot } from "@/lib/broadcast/broadcast-types";
import styles from "@/components/Broadcast/broadcast-overlay.module.css";

function formatAmount(amountCents: string, currency: string) {
  const amount = Number(amountCents) / 100;
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function SoldAnimation({
  lot,
  bid,
  currency,
}: {
  lot: BroadcastLot;
  bid: BroadcastBid | null;
  currency: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLSpanElement>(null);
  const kickerRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const animations = [
      overlayRef.current?.animate(
        [
          { opacity: 0.78, transform: "translate(-50%, -47%) scale(0.92)", filter: "brightness(1.08)" },
          { opacity: 1, transform: "translate(-50%, -50%) scale(1.018)", filter: "brightness(1.16)", offset: 0.58 },
          { opacity: 1, transform: "translate(-50%, -50%) scale(1)", filter: "brightness(1)" },
        ],
        { duration: 1_000, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" },
      ),
      burstRef.current?.animate(
        [
          { opacity: 0, transform: "scale(0.72)" },
          { opacity: 0.62, transform: "scale(1.02)", offset: 0.42 },
          { opacity: 0, transform: "scale(1.22)" },
        ],
        { duration: 1_100, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" },
      ),
      kickerRef.current?.animate(
        [
          { opacity: 0.55, transform: "translateY(10px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 620, delay: 80, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" },
      ),
      titleRef.current?.animate(
        [
          { opacity: 0.62, transform: "translateY(18px) scale(0.86)", filter: "blur(4px)" },
          { opacity: 1, transform: "translateY(-3px) scale(1.04)", filter: "blur(0)", offset: 0.62 },
          { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0)" },
        ],
        { duration: 900, delay: 90, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" },
      ),
      resultRef.current?.animate(
        [
          { opacity: 0.5, transform: "translateY(12px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 700, delay: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" },
      ),
    ].filter((animation): animation is Animation => animation !== undefined);

    return () => animations.forEach((animation) => animation.cancel());
  }, [bid?.amountCents, bid?.bidderId, bid?.id, lot.id]);

  return (
    <div ref={overlayRef} className={styles.soldOverlay} role="status" aria-live="assertive">
      <span ref={burstRef} className={styles.soldBurst} aria-hidden="true" />
      <span ref={kickerRef} className={styles.soldKicker}>Lote {String(lot.number).padStart(3, "0")}</span>
      <strong ref={titleRef} className={styles.soldTitle}>Vendido</strong>
      {bid ? (
        <span ref={resultRef} className={styles.soldResult}>
          {formatAmount(bid.amountCents, currency)} · {bid.bidderName}
        </span>
      ) : <span ref={resultRef} className={styles.soldResult}>Lote encerrado</span>}
    </div>
  );
}
