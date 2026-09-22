"use client";

import { useEffect, useState } from "react";
import { BroadcastControlPanel } from "@/components/Broadcast/broadcast-control-panel";
import { getBroadcastAdminStateAction, getBroadcastClientsAction, getBroadcastConfigAction, listBroadcastTokensAction } from "@/hooks/actions/broadcastActions";
import { DEFAULT_BROADCAST_CONFIG } from "@/lib/broadcast/broadcast-types";

async function loadBroadcast(auctionId: string, canManage: boolean) {
  const [state, config, clients, tokens] = await Promise.all([
    getBroadcastAdminStateAction(auctionId), getBroadcastConfigAction(auctionId),
    getBroadcastClientsAction(auctionId), canManage ? listBroadcastTokensAction(auctionId) : Promise.resolve({ success: true, data: [], error: undefined }),
  ]);
  return { state, config, clients, tokens };
}

export function AuctionBroadcastPanel({ auctionId, canManage }: { auctionId: string; canManage: boolean }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadBroadcast>> | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void loadBroadcast(auctionId, canManage).then((result) => { if (active) setData(result); });
    return () => { active = false; };
  }, [auctionId, canManage, attempt]);
  if (!data) return <div role="status" className="management-skeleton rounded-xl border p-6">Carregando controles da transmissão…</div>;
  if (!data.config.success) return <div role="alert" className="rounded-xl border p-5"><p>Não foi possível carregar a transmissão.</p><button type="button" className="mt-3 underline" onClick={() => { setData(null); setAttempt((value) => value + 1); }}>Tentar novamente</button></div>;
  return <BroadcastControlPanel auctionId={auctionId} initialState={data.state.data ?? null}
    initialConfig={data.config.data ?? DEFAULT_BROADCAST_CONFIG} initialClients={data.clients.data ?? []}
    initialTokens={data.tokens.data ?? []} canManageBroadcast={canManage}
    initialError={[data.state, data.config, data.clients, data.tokens].find((result) => !result.success)?.error} />;
}
