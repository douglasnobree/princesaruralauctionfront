"use client";

import { useLayoutEffect, useRef } from "react";
import type { BroadcastBid } from "@/lib/broadcast/broadcast-types";
import styles from "@/components/Broadcast/broadcast-overlay.module.css";

function uniqueBidders(bids: BroadcastBid[]) {
  const seen = new Set<string>();
  return bids.filter((bid) => {
    if (seen.has(bid.bidderId)) return false;
    seen.add(bid.bidderId);
    return true;
  });
}

export function BidderCarousel({ bids }: { bids: BroadcastBid[] }) {
  const participants = uniqueBidders(bids);
  const participantRefs = useRef(new Map<string, HTMLSpanElement>());
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const previousParticipantsRef = useRef<string | undefined>(undefined);
  const participantKey = participants.map((bid) => bid.bidderId).join("|");

  useLayoutEffect(() => {
    const previousParticipants = previousParticipantsRef.current;
    previousParticipantsRef.current = participantKey;

    if (previousParticipants === undefined || previousParticipants === participantKey) {
      return;
    }

    const previousIds = new Set(previousParticipants.split("|").filter(Boolean));
    const animations = participantKey
      .split("|")
      .filter((bidderId) => bidderId && !previousIds.has(bidderId))
      .map((bidderId) =>
        participantRefs.current.get(bidderId)?.animate(
          [
            { opacity: 0.52, transform: "translateX(-14px) scale(0.96)" },
            { opacity: 1, transform: "translateX(2px) scale(1.02)", offset: 0.65 },
            { opacity: 1, transform: "translateX(0) scale(1)" },
          ],
          { duration: 720, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" },
        ),
      )
      .filter((animation): animation is Animation => animation !== undefined);

    return () => animations.forEach((animation) => animation.cancel());
  }, [participantKey]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || participants.length === 0) return;

    const viewportWidth = viewport.clientWidth;
    const trackWidth = track.scrollWidth;
    if (viewportWidth <= 0 || trackWidth <= 0) return;

    const distance = viewportWidth + trackWidth;
    const duration = Math.max(12_000, (distance / 110) * 1_000);
    const animation = track.animate(
      [
        { transform: `translateX(${viewportWidth}px)` },
        { transform: `translateX(-${trackWidth}px)` },
      ],
      {
        duration,
        easing: "linear",
        iterations: Infinity,
      },
    );

    return () => animation.cancel();
  }, [participantKey, participants.length]);

  if (participants.length === 0) return null;

  return (
    <div className={styles.carouselBar} aria-label="Últimos participantes">
      <span className={styles.carouselLabel}>Últimos lances</span>
      <div ref={viewportRef} className={styles.carouselViewport}>
        <div ref={trackRef} className={styles.carouselTrack}>
          <div className={styles.carouselGroup}>
            {participants.map((bid) => (
              <span
                className={styles.carouselParticipant}
                key={bid.bidderId}
                ref={(element) => {
                  if (element) participantRefs.current.set(bid.bidderId, element);
                  else participantRefs.current.delete(bid.bidderId);
                }}
              >
                {bid.bidderName}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
