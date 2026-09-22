import type { Metadata } from "next";
import { AuctionWorkspace } from "@/components/Management/AuctionWorkspace";
import { AccessDenied } from "@/components/Management/AccessDenied";
import { permissionsToAuctionCapabilities } from "@/components/Management/capabilities";
import { getAdminAuctionAction, getAuctionLotsAction } from "@/hooks/actions/auctionActions";
import { getEngineSnapshotAction } from "@/hooks/actions/auctionEngineActions";
import { getAuctionManagementAccess } from "@/lib/permissions/server/auction-access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gestão do leilão" };

export default async function AuctionManagementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, permissions } = await getAuctionManagementAccess();
  const capabilities = permissionsToAuctionCapabilities(permissions, session.user.accountType);
  if (!capabilities.canView) return <AccessDenied message="Seu perfil não possui a permissão de consulta de leilões." />;
  const [auctionResult, lotsResult, engineResult] = await Promise.all([
    getAdminAuctionAction(id), getAuctionLotsAction(id), getEngineSnapshotAction(id),
  ]);
  if (!auctionResult.success || !auctionResult.data) return <AccessDenied title="Leilão indisponível" message={auctionResult.error || "Não foi possível carregar este leilão."} />;
  return <AuctionWorkspace key={id} auction={auctionResult.data} lots={lotsResult.data ?? auctionResult.data.lots ?? []}
    capabilities={capabilities} engineSnapshot={engineResult.data ?? null} engineError={engineResult.error} />;
}
