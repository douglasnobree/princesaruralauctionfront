import type { Metadata } from "next";
import { AccessDenied } from "@/components/Management/AccessDenied";
export const metadata: Metadata = {
  title: "Acesso negado",
  robots: { index: false, follow: false },
};
export default function AuctionAccessDeniedPage() { return <div className="min-h-screen bg-[#f4f7f5] px-4 py-16"><AccessDenied /></div>; }
