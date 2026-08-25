"use client";

import { useEffect, useRef, useState } from "react";
import type { BroadcastBid, BroadcastLot } from "@/lib/broadcast/broadcast-types";
import { useBroadcastOverlay } from "@/components/Broadcast/use-broadcast-overlay";
import { AuctionStatus } from "@/components/Broadcast/auction-status";
import { BroadcastDebug } from "@/components/Broadcast/broadcast-debug";
import { BidderCarousel } from "@/components/Broadcast/bidder-carousel";
import { CurrentBid } from "@/components/Broadcast/current-bid";
import { CurrentLot } from "@/components/Broadcast/current-lot";
import { ReconnectIndicator } from "@/components/Broadcast/reconnect-indicator";
import { SoldAnimation } from "@/components/Broadcast/sold-animation";
import styles from "@/components/Broadcast/broadcast-overlay.module.css";

type BroadcastOverlayProps = {
  auctionId: string;
  token: string;
  clientId?: string;
  debug?: boolean;
  contained?: boolean;
};

type SoldMoment = {
  lot: BroadcastLot;
  bid: BroadcastBid | null;
  currency: string;
};

export function BroadcastOverlay({
  auctionId,
  token,
  clientId = "obs-main",
  debug = false,
  contained = false,
}: BroadcastOverlayProps) {
  const [soldMoment, setSoldMoment] = useState<SoldMoment | null>(null);
  const previousLotRef = useRef<BroadcastLot | null>(null);
  const soldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcast = useBroadcastOverlay({ auctionId, token, clientId });

  useEffect(() => {
    if (contained) return;
    document.documentElement.classList.add("broadcast-route");
    return () => document.documentElement.classList.remove("broadcast-route");
  }, [contained]);

  useEffect(() => {
    const lot = broadcast.state?.currentLot ?? null;
    const previousLot = previousLotRef.current;
    const soldTransition =
      lot?.status === "sold" &&
      (!previousLot || previousLot.id !== lot.id || previousLot.status !== "sold");
    if (soldTransition && lot) {
      if (soldTimerRef.current) clearTimeout(soldTimerRef.current);
      setSoldMoment({
        lot,
        bid: broadcast.state?.currentBid ?? null,
        currency: broadcast.state?.currency ?? "BRL",
      });
      soldTimerRef.current = setTimeout(() => setSoldMoment(null), 4_500);
    }
    previousLotRef.current = lot;
  }, [broadcast.state]);

  useEffect(() => {
    return () => {
      if (soldTimerRef.current) clearTimeout(soldTimerRef.current);
    };
  }, []);

  const status = broadcast.state?.status ?? "waiting";

  return (
    <div className={`${styles.overlay} ${contained ? styles.contained : "broadcast-page"}`}>
      <div className={styles.frame}>
        <div className={styles.cornerGlow} aria-hidden="true" />
        <AuctionStatus status={status} />
        <ReconnectIndicator status={broadcast.connection} />
        <div className={styles.content}>
          <CurrentLot lot={broadcast.state?.currentLot ?? null} />
          <CurrentBid
            bid={broadcast.state?.currentBid ?? null}
            currency={broadcast.state?.currency ?? "BRL"}
          />
        </div>
        <BidderCarousel bids={broadcast.state?.recentBids ?? []} />
        {soldMoment ? (
          <SoldAnimation
            lot={soldMoment.lot}
            bid={soldMoment.bid}
            currency={soldMoment.currency}
          />
        ) : null}
        {broadcast.error && broadcast.connection === "error" ? (
          <div className={styles.errorBanner} role="alert">
            {broadcast.error}
          </div>
        ) : null}
        {debug ? (
          <BroadcastDebug
            connection={broadcast.connection}
            version={broadcast.version}
            latencyMs={broadcast.latencyMs}
            delayMs={broadcast.config.overlayDelayMs}
            lastEventAt={broadcast.lastEventAt}
          />
        ) : null}
      </div>
    </div>
  );
}
