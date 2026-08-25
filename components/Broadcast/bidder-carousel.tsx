import type { CSSProperties } from "react";
import type { BroadcastBid } from "@/lib/broadcast/broadcast-types";
import styles from "@/components/Broadcast/broadcast-overlay.module.css";

function uniqueConsecutiveBidders(bids: BroadcastBid[]) {
  return bids.filter(
    (bid, index) => index === 0 || bids[index - 1]?.bidderId !== bid.bidderId,
  );
}

export function BidderCarousel({ bids }: { bids: BroadcastBid[] }) {
  const participants = uniqueConsecutiveBidders(bids);
  if (participants.length === 0) return null;

  const marqueeDuration = Math.max(16, participants.length * 3.2);
  const trackStyle = {
    "--carousel-duration": `${marqueeDuration}s`,
  } as CSSProperties;

  const renderParticipants = (duplicate = false) => (
    <div
      className={`${styles.carouselGroup} ${duplicate ? styles.carouselGroupDuplicate : ""}`}
      aria-hidden={duplicate}
    >
      {participants.map((bid) => (
        <span
          className={styles.carouselParticipant}
          key={`${duplicate ? "duplicate" : "primary"}-${bid.id}-${bid.bidderId}`}
        >
          {bid.bidderName}
        </span>
      ))}
    </div>
  );

  return (
    <div className={styles.carouselBar} aria-label="Últimos participantes">
      <span className={styles.carouselLabel}>Últimos lances</span>
      <div className={styles.carouselViewport}>
        <div className={styles.carouselTrack} style={trackStyle}>
          {renderParticipants()}
          {renderParticipants(true)}
        </div>
      </div>
    </div>
  );
}
