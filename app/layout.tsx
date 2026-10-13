import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuctionHeader } from "@/components/AuctionHeader/AuctionHeader";
import { AcquisitionCapture } from "@/components/Auction/AcquisitionCapture";
import { AuctionAuthHeaderBoundary } from "@/components/Auth/AuctionAuthHeaderBoundary";
import { AuctionMotion } from "@/components/Motion/AuctionMotion";
import { getAuctionAppUrl } from "@/lib/config/urls";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/seo";
import { siteStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/Seo/JsonLd";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getAuctionAppUrl()),
  title: {
    default: `${SITE_TITLE} | ${SITE_NAME}`,
    template: "%s | PR Leilões",
  },
  description: SITE_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
  applicationName: "PR Leilões",
  category: "agriculture",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/pr-leiloes/favicon.svg", type: "image/svg+xml" },
      {
        url: "/brand/pr-leiloes/favicon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcut: "/brand/pr-leiloes/favicon.svg",
    apple: {
      url: "/brand/pr-leiloes/favicon.png",
      sizes: "512x512",
      type: "image/png",
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "PR Leilões",
    title: `${SITE_TITLE} | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/brand/pr-leiloes/share-preview.png",
        width: 1200,
        height: 630,
        alt: "PR Leilões",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_TITLE} | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    images: ["/brand/pr-leiloes/share-preview.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#062518",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <JsonLd data={siteStructuredData()} />
        {/* PR Leilões: identidade própria, navegação focada em disputa, lotes e participação; verde floresta, verde folha, amarelo ouro e controles compactos de marketplace. */}
        <AuctionAuthHeaderBoundary><AuctionHeader /></AuctionAuthHeaderBoundary>
        <AcquisitionCapture />
        <AuctionMotion />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
