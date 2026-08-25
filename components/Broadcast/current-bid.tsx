"use client";

import { useLayoutEffect, useRef } from "react";
import type { BroadcastBid } from "@/lib/broadcast/broadcast-types";
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

export function CurrentBid({
  bid,
  currency,
}: {
  bid: BroadcastBid | null;
  currency: string;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const sweepRef = useRef<HTMLSpanElement>(null);
  const amountRef = useRef<HTMLElement>(null);
  const bidderRef = useRef<HTMLSpanElement>(null);
  const previousBidKeyRef = useRef<string | undefined>(undefined);
  const bidKey = bid
    ? `${bid.id}:${bid.amountCents}:${bid.bidderId}`
    : "empty-bid";

  useLayoutEffect(() => {
    const previousBidKey = previousBidKeyRef.current;
    previousBidKeyRef.current = bidKey;

    if (
      previousBidKey === undefined ||
      previousBidKey === bidKey ||
      bidKey === "empty-bid"
    ) {
      return;
    }

    const animations = [
      cardRef.current?.animate(
        [
          {
            transform: "translateY(10px) scale(0.985)",
            filter: "brightness(1.08)",
          },
          {
            transform: "translateY(-2px) scale(1.012)",
            filter: "brightness(1.16)",
            offset: 0.56,
          },
          {
            transform: "translateY(0) scale(1)",
            filter: "brightness(1)",
          },
        ],
        {
          duration: 900,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        },
      ),
      sweepRef.current?.animate(
        [
          { opacity: 0, transform: "translateX(0)" },
          { opacity: 0.58, offset: 0.24 },
          { opacity: 0.22, transform: "translateX(360%)", offset: 0.78 },
          { opacity: 0, transform: "translateX(360%)" },
        ],
        {
          duration: 950,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both",
        },
      ),
      amountRef.current?.animate(
        [
          {
            opacity: 0.55,
            transform: "translateY(18px) scale(0.94)",
            filter: "blur(3px)",
          },
          {
            opacity: 1,
            transform: "translateY(-3px) scale(1.055)",
            filter: "blur(0)",
            offset: 0.62,
          },
          {
            opacity: 1,
            transform: "translateY(0) scale(1)",
            filter: "blur(0)",
          },
        ],
        {
          duration: 880,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        },
      ),
      bidderRef.current?.animate(
        [
          { opacity: 0.5, transform: "translateX(-12px)" },
          { opacity: 1, transform: "translateX(2px)", offset: 0.7 },
          { opacity: 1, transform: "translateX(0)" },
        ],
        {
          duration: 680,
          delay: 90,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        },
      ),
    ].filter((animation): animation is Animation => animation !== undefined);

    return () => animations.forEach((animation) => animation.cancel());
  }, [bidKey]);

  return (
    <section
      ref={cardRef}
      className={styles.bidCard}
      aria-label="Lance atual"
    >
      <span ref={sweepRef} className={styles.bidSweep} aria-hidden="true" />
      <span className={styles.eyebrow}>Lance atual</span>
      <strong ref={amountRef} className={styles.bidAmount}>
        {bid ? formatAmount(bid.amountCents, currency) : "Aguardando lance"}
      </strong>
      <span
        ref={bidderRef}
        className={styles.bidderName}
        aria-hidden={bid ? undefined : true}
      >
        {bid?.bidderName ?? "\u00a0"}
      </span>
    </section>
  );
}
