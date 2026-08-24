"use client";

import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { createMarketplaceHandoffAction } from "@/hooks/actions/ssoActions";

const PUBLIC_MARKETPLACE_ORIGIN = "https://princesarural.com.br";

function normalizeMarketplaceOrigin(value: string) {
  try {
    const url = new URL(value);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.hostname === "0.0.0.0"
    ) {
      return PUBLIC_MARKETPLACE_ORIGIN;
    }

    return url.origin;
  } catch {
    return PUBLIC_MARKETPLACE_ORIGIN;
  }
}

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
  const marketplaceOrigin = normalizeMarketplaceOrigin(baseUrl);
  const directUrl = `${marketplaceOrigin}${pathname}`;

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (isPending) return;

    setIsPending(true);
    const result = await createMarketplaceHandoffAction(pathname);
    let targetUrl = directUrl;

    try {
      const candidateUrl = new URL(result.url || directUrl);
      if (candidateUrl.origin === marketplaceOrigin) {
        targetUrl = candidateUrl.toString();
      }
    } catch {
      // Mantém a navegação no domínio oficial do marketplace.
    }

    window.location.assign(targetUrl);
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
