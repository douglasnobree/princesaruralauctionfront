import type { Metadata } from "next";
import { BroadcastControlPanel } from "@/components/Broadcast/broadcast-control-panel";
import { getBroadcastAdminStateAction, getBroadcastClientsAction, getBroadcastConfigAction, listBroadcastTokensAction, type BroadcastTokenSummary } from "@/hooks/actions/broadcastActions";
import { DEFAULT_BROADCAST_CONFIG } from "@/lib/broadcast/broadcast-types";
import { permissionsToAuctionCapabilities } from "@/components/Management/capabilities";
import { getAuctionManagementAccess } from "@/lib/permissions/server/auction-access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Broadcast / OBS" };
export default async function AuctionBroadcastManagementPage({ params }: { params: Promise<{ id: string }> }) { const { id }=await params; const { session, permissions } = await getAuctionManagementAccess(); const capabilities = permissionsToAuctionCapabilities(permissions, session.user.accountType); if (!capabilities.canView) return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"><h1 className="font-semibold">Acesso negado</h1><p className="mt-1">Seu perfil não possui a permissão de consulta de leilões.</p></section>; const [state,config,clients]=await Promise.all([getBroadcastAdminStateAction(id),getBroadcastConfigAction(id),getBroadcastClientsAction(id)]); const tokens = capabilities.canManageStatus ? await listBroadcastTokensAction(id) : { success: true as const, data: [] as BroadcastTokenSummary[] }; const error=[state,config,clients,tokens].find((result)=>!result.success)?.error; return <BroadcastControlPanel auctionId={id} initialState={state.success?state.data??null:null} initialConfig={config.success?config.data??DEFAULT_BROADCAST_CONFIG:DEFAULT_BROADCAST_CONFIG} initialClients={clients.success?clients.data??[]:[]} initialTokens={tokens.success?tokens.data??[]:[]} initialError={error} canManageBroadcast={capabilities.canManageStatus}/>; }
