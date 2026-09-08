import { CalendarDays, Gavel, Home, LayoutDashboard, Search, ShoppingBag, ShoppingCart, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getUser } from "@/lib/auth/server/session";
import { getMarketplaceUrl } from "@/lib/config/urls";
import { AUCTION_MANAGEMENT_ROLES } from "@/types/role-permissions";
import { MarketplaceHandoffLink } from "@/components/AuctionHeader/MarketplaceHandoffLink";

const navigation = [
  { label: "Agenda", href: "/leiloes#agenda", icon: CalendarDays },
  { label: "Leilões", href: "/leiloes", icon: Gavel, active: true },
  { label: "Mercado", href: "/leiloes?tipo=mercado#agenda", icon: ShoppingCart },
  { label: "Shopping", href: "/leiloes?tipo=shopping#agenda", icon: ShoppingBag },
  { label: "PrincesaRural", href: "/", icon: Home, handoff: true },
];

export async function AuctionHeader() {
  const user = await getUser();
  const marketplaceUrl = getMarketplaceUrl();
  const canViewManagement = user
    ? AUCTION_MANAGEMENT_ROLES.includes(
        user.accountType as (typeof AUCTION_MANAGEMENT_ROLES)[number],
      )
    : false;

  return (
    <header className="sticky top-0 z-50 text-white shadow-[0_3px_16px_rgba(0,0,0,0.12)]"> 

      <div className="bg-[#062518]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3 py-2 md:flex-nowrap md:gap-5 md:py-1.5">
            <Link
              href="/leiloes"
              className="shrink-0 rounded-sm outline-none transition-[filter,transform] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white/80 active:scale-[0.96]"
              aria-label="PR Leilões"
            >
              <Image
                src="/brand/pr-leiloes/logo-horizontal-white.svg"
                alt="PR Leilões"
                width={247}
                height={43}
                priority
                className="hidden h-auto w-[9.25rem] sm:block"
              />
              <Image
                src="/brand/pr-leiloes/logo-icon.svg"
                alt=""
                width={512}
                height={512}
                priority
                aria-hidden="true"
                className="size-9 brightness-0 invert sm:hidden"
              />
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
                  className="h-8 w-full rounded-md border border-white/20 bg-white px-3 pe-10 text-sm text-[#062518] shadow-sm outline-none placeholder:text-[#567065] focus-visible:ring-2 focus-visible:ring-[#fbaa34]"
                />
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-[#28834c]"
                />
              </div>
            </form>

            <div className="hidden h-8 w-px bg-white/25 md:block" aria-hidden="true" />

            {canViewManagement ? (
              <Link
                href="/admin/leiloes"
                className="order-2 inline-flex min-h-8 items-center gap-2 rounded-md bg-[#fbaa34] px-3 text-xs font-bold text-[#062518] outline-none transition-[background-color,transform] hover:bg-[#ffc267] focus-visible:ring-2 focus-visible:ring-white/80 active:scale-[0.96] md:order-3"
              >
                <LayoutDashboard className="size-3.5" aria-hidden="true" />
                Administração
              </Link>
            ) : null}

            {user ? (
              <MarketplaceHandoffLink
                pathname="/perfil"
                baseUrl={marketplaceUrl}
                className="order-2 inline-flex min-h-8 max-w-[12rem] items-center gap-2 rounded-full border border-white/75 px-3 text-xs font-medium outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/80 md:order-3"
              >
                <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{user.email}</span>
              </MarketplaceHandoffLink>
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
            {navigation.map(({ label, href, icon: Icon, active, handoff }) => {
              const className = `inline-flex min-h-7 shrink-0 items-center gap-2 rounded-md px-2 text-[11px] font-bold uppercase tracking-[0.02em] outline-none transition-colors hover:bg-[#28834c]/70 focus-visible:ring-2 focus-visible:ring-[#fbaa34] sm:px-3 ${active ? "bg-[#28834c]/70 text-white" : "text-white/90"}`;
              return handoff ? (
                <MarketplaceHandoffLink key={label} pathname={href} baseUrl={marketplaceUrl} className={className}>
                  <Icon className="size-3.5" aria-hidden="true" />
                  {label}
                </MarketplaceHandoffLink>
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
