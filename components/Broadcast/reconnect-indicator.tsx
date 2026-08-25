import type { BroadcastConnectionStatus } from "@/lib/broadcast/broadcast-types";
import styles from "@/components/Broadcast/broadcast-overlay.module.css";

export function ReconnectIndicator({
  status,
}: {
  status: BroadcastConnectionStatus;
}) {
  if (status === "connected" || status === "idle") return null;

  const label =
    status === "connecting"
      ? "Conectando à transmissão"
      : status === "reconnecting"
        ? "Reconectando à transmissão"
        : status === "error"
          ? "Falha na transmissão"
          : "Transmissão offline";

  return (
    <div className={styles.reconnectIndicator} role="status" aria-live="polite">
      <span className={styles.reconnectDot} aria-hidden="true" />
      {label}
    </div>
  );
}

