import { AuctionEligibilityPanel } from "@/components/Management/AuctionEligibilityPanel";
import { AccessDenied } from "@/components/Management/AccessDenied";
import { permissionsToAuctionCapabilities } from "@/components/Management/capabilities";
import { getAuctionManagementAccess } from "@/lib/permissions/server/auction-access";

export const metadata = { title: "Habilitações globais" };
export default async function EligibilityPage() {
  const { session, permissions } = await getAuctionManagementAccess();
  const capabilities = permissionsToAuctionCapabilities(permissions, session.user.accountType);
  if (!capabilities.canManageStatus) return <AccessDenied message="Seu perfil não possui permissão para gerenciar habilitações." />;
  return <AuctionEligibilityPanel />;
}
