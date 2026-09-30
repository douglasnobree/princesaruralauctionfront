import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

export function AuctionAuthLayout({
  children,
  registration = false,
}: {
  children: ReactNode;
  registration?: boolean;
}) {
  const benefits = registration
    ? ["Cadastro de pessoa física ou empresa", "Acompanhe os lotes de seu interesse", "Solicite sua habilitação para dar lances"]
    : ["Acompanhe os leilões", "Consulte os lotes e seus detalhes", "Envie lances nos leilões em que estiver habilitado"];

  return (
    <div id="main-content" className="auction-auth flex min-h-svh bg-gray-50">
      <aside className="relative hidden w-2/5 flex-col justify-between overflow-hidden bg-linear-to-br from-[#28834c] to-[#0d603f] p-10 text-white lg:flex xl:p-12">
        <Image src="/brand/pr-leiloes/logo-icon.svg" alt="" width={800} height={800} aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-40 w-[130%] rotate-12 opacity-[0.08] brightness-0 invert" />
        <Link href="/leiloes" aria-label="Voltar aos leilões" className="relative w-fit rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <Image src="/brand/pr-leiloes/logo-horizontal-white.svg" alt="PR Leilões" width={247} height={43} priority className="h-auto w-56" />
        </Link>
        <div className="relative py-16">
          <h2 className="max-w-sm text-4xl font-bold leading-tight text-balance">
            {registration ? "Seu próximo lance começa aqui" : "Bem-vindo de volta!"}
          </h2>
          <p className="mt-6 max-w-sm text-lg leading-relaxed text-white/90">
            {registration
              ? "Crie sua conta e participe dos leilões da Princesa Rural. Explore os lotes e prepare-se para as próximas oportunidades."
              : "Entre na sua conta para acompanhar os lotes e continuar sua participação nos leilões."}
          </p>
          <ul className="mt-8 space-y-4">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm font-medium leading-6">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15" aria-hidden="true"><Check className="size-4" /></span>
                <span className="pt-1">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/80">© {new Date().getFullYear()} PR Leilões. Todos os direitos reservados.</p>
      </aside>
      <div className="flex min-w-0 flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:p-12">
        <div className={`w-full ${registration ? "max-w-xl" : "max-w-md"}`}>
          <Link href="/leiloes" className="mb-8 inline-flex min-h-11 items-center gap-2 rounded text-sm text-slate-600 transition-colors hover:text-[#0d603f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28834c] focus-visible:ring-offset-2">
            <ArrowLeft className="size-4" aria-hidden="true" /> Voltar aos leilões
          </Link>
          <div className="mb-8 lg:hidden">
            <Image src="/brand/pr-leiloes/logo-horizontal-color.svg" alt="PR Leilões" width={247} height={43} priority className="h-auto w-44" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
