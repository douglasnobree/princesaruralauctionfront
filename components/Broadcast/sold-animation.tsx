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
  return (
    <div className={styles.soldOverlay} role="status" aria-live="assertive">
      <span className={styles.soldKicker}>Lote {String(lot.number).padStart(3, "0")}</span>
      <strong className={styles.soldTitle}>Vendido</strong>
      {bid ? (
        <span className={styles.soldResult}>
          {formatAmount(bid.amountCents, currency)} · {bid.bidderName}
        </span>
      ) : null}
    </div>
  );
}

