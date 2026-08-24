import { CalendarDays, Gavel, Search, ShoppingBag, ShoppingCart, UserRound } from "lucide-react";
import Link from "next/link";
import { getUser } from "@/lib/auth/server/session";
import { PrincesaLogoIcon } from "@/components/AuctionHeader/PrincesaRuralIcon";

const marketplaceUrl = (process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://localhost:3000").replace(/\/$/, "");

const navigation = [
  { label: "Agenda", href: "/leiloes#agenda", icon: CalendarDays },
  { label: "Leilões", href: "/leiloes", icon: Gavel, active: true },
  { label: "Mercado", href: `${marketplaceUrl}/busca`, icon: ShoppingCart, external: true },
  { label: "Shopping", href: `${marketplaceUrl}/lojas`, icon: ShoppingBag, external: true },
];

export async function AuctionHeader() {
  const user = await getUser();

  return (
    <header className="sticky top-0 z-50 text-white shadow-[0_3px_16px_rgba(0,0,0,0.12)]"> 

      <div className="bg-[#056942]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3 py-2 md:flex-nowrap md:gap-5 md:py-1.5">
            <Link
              href="/leiloes"
              className="shrink-0 rounded-sm outline-none transition-[filter,transform] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white/80 active:scale-[0.96]"
              aria-label="Princesa Rural Leilões"
            >
              <span className="flex items-center gap-1.5 text-white" aria-hidden="true">
                <PrincesaLogoIcon size={36} className="brightness-0 invert sm:size-10" />
                <span className="flex flex-col leading-[0.84]">
                  <span className="text-[7px] font-semibold tracking-[0.16em]">PRINCESA</span>
                  <span className="text-[22px] font-light tracking-[-0.07em] sm:text-[25px]">RURAL</span>
                </span>
              </span>
            </Link>

            <form action="/leiloes" className="order-3 w-full md:order-2 md:flex-1">
              <label htmlFor="auction-search" className="sr-only">
                Buscar leilões
              </label>
              <div className="relative">
                <input
                  id="auction-search"
                  name="q"
                  type="search"
                  placeholder="Buscar leilões"
                  className="h-8 w-full rounded-md border border-white/20 bg-white px-3 pe-10 text-sm text-[#183428] shadow-sm outline-none placeholder:text-[#567065] focus-visible:ring-2 focus-visible:ring-[#f6b04e]"
                />
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-[#056942]"
                />
              </div>
            </form>

            <div className="hidden h-8 w-px bg-white/25 md:block" aria-hidden="true" />

            {user ? (
              <a
                href={`${marketplaceUrl}/perfil`}
                className="order-2 inline-flex min-h-8 max-w-[12rem] items-center gap-2 rounded-full border border-white/75 px-3 text-xs font-medium outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/80 md:order-3"
              >
                <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{user.email}</span>
              </a>
            ) : (
              <div className="order-2 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/75 px-3 text-xs font-medium md:order-3">
                <UserRound className="size-3.5" aria-hidden="true" />
                <Link href="/login" className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80">
                  Entrar
                </Link>
                <span className="text-white/55">ou</span>
                <Link href="/cadastro" className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80">
                  cadastre-se
                </Link>
              </div>
            )}
          </div>

          <nav aria-label="Navegação principal" className="-mx-1 flex min-w-0 gap-1 overflow-x-auto pb-1 sm:gap-2">
            {navigation.map(({ label, href, icon: Icon, active, external }) => {
              const className = `inline-flex min-h-7 shrink-0 items-center gap-2 rounded-md px-2 text-[11px] font-bold uppercase tracking-[0.02em] outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/80 sm:px-3 ${active ? "bg-white/10 text-white" : "text-white/90"}`;
              return external ? (
                <a key={label} href={href} className={className}>
                  <Icon className="size-3.5" aria-hidden="true" />
                  {label}
                </a>
              ) : (
                <Link key={label} href={href} className={className}>
                  <Icon className="size-3.5" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
