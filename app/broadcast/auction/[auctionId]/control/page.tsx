import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BroadcastControlPage({
  params,
}: {
  params: Promise<{ auctionId: string }>;
}) {
  const { auctionId } = await params;
  redirect(`/admin/leiloes/${encodeURIComponent(auctionId)}/broadcast`);
}
