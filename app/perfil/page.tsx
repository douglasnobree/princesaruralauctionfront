import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getFreshSession } from "@/lib/auth/server/session";

export const metadata: Metadata = {
  title: "Meu perfil",
  description: "Consulte sua conta PR Leilões e gerencie sua participação.",
  robots: { index: false, follow: false },
};

const accountLabels: Record<string, string> = {
  ADMIN: "Administrador",
  MODERATOR: "Moderador",
  PERSON: "Pessoa física",
  COMPANY: "Empresa",
  VENDOR: "Vendedor",
  JOURNALIST: "Jornalista",
  PARTNER: "Parceiro",
};

export default async function AuctionProfilePage() {
  const session = await getFreshSession();
  if (!session) redirect("/login?returnTo=%2Fperfil");

  return (
    <div className="min-h-[calc(100vh-105px)] bg-[#f7f8f7] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/leiloes"
          className="inline-flex min-h-10 items-center rounded-md text-sm font-semibold text-[#17633e] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbaa34] focus-visible:ring-offset-2"
        >
          Voltar aos leilões
        </Link>
        <header className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#28834c]">
            PR Leilões
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-4xl">
            Meu perfil
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Dados da conta usada para acompanhar e participar dos leilões.
          </p>
        </header>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="profile-account-title">
          <h2 id="profile-account-title" className="text-lg font-semibold text-slate-950">
            Conta
          </h2>
          <dl className="mt-5 divide-y divide-slate-100">
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-sm text-slate-500">E-mail</dt>
              <dd className="break-all text-sm font-medium text-slate-900">{session.user.email}</dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-sm text-slate-500">Tipo de conta</dt>
              <dd className="text-sm font-medium text-slate-900">
                {accountLabels[session.user.accountType] ?? session.user.accountType}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="profile-notifications-title">
          <h2 id="profile-notifications-title" className="text-lg font-semibold text-slate-950">
            Notificações dos leilões
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Os avisos de lances, superações e arremates são enviados pelo WhatsApp nos leilões em que você autorizou o contato. Para cada leilão, habilite ou revogue essa autorização na própria página depois de solicitar participação.
          </p>
          <Link
            href="/leiloes"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#08734e] px-4 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#075b3e] focus-visible:ring-2 focus-visible:ring-[#fbaa34] focus-visible:ring-offset-2"
          >
            Ver leilões
          </Link>
        </section>
      </div>
    </div>
  );
}
