import type { Metadata } from "next";
import { getAuctionAppUrl } from "@/lib/config/urls";
import type { Auction, AuctionLot } from "@/lib/auctions/types";

export const SITE_NAME = "PR Leilões";
export const SITE_TITLE = "Leilões rurais online de animais e máquinas";
export const SITE_DESCRIPTION =
  "Confira a agenda de leilões rurais online da PR Leilões. Consulte lotes de animais e máquinas, acompanhe leilões ao vivo e participe com seu cadastro.";
export const DEFAULT_SHARE_IMAGE = "/brand/pr-leiloes/share-preview.png";

export function absoluteUrl(path: string) {
  return new URL(path, `${getAuctionAppUrl()}/`).toString();
}

export function auctionPath(slug: string) {
  return `/leiloes/${encodeURIComponent(slug)}`;
}

export function lotPath(auctionSlug: string, lotSlug: string) {
  return `${auctionPath(auctionSlug)}/lotes/${encodeURIComponent(lotSlug)}`;
}

export function seoDescription(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= 160) return text;
  const excerpt = text.slice(0, 157);
  const lastSpace = excerpt.lastIndexOf(" ");
  return `${lastSpace > 100 ? excerpt.slice(0, lastSpace) : excerpt}…`;
}

export function shareImage(image?: string | null) {
  return absoluteUrl(
    !image || image === "/placeholder-image.svg" ? DEFAULT_SHARE_IMAGE : image,
  );
}

export function publicPageMetadata({
  title,
  description,
  path,
  image,
  noindex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  noindex?: boolean;
}): Metadata {
  const summary = seoDescription(description);
  const url = absoluteUrl(path);
  const imageUrl = shareImage(image);
  const socialTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description: summary,
    alternates: { canonical: url },
    robots: {
      index: !noindex,
      follow: true,
      googleBot: { index: !noindex, follow: true, "max-image-preview": "large" },
    },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: SITE_NAME,
      title: socialTitle,
      description: summary,
      url,
      images: [{ url: imageUrl, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: summary,
      images: [imageUrl],
    },
  };
}

export function auctionDescription(auction: Auction) {
  return seoDescription(
    auction.description?.trim() ||
      `${auction.title}: consulte ${auction.lotCount} lotes e acompanhe o leilão de ${auction.date}, às ${auction.time}, na PR Leilões.`,
  );
}

export function lotDescription(auction: Auction, lot: AuctionLot) {
  const details = lot.details.map(({ label, value }) => `${label}: ${value}`).join(". ");
  return seoDescription(
    `Lote ${lot.number}: ${lot.title}, no leilão ${auction.title}. ${details || lot.documentText || "Consulte fotos, informações e condições de participação na PR Leilões."}`,
  );
}
