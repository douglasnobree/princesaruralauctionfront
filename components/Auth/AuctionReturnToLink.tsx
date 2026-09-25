"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function AuctionReturnToLink({
  href,
  className,
  children,
}: {
  href: "/login" | "/cadastro";
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    router.push(`${href}?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
