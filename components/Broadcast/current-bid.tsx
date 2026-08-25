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
  return (
    <section
      className={styles.bidCard}
      key={bid?.id ?? "empty-bid-card"}
      aria-label="Lance atual"
    >
      <span className={styles.eyebrow}>Lance atual</span>
      <strong className={styles.bidAmount} key={bid?.id ?? "empty-bid"}>
        {bid ? formatAmount(bid.amountCents, currency) : "Aguardando lance"}
      </strong>
      {bid ? (
        <span className={styles.bidderName} key={`${bid.id}-bidder`}>
          {bid.bidderName}
        </span>
      ) : null}
    </section>
  );
}
