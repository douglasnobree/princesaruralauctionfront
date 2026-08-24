import type { Metadata } from "next";
import { SsoHandoff } from "@/components/Auth/SsoHandoff";

export const metadata: Metadata = {
  title: "Conectando aos leilões",
  robots: { index: false, follow: false },
};

type SsoPageProps = {
  searchParams: Promise<{
    ticket?: string;
    returnTo?: string;
  }>;
};

export default async function SsoPage({ searchParams }: SsoPageProps) {
  const params = await searchParams;
  return <SsoHandoff ticket={params.ticket} returnTo={params.returnTo} />;
}
