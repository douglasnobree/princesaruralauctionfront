import type { Auction, AuctionLot } from "@/lib/auctions/types";
import {
  absoluteUrl,
  auctionDescription,
  auctionPath,
  lotDescription,
  lotPath,
  shareImage,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/seo";

export function siteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": absoluteUrl("/#organization"),
        name: SITE_NAME,
        url: absoluteUrl("/"),
        logo: absoluteUrl("/brand/pr-leiloes/favicon.png"),
      },
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        name: SITE_NAME,
        url: absoluteUrl("/"),
        description: SITE_DESCRIPTION,
        inLanguage: "pt-BR",
        publisher: { "@id": absoluteUrl("/#organization") },
      },
    ],
  };
}

export function breadcrumbStructuredData(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function listingStructuredData(auctions: Auction[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Agenda de leilões rurais",
    itemListElement: auctions.map((auction, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: auction.title,
      url: absoluteUrl(auctionPath(auction.slug)),
    })),
  };
}

export function auctionStructuredData(auction: Auction) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: auction.title,
    description: auctionDescription(auction),
    url: absoluteUrl(auctionPath(auction.slug)),
    image: shareImage(auction.image),
    inLanguage: "pt-BR",
    isPartOf: { "@id": absoluteUrl("/#website") },
  };
}

export function lotStructuredData(auction: Auction, lot: AuctionLot) {
  const images = (lot.images.length ? lot.images.map((image) => image.url) : [lot.image])
    .filter((image) => image !== "/placeholder-image.svg")
    .map((image) => absoluteUrl(image));
  return {
    "@context": "https://schema.org",
    "@type": "ItemPage",
    name: `Lote ${lot.number}: ${lot.title}`,
    url: absoluteUrl(lotPath(auction.slug, lot.slug)),
    description: lotDescription(auction, lot),
    inLanguage: "pt-BR",
    isPartOf: { "@id": absoluteUrl("/#website") },
    mainEntity: {
      "@type": "Product",
      name: lot.title,
      description: lotDescription(auction, lot),
      ...(images.length ? { image: images } : {}),
      category: lot.category === "ANIMAL" ? "Animais" : "Máquinas",
      additionalProperty: lot.details.map(({ label, value }) => ({
        "@type": "PropertyValue",
        name: label,
        value,
      })),
    },
  };
}
