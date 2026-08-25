import type { Metadata } from "next";
import { BroadcastControlPanel } from "@/components/Broadcast/broadcast-control-panel";
import {
  getBroadcastAdminStateAction,
  getBroadcastClientsAction,
  getBroadcastConfigAction,
  listBroadcastTokensAction,
} from "@/hooks/actions/broadcastActions";
import { DEFAULT_BROADCAST_CONFIG } from "@/lib/broadcast/broadcast-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Control room da transmissão",
  robots: { index: false, follow: false },
};

export default async function BroadcastControlPage({
  params,
}: {
  params: Promise<{ auctionId: string }>;
}) {
  const { auctionId } = await params;
  const [stateResult, configResult, clientsResult, tokensResult] =
    await Promise.all([
      getBroadcastAdminStateAction(auctionId),
      getBroadcastConfigAction(auctionId),
      getBroadcastClientsAction(auctionId),
      listBroadcastTokensAction(auctionId),
    ]);

  const firstError = [stateResult, configResult, clientsResult, tokensResult].find(
    (result) => !result.success,
  )?.error;

  return (
    <BroadcastControlPanel
      auctionId={auctionId}
      initialState={stateResult.success ? stateResult.data ?? null : null}
      initialConfig={
        configResult.success
          ? configResult.data ?? DEFAULT_BROADCAST_CONFIG
          : DEFAULT_BROADCAST_CONFIG
      }
      initialClients={clientsResult.success ? clientsResult.data ?? [] : []}
      initialTokens={tokensResult.success ? tokensResult.data ?? [] : []}
      initialError={firstError}
    />
  );
}

