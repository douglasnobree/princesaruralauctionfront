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

  return (
    <div className={styles.carouselBar} aria-label="Últimos participantes">
      <span className={styles.carouselLabel}>Últimos lances</span>
      <div className={styles.carouselTrack}>
        {participants.map((bid) => (
          <span className={styles.carouselParticipant} key={`${bid.id}-${bid.bidderId}`}>
            {bid.bidderName}
          </span>
        ))}
      </div>
    </div>
  );
}

