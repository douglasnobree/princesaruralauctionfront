import type { Metadata } from "next";
import Link from "next/link";
import { AuctionLoginForm } from "@/components/Auth/AuctionLoginForm";

export const metadata: Metadata = {
  title: "Entrar | Leilões Princesa Rural",
  description: "Entre para acompanhar e participar dos leilões da Princesa Rural.",
  robots: { index: false, follow: false },
};

export default async function AuctionLoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/leiloes";
  return (
    <div className="min-h-[calc(100vh-105px)] bg-[#f7f8f7] px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto w-full max-w-[440px]">
        <header className="mb-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#08734e]">
            Acesso aos leilões
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-4xl">
            Entre na sua conta
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Use os mesmos dados da sua conta Princesa Rural para acompanhar lotes e enviar lances.
          </p>
        </header>

        <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-8">
          <AuctionLoginForm returnTo={safeReturnTo} />
        </section>

        <p className="mt-6 text-center text-sm text-slate-600">
          Ainda não possui uma conta?{" "}
          <Link
            href="/cadastro"
            className="font-semibold text-[#08734e] underline decoration-[#08734e]/30 underline-offset-4 transition-colors hover:text-[#075b3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24] focus-visible:ring-offset-2"
          >
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
