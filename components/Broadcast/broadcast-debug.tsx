import type { BroadcastConnectionStatus } from "@/lib/broadcast/broadcast-types";
import styles from "@/components/Broadcast/broadcast-overlay.module.css";

function formatAge(timestamp: number | null) {
  if (!timestamp) return "—";
  const age = Math.max(0, Date.now() - timestamp) / 1000;
  return `${age.toFixed(1)}s`;
}

export function BroadcastDebug({
  connection,
  version,
  latencyMs,
  delayMs,
  lastEventAt,
}: {
  connection: BroadcastConnectionStatus;
  version: number;
  latencyMs: number | null;
  delayMs: number;
  lastEventAt: number | null;
}) {
  return (
    <aside className={styles.debugPanel} aria-label="Diagnóstico da transmissão">
      <span>WS {connection.toUpperCase()}</span>
      <span>VERSION {version}</span>
      <span>LATENCY {latencyMs == null ? "—" : `${latencyMs}ms`}</span>
      <span>DELAY {delayMs}ms</span>
      <span>LAST EVENT {formatAge(lastEventAt)}</span>
    </aside>
  );
}

