"use client";

import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { createMarketplaceHandoffAction } from "@/hooks/actions/ssoActions";

interface MarketplaceHandoffLinkProps {
  pathname: string;
  baseUrl: string;
  children: ReactNode;
  className?: string;
}

export function MarketplaceHandoffLink({
  pathname,
  baseUrl,
  children,
  className,
}: MarketplaceHandoffLinkProps) {
  const [isPending, setIsPending] = useState(false);
  const directUrl = `${baseUrl.replace(/\/$/, "")}${pathname}`;

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
