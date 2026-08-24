import type { Metadata } from "next";
import Link from "next/link";
import { AuctionRegisterForm } from "@/components/Auth/AuctionRegisterForm";
import { getMarketplaceUrl } from "@/lib/config/urls";

export const metadata: Metadata = {
  title: "Criar conta | Leilões Princesa Rural",
  description: "Crie sua conta para participar dos leilões da Princesa Rural.",
  robots: { index: false, follow: false },
};

export default function AuctionRegisterPage() {
  return (
    <div id="main-content" className="min-h-[calc(100vh-105px)] bg-[#f7f8f7] px-4 py-10 sm:px-6 lg:py-14">
      <div className="mx-auto w-full max-w-[760px]">
        <header className="mb-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#08734e]">
            Participação em leilões
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-4xl">
            Crie sua conta
          </h1>
          <p className="mt-2 max-w-[62ch] text-sm leading-6 text-slate-600 sm:text-base">
            Preencha seus dados para acompanhar lotes, habilitar sua participação e enviar lances.
          </p>
        </header>

        <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-8">
          <AuctionRegisterForm marketplaceUrl={getMarketplaceUrl()} />
        </section>

        <p className="mt-6 text-center text-sm text-slate-600">
          Já possui uma conta?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#08734e] underline decoration-[#08734e]/30 underline-offset-4 transition-colors hover:text-[#075b3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24] focus-visible:ring-offset-2"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
