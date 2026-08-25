import type { Metadata } from "next";
import { AuctionList } from "@/components/Management/AuctionList";
import { permissionsToAuctionCapabilities } from "@/components/Management/capabilities";
import { getAdminAuctionsAction } from "@/hooks/actions/auctionActions";
import { getAuctionManagementAccess } from "@/lib/permissions/server/auction-access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leilões", description: "Gerencie leilões e lotes na central de leilões." };

export default async function AuctionManagementListPage() {
  const { session, permissions } = await getAuctionManagementAccess();
  const result = await getAdminAuctionsAction();
  return <AuctionList auctions={result.success ? result.data ?? [] : []} capabilities={permissionsToAuctionCapabilities(permissions, session.user.accountType)} error={result.success ? undefined : result.error} />;
}
