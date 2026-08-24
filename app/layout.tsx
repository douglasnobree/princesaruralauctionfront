import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuctionHeader } from "@/components/AuctionHeader/AuctionHeader";

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
    process.env.NEXT_PUBLIC_AUCTION_APP_URL || "http://localhost:3001",
  ),
  title: {
    default: "Leilões | Princesa Rural",
    template: "%s | Leilões Princesa Rural",
  },
  description:
    "Acompanhe os leilões rurais da Princesa Rural, consulte lotes e participe das disputas.",
  applicationName: "Leilões Princesa Rural",
  category: "agriculture",
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
        {/* THESIS: o leilão merece uma entrada própria, com a mesma clareza da Princesa Rural e uma navegação focada em disputa, lotes e participação. OWN-WORLD: verde profundo, branco de alto contraste, laranja pontual e controles compactos de marketplace. STORY: a pessoa encontra a agenda, abre um leilão, escolhe um lote e participa. FIRST VIEWPORT: marca e busca na primeira linha, agenda de leilões logo abaixo, ação primária no conteúdo. FORM: extensão do mundo visual existente, sem trocar a linguagem do produto. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md */}
        <AuctionHeader />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
