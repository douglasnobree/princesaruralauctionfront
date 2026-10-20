"use client";

import { Gavel, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MarketplaceHandoffLink } from "@/components/AuctionHeader/MarketplaceHandoffLink";

const navigation = [
  { label: "Leilões", href: "/leiloes", icon: Gavel },
  { label: "Faça seu leilão", href: "/faca-seu-leilao", icon: Gavel },
  { label: "Princesa Rural", href: "/", icon: Home, handoff: true },
];

export function AuctionNavigation({ marketplaceUrl }: { marketplaceUrl: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className="-mx-1 flex min-w-0 gap-1 overflow-x-auto pb-1 sm:gap-2">
      {navigation.map(({ label, href, icon: Icon, handoff }) => {
        const active = !handoff && (pathname === href || pathname.startsWith(`${href}/`));
        const className = `inline-flex min-h-11 md:min-h-7 shrink-0 items-center gap-2 rounded-md px-2 text-[11px] font-bold uppercase tracking-[0.02em] outline-none transition-colors hover:bg-[#28834c]/70 focus-visible:ring-2 focus-visible:ring-[#fbaa34] sm:px-3 ${active ? "bg-[#28834c]/70 text-white" : "text-white/90"}`;
        return handoff ? (
          <MarketplaceHandoffLink key={label} pathname={href} baseUrl={marketplaceUrl} className={className}>
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </MarketplaceHandoffLink>
        ) : (
          <Link key={label} href={href} className={className} aria-current={active ? "page" : undefined}>
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
