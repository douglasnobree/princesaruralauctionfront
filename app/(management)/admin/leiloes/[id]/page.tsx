import type { Metadata } from "next";
import { AuctionWorkspace } from "@/components/Management/AuctionWorkspace";
import { AccessDenied } from "@/components/Management/AccessDenied";
import { permissionsToAuctionCapabilities } from "@/components/Management/capabilities";
import { getAdminAuctionAction, getAuctionLotsAction } from "@/hooks/actions/auctionActions";
import { getBroadcastAdminStateAction, getBroadcastClientsAction, getBroadcastConfigAction } from "@/hooks/actions/broadcastActions";
import { getEngineSnapshotAction } from "@/hooks/actions/auctionEngineActions";
import { DEFAULT_BROADCAST_CONFIG } from "@/lib/broadcast/broadcast-types";
import { getAuctionManagementAccess } from "@/lib/permissions/server/auction-access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Workspace do leilão" };

export default async function AuctionManagementDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id }=await params; const {session,permissions}=await getAuctionManagementAccess(); const capabilities=permissionsToAuctionCapabilities(permissions,session.user.accountType); const [auctionResult,lotsResult,engineResult,broadcastStateResult,broadcastConfigResult,broadcastClientsResult]=await Promise.all([getAdminAuctionAction(id),getAuctionLotsAction(id),getEngineSnapshotAction(id),getBroadcastAdminStateAction(id),getBroadcastConfigAction(id),getBroadcastClientsAction(id)]); if(!auctionResult.success||!auctionResult.data)return <AccessDenied title="Leilão indisponível" message={auctionResult.error||"Não foi possível carregar este leilão ou ele não pertence ao seu escopo."}/>; if(!capabilities.canView)return <AccessDenied message="Seu perfil não possui a permissão de consulta de leilões."/>; const auction=auctionResult.data; const lots=lotsResult.success?lotsResult.data??[]:auction.lots??[]; return <AuctionWorkspace auction={auction} lots={lots} capabilities={capabilities} engineSnapshot={engineResult.success?engineResult.data??null:null} engineError={engineResult.success?undefined:engineResult.error} broadcastState={broadcastStateResult.success?broadcastStateResult.data??null:null} broadcastConfig={broadcastConfigResult.success?broadcastConfigResult.data??DEFAULT_BROADCAST_CONFIG:null} broadcastClients={broadcastClientsResult.success?broadcastClientsResult.data??[]:[]}/>; }
