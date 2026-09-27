import Link from "next/link";
import { GoogleCompleteForm } from "@/components/GoogleCompleteForm";
import { getGooglePending } from "@/lib/auth/server/google-actions";
import { getMarketplaceUrl } from "@/lib/config/urls";

export default async function GoogleCompletePage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/leiloes";
  const pending = await getGooglePending();
  return <main className="flex min-h-[calc(100vh-105px)] items-center justify-center bg-[#f7f8f7] px-4 py-10"><div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-sm sm:p-8"><h1 className="text-2xl font-bold">Conclua seu acesso com Google</h1><p className="mb-6 mt-2 text-gray-600">Confirme sua conta e preencha os dados necessários para continuar.</p>{pending ? <GoogleCompleteForm pending={pending} returnTo={safeReturnTo} termsBase={getMarketplaceUrl()} /> : <p>Seu acesso expirou. <Link href="/login" className="text-green-700 underline">Voltar ao login</Link></p>}</div></main>;
}
