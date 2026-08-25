import { redirect } from "next/navigation";
export default async function AuctionLotsCompatibilityPage({ params }: { params: Promise<{ id: string }> }) { const { id }=await params; redirect(`/admin/leiloes/${encodeURIComponent(id)}?aba=lotes`); }
