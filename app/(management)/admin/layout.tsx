import type { Metadata } from "next";
import { AuctionManagementShell } from "@/components/Management/AuctionManagementShell";
import { getAuctionManagementAccess } from "@/lib/permissions/server/auction-access";

export const metadata: Metadata = { title: { default: "Gestão de leilões", template: "%s | Gestão de leilões" }, robots: { index: false, follow: false } };

export default async function AuctionAdminLayout({ children }: { children: React.ReactNode }) {
  const { session, permissions } = await getAuctionManagementAccess();
  return <AuctionManagementShell user={session.user} permissions={permissions}>{children}</AuctionManagementShell>;
}
