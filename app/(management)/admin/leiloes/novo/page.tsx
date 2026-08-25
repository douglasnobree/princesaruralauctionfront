import type { Metadata } from "next";
import { AuctionForm } from "@/components/Management/AuctionForm";
import { AccessDenied } from "@/components/Management/AccessDenied";
import { permissionsToAuctionCapabilities } from "@/components/Management/capabilities";
import { getAuctionManagementAccess } from "@/lib/permissions/server/auction-access";

export const metadata: Metadata = { title: "Novo leilão" };
export default async function NewAuctionManagementPage() { const { session, permissions } = await getAuctionManagementAccess(); const capabilities=permissionsToAuctionCapabilities(permissions,session.user.accountType); if(!capabilities.canCreate)return <AccessDenied message="Seu perfil não possui permissão para criar leilões."/>; return <AuctionForm capabilities={capabilities}/>; }
