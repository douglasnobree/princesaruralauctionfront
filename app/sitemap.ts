import type { MetadataRoute } from "next";
import { getAuctions, isPublicAuction } from "@/lib/auctions/catalog";
import { absoluteUrl, auctionPath, lotPath } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Propagate API failures instead of serving an incomplete successful sitemap.
  const auctions = await getAuctions();
  const paths = new Set(["/leiloes", "/faca-seu-leilao"]);

  for (const auction of auctions.filter(isPublicAuction)) {
    paths.add(auctionPath(auction.slug));
    for (const lot of auction.lots) {
      if (["OPEN", "SOLD", "CLOSED"].includes(lot.status)) {
        paths.add(lotPath(auction.slug, lot.slug));
      }
    }
  }

  // The catalog has no update timestamps; don't substitute event or request dates.
  return [...paths].map((path) => ({ url: absoluteUrl(path) }));
}
