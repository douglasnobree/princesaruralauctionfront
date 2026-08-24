"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { PrincesaLogoIcon } from "@/components/AuctionHeader/PrincesaRuralIcon";

type SsoHandoffProps = {
  ticket?: string;
  returnTo?: string;
};

type HandoffState = "connecting" | "success" | "error";
type HandoffError = "invalid" | "expired" | "unavailable";

const errorCopy: Record<
  HandoffError,
  { title: string; description: string }
> = {
  invalid: {
    title: "Esse acesso não pôde ser reconhecido",
    description:
      "O link de conexão não está completo. Você pode entrar normalmente para continuar.",
  },
  expired: {
    title: "Esse acesso expirou",
    description:
      "Por segurança, cada conexão é válida por pouco tempo. Gere um novo acesso e tente novamente.",
  },
  unavailable: {
    title: "A conexão demorou mais que o esperado",
    description:
      "Sua conta continua segura. Tente de novo ou entre manualmente para acessar os leilões.",
  },
};

function getSafeDestination(returnTo: string | undefined) {
  const fallback = new URL("/leiloes", window.location.origin);
  if (!returnTo) return fallback.toString();

  try {
    const target = new URL(returnTo);
    const allowedOrigins = new Set([
      window.location.origin,
      "https://princesarural.com.br",
      "https://prleiloes.com",
    ]);
    return allowedOrigins.has(target.origin)
      ? target.toString()
      : fallback.toString();
  } catch {
    return fallback.toString();
  }
}

export function SsoHandoff({ ticket, returnTo }: SsoHandoffProps) {
  const [state, setState] = useState<HandoffState>("connecting");
  const [error, setError] = useState<HandoffError>("unavailable");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    let redirectTimer: number | undefined;

    async function connect() {
      if (!ticket) {
        setError("invalid");
        setState("error");
        window.clearTimeout(timeout);
        return;
      }

      try {
        const callback = new URL(
          "/api/auth/sso/callback",
          window.location.origin,
        );
        callback.searchParams.set("ticket", ticket);
        callback.searchParams.set(
          "returnTo",
          new URL("/leiloes", window.location.origin).toString(),
        );
        callback.searchParams.set("format", "json");

        const response = await fetch(callback, {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as {
          success?: boolean;
          error?: HandoffError;
        } | null;

        if (!response.ok || !data?.success) {
          const nextError = data?.error ?? (response.status === 401 ? "expired" : "unavailable");
          setError(nextError);
          setState("error");
          return;
        }

        setState("success");
        redirectTimer = window.setTimeout(() => {
          window.location.replace(getSafeDestination(returnTo));
        }, 520);
      } catch {
        if (!controller.signal.aborted) {
          setError("unavailable");
          setState("error");
        }
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void connect();

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
      if (redirectTimer) window.clearTimeout(redirectTimer);
    };
  }, [attempt, returnTo, ticket]);

  const isError = state === "error";
  const copy = errorCopy[error];

  return (
    <section className="relative isolate min-h-[calc(100svh-92px)] overflow-hidden bg-[#063b2b] text-[#14372a]">
      <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden="true">
        <div className="absolute -left-20 top-16 size-64 rounded-full border border-[#f6b04e]/25 sm:size-96" />
        <div className="absolute -right-24 bottom-[-9rem] size-96 rounded-full border border-white/10 sm:size-[32rem]" />
        <svg className="absolute right-0 top-0 h-full w-2/3" viewBox="0 0 800 700" fill="none">
          <path d="M800 88C629 88 530 178 530 326s-91 286-282 286" stroke="#f6b04e" strokeOpacity=".16" />
          <path d="M800 124C650 124 568 204 568 326s-80 250-250 250" stroke="white" strokeOpacity=".12" />
          <path d="M800 162C671 162 606 227 606 326s-69 214-218 214" stroke="#f6b04e" strokeOpacity=".12" />
        </svg>
      </div>

      <div className="relative mx-auto flex min-h-[calc(100svh-92px)] w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/10 bg-[#f8f6ef] shadow-[0_26px_80px_rgba(0,0,0,.28)] lg:grid-cols-[.84fr_1.16fr]">
          <aside className="relative hidden overflow-hidden bg-[#0a5d3e] p-10 text-white lg:flex lg:min-h-[570px] lg:flex-col lg:justify-between">
            <div className="absolute -right-16 -top-16 size-52 rounded-full border border-[#f6b04e]/30" aria-hidden="true" />
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#fff7e8] shadow-[0_8px_24px_rgba(0,0,0,.14)]">
                  <PrincesaLogoIcon size={39} aria-hidden="true" />
                </span>
                <span className="leading-none">
                  <span className="block text-[9px] font-bold tracking-[.28em] text-[#f6b04e]">PRINCESA</span>
                  <span className="block text-3xl font-light tracking-[-.08em]">RURAL</span>
                </span>
              </div>
              <p className="mt-16 max-w-[17rem] text-sm font-medium uppercase tracking-[.22em] text-white/60">
                Uma conta. Dois mundos.
              </p>
              <h2 className="mt-4 max-w-sm text-4xl font-semibold leading-[1.02] tracking-[-.045em]">
                Do campo ao lance, sem perder o passo.
              </h2>
              <p className="mt-6 max-w-sm text-base leading-7 text-white/72">
                Estamos levando você para uma experiência de leilões feita para acompanhar cada oportunidade.
              </p>
            </div>

            <div className="flex items-center gap-3 border-t border-white/15 pt-6 text-sm text-white/70">
              <LockKeyhole className="size-4 text-[#f6b04e]" aria-hidden="true" />
              <span>Sessão protegida entre ambientes Princesa Rural</span>
            </div>
          </aside>

          <div className="flex min-h-[570px] flex-col justify-center px-6 py-9 sm:px-12 sm:py-12">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#e8f0df]">
                <PrincesaLogoIcon size={36} aria-hidden="true" />
              </span>
              <span className="leading-none">
                <span className="block text-[8px] font-bold tracking-[.24em] text-[#0a5d3e]">PRINCESA</span>
                <span className="block text-2xl font-light tracking-[-.08em] text-[#0a5d3e]">RURAL</span>
              </span>
            </div>

            <div className="max-w-xl">
              <div className="mb-7 flex items-center gap-3">
                <span className={`grid size-14 place-items-center rounded-[19px] ${isError ? "bg-[#fff0e8] text-[#bd542d]" : "bg-[#e8f0df] text-[#0a5d3e]"}`}>
                  {isError ? (
                    <CircleAlert className="size-7" strokeWidth={1.8} aria-hidden="true" />
                  ) : state === "success" ? (
                    <Check className="size-7" strokeWidth={2.2} aria-hidden="true" />
                  ) : (
                    <LoaderCircle className="size-7 animate-spin" strokeWidth={1.8} aria-hidden="true" />
                  )}
                </span>
                <div>
                  <p className={`text-[11px] font-bold uppercase tracking-[.18em] ${isError ? "text-[#bd542d]" : "text-[#0a5d3e]"}`}>
                    {isError ? "Acesso interrompido" : state === "success" ? "Acesso confirmado" : "Conexão segura"}
                  </p>
                  <p className="mt-1 text-sm text-[#627166]">
                    {isError ? "Uma pequena correção e você continua" : "Sincronizando sua conta agora"}
                  </p>
                </div>
              </div>

              <div role="status" aria-live="polite" aria-busy={state === "connecting"}>
                <h1 className="max-w-lg text-4xl font-semibold leading-[1.04] tracking-[-.045em] text-[#153c2d] sm:text-5xl">
                  {isError ? copy.title : state === "success" ? "Tudo pronto para o próximo lance" : "Abrindo seus leilões"}
                </h1>
                <p className="mt-5 max-w-lg text-base leading-7 text-[#64736a] sm:text-lg">
                  {isError
                    ? copy.description
                    : state === "success"
                      ? "Sua sessão foi conectada. Só estamos abrindo o ambiente certo para você."
                      : "Só um instante — estamos conectando sua sessão ao ambiente de leilões."}
                </p>
              </div>

              {isError ? (
                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setAttempt((current) => current + 1)}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0a5d3e] px-5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(10,93,62,.18)] outline-none transition-[background-color,transform,box-shadow] hover:bg-[#084d34] hover:shadow-[0_13px_26px_rgba(10,93,62,.24)] focus-visible:ring-2 focus-visible:ring-[#f0a33f] focus-visible:ring-offset-2 active:translate-y-px"
                  >
                    <RotateCcw className="size-4" aria-hidden="true" />
                    Tentar novamente
                  </button>
                  <a
                    href="/login?sso=unavailable"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#cfd8cd] px-5 text-sm font-bold text-[#0a5d3e] outline-none transition-[background-color,border-color] hover:border-[#0a5d3e] hover:bg-[#eef4ea] focus-visible:ring-2 focus-visible:ring-[#f0a33f] focus-visible:ring-offset-2"
                  >
                    Entrar manualmente
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </a>
                </div>
              ) : (
                <div className="mt-10 space-y-4" aria-label="Etapas da conexão">
                  {[
                    "Validando sua sessão",
                    "Conectando ao ambiente de leilões",
                    "Preparando sua chegada",
                  ].map((step, index) => {
                    const completed = state === "success" || index === 0;
                    const active = state === "connecting" && index === 1;
                    return (
                      <div key={step} className="flex items-center gap-3 text-sm">
                        <span className={`grid size-6 place-items-center rounded-full border ${completed ? "border-[#0a5d3e] bg-[#0a5d3e] text-white" : active ? "border-[#f0a33f] text-[#bd7a20]" : "border-[#d8e0d5] text-[#a4b0a6]"}`}>
                          {completed ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
                        </span>
                        <span className={completed || active ? "font-semibold text-[#284d3c]" : "text-[#a1aaa3]"}>{step}</span>
                        {active && <span className="ml-auto text-xs font-semibold text-[#bd7a20]">agora</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-auto flex items-center gap-2 pt-10 text-xs text-[#809087]">
              <ShieldCheck className="size-4 text-[#0a5d3e]" aria-hidden="true" />
              <span>Seus dados continuam protegidos durante a conexão.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
