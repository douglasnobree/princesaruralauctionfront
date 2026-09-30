import type { Metadata } from "next";
import Link from "next/link";
import { AuctionLoginForm } from "@/components/Auth/AuctionLoginForm";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { AuctionAuthLayout } from "@/components/Auth/AuctionAuthLayout";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre para acompanhar e participar dos leilões do PR Leilões.",
  robots: { index: false, follow: false },
};

export default async function AuctionLoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; googleError?: string }> }) {
  const { returnTo, googleError } = await searchParams;
  const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/leiloes";
  return (
    <AuctionAuthLayout>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-balance">
            Entrar na sua conta
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Entre com seu e-mail, CPF ou CNPJ e senha para acessar os leilões.
          </p>
        </header>

        <div>
          <AuctionLoginForm returnTo={safeReturnTo} />
          {googleError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Não foi possível entrar com o Google. Tente novamente.</p>}
          <GoogleLoginButton returnTo={safeReturnTo} />
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Ainda não possui uma conta?{" "}
          <Link
            href={`/cadastro?returnTo=${encodeURIComponent(safeReturnTo)}`}
            className="font-semibold text-[#28834c] underline decoration-[#28834c]/30 underline-offset-4 transition-colors hover:text-[#062518] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbaa34] focus-visible:ring-offset-2"
          >
            Cadastre-se
          </Link>
        </p>
    </AuctionAuthLayout>
  );
}
