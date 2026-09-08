import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuctionHeader } from "@/components/AuctionHeader/AuctionHeader";
import { AcquisitionCapture } from "@/components/Auction/AcquisitionCapture";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_AUCTION_APP_URL || "https://prleiloes.com",
  ),
  title: {
    default: "PR Leilões | Leilões rurais",
    template: "%s | PR Leilões",
  },
  description:
    "Acompanhe leilões rurais, consulte lotes e participe das disputas no PR Leilões.",
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
    title: "PR Leilões | Leilões rurais",
    description:
      "Acompanhe leilões rurais, consulte lotes e participe das disputas no PR Leilões.",
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
    title: "PR Leilões | Leilões rurais",
    description:
      "Acompanhe leilões rurais, consulte lotes e participe das disputas no PR Leilões.",
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
        {/* PR Leilões: identidade própria, navegação focada em disputa, lotes e participação; verde floresta, verde folha, amarelo ouro e controles compactos de marketplace. */}
        <AuctionHeader />
        <AcquisitionCapture />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
