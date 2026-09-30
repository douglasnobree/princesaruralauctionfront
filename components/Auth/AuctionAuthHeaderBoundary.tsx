"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function AuctionAuthHeaderBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname === "/login" || pathname === "/cadastro" ? null : children;
}
