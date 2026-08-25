"use client";

import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { createMarketplaceHandoffAction } from "@/hooks/actions/ssoActions";
import { SsoHandoff } from "@/components/Auth/SsoHandoff";

const PUBLIC_MARKETPLACE_ORIGIN = "https://princesarural.com.br";
const MINIMUM_HANDOFF_TIME = 2400;
const MAXIMUM_HANDOFF_WAIT = 12000;

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
    const startedAt = performance.now();
    let fallbackTimer: number | undefined;
    const fallbackResult = new Promise<{ success: true; url: string }>((resolve) => {
      fallbackTimer = window.setTimeout(
        () => resolve({ success: true, url: directUrl }),
        MAXIMUM_HANDOFF_WAIT,
      );
    });
    const handoff = createMarketplaceHandoffAction(pathname).catch(() => ({
      success: true,
      url: directUrl,
    }));
    const result = await Promise.race([
      handoff,
      fallbackResult,
    ]);
    if (fallbackTimer) window.clearTimeout(fallbackTimer);
    const remainingScreenTime = Math.max(
      0,
      MINIMUM_HANDOFF_TIME - (performance.now() - startedAt),
    );
    if (remainingScreenTime > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, remainingScreenTime));
    }
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
    <>
      <a
        href={directUrl}
        onClick={handleClick}
        className={className}
        aria-busy={isPending}
      >
        {children}
      </a>
      {isPending ? <SsoHandoff mode="preview" target="marketplace" overlay /> : null}
    </>
  );
}
