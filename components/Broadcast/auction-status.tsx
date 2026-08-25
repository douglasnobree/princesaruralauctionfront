import type { BroadcastAuctionStatus } from "@/lib/broadcast/broadcast-types";
import styles from "@/components/Broadcast/broadcast-overlay.module.css";

const labels: Record<BroadcastAuctionStatus, string> = {
  waiting: "Aguardando início",
  live: "Leilão ao vivo",
  paused: "Leilão pausado",
  finished: "Leilão encerrado",
};

export function AuctionStatus({ status }: { status: BroadcastAuctionStatus }) {
  return (
    <div className={styles.statusBadge} data-status={status}>
      <span className={styles.statusDot} aria-hidden="true" />
      {labels[status]}
    </div>
  );
}

