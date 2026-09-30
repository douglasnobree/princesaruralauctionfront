import type { Metadata } from "next";
import Link from "next/link";
import { AuctionRegisterForm } from "@/components/Auth/AuctionRegisterForm";
import { getMarketplaceUrl } from "@/lib/config/urls";
import { AuctionAuthLayout } from "@/components/Auth/AuctionAuthLayout";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta para participar dos leilões do PR Leilões.",
  robots: { index: false, follow: false },
};

export default async function AuctionRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/leiloes";

  return (
    <AuctionAuthLayout registration>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-balance">
            Criar sua conta
          </h1>
          <p className="mt-2 max-w-[62ch] text-sm leading-6 text-slate-600 sm:text-base">
            Preencha seus dados para acompanhar lotes, habilitar sua participação e enviar lances.
          </p>
        </header>

        <div>
          <AuctionRegisterForm marketplaceUrl={getMarketplaceUrl()} returnTo={safeReturnTo} />
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Já possui uma conta?{" "}
          <Link
            href={`/login?returnTo=${encodeURIComponent(safeReturnTo)}`}
            className="font-semibold text-[#28834c] underline decoration-[#28834c]/30 underline-offset-4 transition-colors hover:text-[#062518] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbaa34] focus-visible:ring-offset-2"
          >
            Entrar
          </Link>
        </p>
    </AuctionAuthLayout>
  );
}
