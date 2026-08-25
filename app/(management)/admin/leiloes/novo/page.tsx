import type { Metadata } from "next";
import { AuctionForm } from "@/components/Management/AuctionForm";
import { AccessDenied } from "@/components/Management/AccessDenied";
import { permissionsToAuctionCapabilities } from "@/components/Management/capabilities";
import { getAuctionManagementAccess } from "@/lib/permissions/server/auction-access";

export const metadata: Metadata = { title: "Novo leilão" };
export default async function NewAuctionManagementPage() { const { session, permissions } = await getAuctionManagementAccess(); const capabilities=permissionsToAuctionCapabilities(permissions,session.user.accountType); if(!capabilities.canCreate)return <AccessDenied message="Seu perfil não possui permissão para criar leilões."/>; return <div className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#08734e]">Cadastro</p><h1 className="mt-2 text-3xl font-bold">Novo leilão</h1><p className="mt-2 text-sm text-slate-600">Cadastre os dados principais. Os lotes são adicionados depois que o leilão for criado.</p></header><AuctionForm capabilities={capabilities}/></div>; }
