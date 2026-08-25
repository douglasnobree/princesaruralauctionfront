"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchBroadcastState,
  getBroadcastWebSocketUrl,
  parseBroadcastConfig,
} from "@/lib/broadcast/broadcast-client";
import { BroadcastStateQueue } from "@/lib/broadcast/state-queue";
import {
  DEFAULT_BROADCAST_CONFIG,
  type BroadcastConfig,
  type BroadcastConnectionStatus,
  type BroadcastState,
} from "@/lib/broadcast/broadcast-types";

type UseBroadcastOverlayOptions = {
  auctionId: string;
  token: string;
  clientId: string;
  initialState?: BroadcastState | null;
};

export function useBroadcastOverlay({
  auctionId,
  token,
  clientId,
  initialState = null,
}: UseBroadcastOverlayOptions) {
  const [state, setState] = useState<BroadcastState | null>(initialState);
  const [config, setConfig] = useState<BroadcastConfig>(
    DEFAULT_BROADCAST_CONFIG,
  );
  const [connection, setConnection] = useState<BroadcastConnectionStatus>(
    token ? "connecting" : "error",
  );
  const [error, setError] = useState<string | null>(
    token ? null : "Token do overlay não informado.",
  );
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

  const stateRef = useRef<BroadcastState | null>(initialState);
  const configRef = useRef(DEFAULT_BROADCAST_CONFIG);
  const queueRef = useRef<BroadcastStateQueue | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const recoveryInFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const applyState = useCallback((nextState: BroadcastState) => {
    stateRef.current = nextState;
    setState(nextState);
    const updatedAt = Date.parse(nextState.updatedAt);
    if (Number.isFinite(updatedAt)) {
      setLatencyMs(Math.max(0, Date.now() - updatedAt));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    configRef.current = DEFAULT_BROADCAST_CONFIG;
    stateRef.current = initialState;

    const queue = new BroadcastStateQueue(
      configRef.current.overlayDelayMs,
      applyState,
    );
    queueRef.current = queue;
    if (initialState) queue.prime(initialState);

    if (!token) {
      return () => {
        mountedRef.current = false;
        queue.clear();
      };
    }

    const clearReconnectTimer = () => {
      if (!reconnectTimerRef.current) return;
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    };

    const clearHeartbeat = () => {
      if (!heartbeatTimerRef.current) return;
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    };

    const recoverSnapshot = async () => {
      if (recoveryInFlightRef.current) return;
      recoveryInFlightRef.current = true;
      try {
        const snapshot = await fetchBroadcastState(auctionId, token);
        if (!mountedRef.current) return;
        queue.replace(snapshot);
        setError(null);
        setLastEventAt(Date.now());
      } catch (recoveryError) {
        if (mountedRef.current) {
          setError(
            recoveryError instanceof Error
              ? recoveryError.message
              : "Falha ao recuperar a transmissão.",
          );
        }
      } finally {
        recoveryInFlightRef.current = false;
      }
    };

    const loadInitialSnapshot = async () => {
      try {
        const snapshot = await fetchBroadcastState(auctionId, token);
        if (!mountedRef.current) return;
        queue.replace(snapshot);
        setError(null);
        setLastEventAt(Date.now());
      } catch (initialError) {
        if (mountedRef.current) {
          setError(
            initialError instanceof Error
              ? initialError.message
              : "Falha ao carregar a transmissão.",
          );
        }
      }
    };

    const scheduleReconnect = (code?: number) => {
      clearReconnectTimer();
      clearHeartbeat();
      if (!mountedRef.current || code === 1008) {
        if (mountedRef.current && code === 1008) setConnection("error");
        return;
      }
      setConnection("reconnecting");
      const attempt = reconnectAttemptRef.current;
      const delay = Math.min(10_000, 1_000 * 2 ** attempt);
      reconnectAttemptRef.current = Math.min(attempt + 1, 4);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };

    function connect() {
      clearReconnectTimer();
      if (!mountedRef.current) return;
      setConnection(reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting");

      const socket = new WebSocket(
        getBroadcastWebSocketUrl(auctionId, token, clientId),
      );
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        if (!mountedRef.current) return;
        reconnectAttemptRef.current = 0;
        setConnection("connected");
        setError(null);
        clearHeartbeat();
        heartbeatTimerRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send("ping");
        }, 20_000);
      });

      socket.addEventListener("message", (event) => {
        if (!mountedRef.current) return;
        setLastEventAt(Date.now());
        try {
          const payload = JSON.parse(String(event.data)) as {
            type?: string;
            state?: BroadcastState;
            config?: unknown;
            code?: string;
          };
          if (payload.type === "auction:config") {
            const nextConfig = parseBroadcastConfig(payload.config);
            if (nextConfig) {
              configRef.current = nextConfig;
              setConfig(nextConfig);
              queue.setDelay(nextConfig.overlayDelayMs);
            }
            return;
          }
          if (payload.type === "auction:state" && payload.state) {
            const nextState = payload.state;
            const currentVersion = stateRef.current?.version ?? 0;
            if (
              currentVersion > 0 &&
              nextState.version > currentVersion + 1
            ) {
              void recoverSnapshot();
            }
            queue.enqueue(nextState);
            return;
          }
          if (payload.type === "error") {
            setError(
              payload.code === "BROADCAST_UNAUTHORIZED"
                ? "Token do overlay inválido ou expirado."
                : "A transmissão recusou a conexão.",
            );
          }
        } catch {
          setError("Resposta inválida recebida da transmissão.");
        }
      });

      socket.addEventListener("error", () => {
        if (mountedRef.current) setConnection("offline");
      });

      socket.addEventListener("close", (event) => {
        if (socketRef.current === socket) socketRef.current = null;
        scheduleReconnect(event.code);
      });
    }

    void loadInitialSnapshot();
    connect();

    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      clearHeartbeat();
      queue.clear();
      queueRef.current = null;
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
    };
  }, [applyState, auctionId, clientId, initialState, token]);

  return {
    state,
    config,
    connection,
    error,
    latencyMs,
    lastEventAt,
    version: state?.version ?? 0,
  };
}
