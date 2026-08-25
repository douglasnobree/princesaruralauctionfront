import type { Metadata } from "next";
import Link from "next/link";
import { AuctionOperationPanel } from "@/components/Management/AuctionOperationPanel";
import { AuctionParticipantsPanel } from "@/components/Management/AuctionParticipantsPanel";
import { permissionsToAuctionCapabilities } from "@/components/Management/capabilities";
import { getEngineSnapshotAction } from "@/hooks/actions/auctionEngineActions";
import { getAuctionManagementAccess } from "@/lib/permissions/server/auction-access";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Control room de ensaio" };
export default async function AuctionSandboxControlPage({params}:{params:Promise<{auctionId:string}>}){const {auctionId}=await params;const {session,permissions}=await getAuctionManagementAccess();const result=await getEngineSnapshotAction(auctionId);const capabilities=permissionsToAuctionCapabilities(permissions,session.user.accountType);return <div className="space-y-6"><Link href="/admin/leiloes/sandbox" className="text-sm font-semibold text-[#075b3e] underline-offset-4 hover:underline">← Voltar ao ensaio</Link>{result.success&&result.data?<><header><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#08734e]">Ambiente temporário</p><h1 className="mt-2 text-3xl font-bold">{result.data.auction.title}</h1><p className="mt-2 text-sm text-slate-600">ID do ensaio: {auctionId}</p></header><AuctionOperationPanel auctionId={auctionId} initialSnapshot={result.data} capabilities={capabilities}/><AuctionParticipantsPanel auctionId={auctionId} capabilities={capabilities}/></>:<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{result.error||"Ensaio não encontrado."}</p>}</div>}
