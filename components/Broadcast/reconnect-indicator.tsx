"use client";

import { useEffect, useState } from "react";
import type { BroadcastConnectionStatus } from "@/lib/broadcast/broadcast-types";
import styles from "@/components/Broadcast/broadcast-overlay.module.css";

export function ReconnectIndicator({
  status,
}: {
  status: BroadcastConnectionStatus;
}) {
  const isDisconnected = status !== "connected" && status !== "idle";
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setIsVisible(isDisconnected),
      isDisconnected ? 650 : 350,
    );

    return () => clearTimeout(timer);
  }, [isDisconnected]);

  if (!isVisible) return null;

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
