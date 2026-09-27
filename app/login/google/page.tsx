import Link from "next/link";
import { GoogleCompleteForm } from "@/components/GoogleCompleteForm";
import { getGooglePending } from "@/lib/auth/server/google-actions";
import { getMarketplaceUrl } from "@/lib/config/urls";

export default async function GoogleCompletePage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/leiloes";
  const pending = await getGooglePending();
  const loginHref = `/login?returnTo=${encodeURIComponent(safeReturnTo)}`;

  return (
    <div className="min-h-[calc(100vh-105px)] bg-[#f7f8f7] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-[760px]">
        <header className="mb-7">
          <h1 className="text-balance text-3xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-4xl">
            {pending ? pending.linkRequired ? "Vincule sua conta ao Google" : "Complete seu cadastro" : "Seu acesso expirou"}
          </h1>
          <p className="mt-3 max-w-[62ch] text-base leading-7 text-slate-600">
            {pending
              ? pending.linkRequired
                ? "Confirme o vínculo com a conta que você já usa na plataforma e informe os dados que faltarem."
                : "Só faltam alguns dados para você entrar nos leilões com sua Conta Google."
              : "Por segurança, esta etapa tem tempo limitado. Inicie o login com Google novamente."}
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
          {pending ? (
            <GoogleCompleteForm pending={pending} returnTo={safeReturnTo} termsBase={getMarketplaceUrl()} />
          ) : (
            <Link href={loginHref} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#247c49] px-5 py-3 font-semibold text-white hover:bg-[#175a35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fbaa34]">
              Voltar ao login
            </Link>
          )}
        </section>

        {pending && (
          <p className="mt-6 text-center text-sm text-slate-600">
            Quer usar outra conta?{" "}
            <Link href={loginHref} className="font-semibold text-[#17663d] underline underline-offset-2 hover:text-[#104d2e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fbaa34]">Voltar ao login</Link>
          </p>
        )}
      </div>
    </div>
  );
}
