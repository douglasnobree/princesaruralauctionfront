import type { Metadata } from "next";
import { BroadcastOverlay } from "@/components/Broadcast/broadcast-overlay";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transmissão do leilão",
  robots: {
    index: false,
    follow: false,
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function BroadcastAuctionPage({
  params,
  searchParams,
}: {
  params: Promise<{ auctionId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { auctionId } = await params;
  const query: SearchParams = (await searchParams) ?? {};
  const token = firstValue(query.token);
  const clientId = firstValue(query.clientId) || "obs-main";
  const debug = ["true", "1"].includes(firstValue(query.debug).toLowerCase());

  return (
    <BroadcastOverlay
      auctionId={auctionId}
      token={token}
      clientId={clientId}
      debug={debug}
    />
  );
}
