"use client";

import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  loginAuctionAction,
  type AuctionLoginInput,
} from "@/hooks/actions/auctionLoginActions";

type LoginType = AuctionLoginInput["loginType"];

function detectLoginType(value: string): LoginType {
  if (value.includes("@") || /[A-Za-z]/.test(value)) return "email";
  const digits = value.replace(/\D/g, "");
  return digits.length > 11 ? "cnpj" : "cpf";
}

function formatDocument(value: string, loginType: LoginType) {
  if (loginType === "email") return value;
  const digits = value.replace(/\D/g, "");
  if (loginType === "cpf") {
    return digits
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function AuctionLoginForm() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const loginType = detectLoginType(login);
    if (!login.trim() || password.length < 6) {
      setError(!login.trim() ? "Informe seu e-mail, CPF ou CNPJ." : "A senha deve ter no mínimo 6 caracteres.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    setIsSubmitting(true);
    const result = await loginAuctionAction({ login, loginType, password });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    if (result.ssoUrl) {
      window.location.assign(result.ssoUrl);
    } else {
      router.replace("/leiloes");
      router.refresh();
    }
  }

  const loginType = detectLoginType(login);
  const placeholder = loginType === "email" ? "seu@email.com" : loginType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div
        ref={errorRef}
        tabIndex={-1}
        className={error ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-5 text-red-800 outline-none focus-visible:ring-2 focus-visible:ring-red-600" : "sr-only"}
        role={error ? "alert" : undefined}
      >
        {error}
      </div>

      <div>
        <label htmlFor="auction-login" className="mb-1.5 block text-xs font-medium text-slate-700">
          E-mail, CPF ou CNPJ
        </label>
        <div className="relative">
          <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
          <input
            id="auction-login"
            name="login"
            value={loginType === "email" ? login : formatDocument(login, loginType)}
            onChange={(event) => setLogin(event.target.value)}
            type={loginType === "email" ? "email" : "text"}
            inputMode={loginType === "email" ? "email" : "numeric"}
            autoComplete="username"
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
            className="register-input register-input-with-icon"
          />
        </div>
      </div>

      <div>
        <label htmlFor="auction-password" className="mb-1.5 block text-xs font-medium text-slate-700">Senha</label>
        <div className="relative">
          <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
          <input
            id="auction-password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={Boolean(error)}
            className="register-input register-input-with-icon pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24]"
          >
            {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#08734e] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(8,115,78,0.18)] transition-[background-color,transform,box-shadow] hover:bg-[#075b3e] hover:shadow-[0_10px_22px_rgba(8,115,78,0.22)] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24] focus-visible:ring-offset-2"
      >
        {isSubmitting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
