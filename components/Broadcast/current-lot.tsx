import type { BroadcastLot } from "@/lib/broadcast/broadcast-types";
import styles from "@/components/Broadcast/broadcast-overlay.module.css";

export function CurrentLot({ lot }: { lot: BroadcastLot | null }) {
  if (!lot) {
    return (
      <section className={styles.lotCard} aria-label="Lote atual">
        <span className={styles.eyebrow}>Aguardando lote</span>
        <strong className={styles.emptyValue}>Próximo lote em instantes</strong>
      </section>
    );
  }

  const statusLabel =
    lot.status === "sold"
      ? "Vendido"
      : lot.status === "passed"
        ? "Encerrado"
        : lot.status === "open"
          ? "Em disputa"
          : "Aguardando abertura";

  return (
    <section className={styles.lotCard} aria-label={`Lote ${lot.number}`}>
      <div className={styles.lotHeading}>
        <span className={styles.eyebrow}>Lote {String(lot.number).padStart(3, "0")}</span>
        <span className={styles.lotStatus}>{statusLabel}</span>
      </div>
      <h1 className={styles.lotTitle}>{lot.title}</h1>
    </section>
  );
}

