"use client";

import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { createMarketplaceHandoffAction } from "@/hooks/actions/ssoActions";

const marketplaceUrl = (
  process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://localhost:3000"
).replace(/\/$/, "");

interface MarketplaceHandoffLinkProps {
  pathname: string;
  children: ReactNode;
  className?: string;
}

export function MarketplaceHandoffLink({
  pathname,
  children,
  className,
}: MarketplaceHandoffLinkProps) {
  const [isPending, setIsPending] = useState(false);
  const directUrl = `${marketplaceUrl}${pathname}`;

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (isPending) return;

    setIsPending(true);
    const result = await createMarketplaceHandoffAction(pathname);
    window.location.assign(result.url || directUrl);
  }

  return (
    <a
      href={directUrl}
      onClick={handleClick}
      className={className}
      aria-busy={isPending}
    >
      {children}
    </a>
  );
}
