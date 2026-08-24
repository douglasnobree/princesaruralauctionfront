"use client";

import { Eye, EyeOff, FileText, Gavel, LoaderCircle, Mail, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  registerAuctionAccountAction,
  type AuctionRegistrationInput,
} from "@/hooks/actions/auctionRegistrationActions";

type AccountType = "PERSON" | "COMPANY";

type FormValues = AuctionRegistrationInput & {
  confirmation: string;
  acceptedTerms: boolean;
};

type FieldErrors = Partial<Record<keyof FormValues | "_form", string>>;

const initialValues: FormValues = {
  accountType: "PERSON",
  name: "",
  document: "",
  phone: "",
  email: "",
  password: "",
  confirmation: "",
  acceptedTerms: false,
};

function formatDocument(value: string, accountType: AccountType) {
  const digits = value.replace(/\D/g, "");
  if (accountType === "PERSON") {
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

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = "Informe seu nome completo.";
  if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errors.email = "Informe um e-mail válido.";
  if (values.password.length < 6) errors.password = "A senha deve ter no mínimo 6 caracteres.";
  if (values.password !== values.confirmation) errors.confirmation = "As senhas precisam ser iguais.";

  const documentLength = values.document.replace(/\D/g, "").length;
  if (documentLength !== (values.accountType === "PERSON" ? 11 : 14)) {
    errors.document = values.accountType === "PERSON"
      ? "Informe um CPF válido com 11 dígitos."
      : "Informe um CNPJ válido com 14 dígitos.";
  }

  if (!values.acceptedTerms) errors.acceptedTerms = "Aceite os termos para continuar.";
  return errors;
}

function FieldMessage({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-medium text-red-700" role="alert">
      {message}
    </p>
  );
}

export function AuctionRegisterForm() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (Object.keys(errors).length > 0) errorSummaryRef.current?.focus();
  }, [errors]);

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, _form: undefined }));
  }

  function changeAccountType(accountType: AccountType) {
    setValues((current) => ({ ...current, accountType, document: "" }));
    setErrors((current) => ({ ...current, document: undefined, _form: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clientErrors = validate(values);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setIsSubmitting(true);
    const result = await registerAuctionAccountAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const [key, messages] of Object.entries(result.errors)) {
        nextErrors[key as keyof FieldErrors] = messages[0];
      }
      setErrors(nextErrors);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="py-8 text-center" role="status" aria-live="polite">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#e5f4ed] text-[#08734e]">
          <Gavel aria-hidden="true" className="size-8" strokeWidth={1.8} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-slate-950">Conta criada com sucesso</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          Agora entre com seus dados para acompanhar leilões e solicitar sua habilitação para participar.
        </p>
        <Link
          href="/login"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-md bg-[#08734e] px-6 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(8,115,78,0.18)] transition-[background-color,transform] hover:bg-[#075b3e] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24] focus-visible:ring-offset-2"
        >
          Entrar na conta
        </Link>
      </div>
    );
  }

  const documentLabel = values.accountType === "PERSON" ? "CPF" : "CNPJ";
  const documentPlaceholder = values.accountType === "PERSON" ? "000.000.000-00" : "00.000.000/0000-00";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      <div
        ref={errorSummaryRef}
        tabIndex={-1}
        className={errors._form ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none focus-visible:ring-2 focus-visible:ring-red-600" : "sr-only"}
        role={errors._form ? "alert" : undefined}
      >
        {errors._form}
      </div>

      <fieldset>
        <legend className="flex items-center gap-2 text-sm font-semibold text-[#08734e]">
          <UserRound aria-hidden="true" className="size-4" strokeWidth={1.8} />
          Dados pessoais
        </legend>
        <div className="mt-3 h-px bg-[#08734e]/40" />

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="register-name" className="mb-1.5 block text-xs font-medium text-slate-700">Nome completo</label>
            <input
              id="register-name"
              name="name"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              autoComplete="name"
              placeholder="Digite seu nome completo"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "register-name-error" : undefined}
              className="register-input"
            />
            <FieldMessage id="register-name-error" message={errors.name} />
          </div>

          <div className="sm:col-span-2">
            <fieldset>
              <legend className="mb-2 block text-xs font-medium text-slate-700">Tipo de cadastro</legend>
              <div className="flex flex-wrap gap-2">
                {(["PERSON", "COMPANY"] as const).map((accountType) => (
                  <label key={accountType} className={`cursor-pointer rounded-md border px-3 py-2 text-xs font-semibold transition-[background-color,border-color,color,box-shadow] focus-within:ring-2 focus-within:ring-[#f08a24] focus-within:ring-offset-1 ${values.accountType === accountType ? "border-[#08734e] bg-[#e5f4ed] text-[#075b3e]" : "border-slate-200 text-slate-600 hover:border-[#08734e]/50"}`}>
                    <input
                      type="radio"
                      name="accountType"
                      value={accountType}
                      checked={values.accountType === accountType}
                      onChange={() => changeAccountType(accountType)}
                      className="sr-only"
                    />
                    {accountType === "PERSON" ? "Pessoa física" : "Empresa"}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="register-document" className="mb-1.5 block text-xs font-medium text-slate-700">{documentLabel}</label>
            <div className="relative">
              <FileText aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
              <input
                id="register-document"
                name="document"
                value={values.document}
                onChange={(event) => update("document", formatDocument(event.target.value, values.accountType))}
                inputMode="numeric"
                autoComplete="off"
                placeholder={documentPlaceholder}
                aria-invalid={Boolean(errors.document)}
                aria-describedby={errors.document ? "register-document-error" : undefined}
                className="register-input register-input-with-icon"
              />
            </div>
            <FieldMessage id="register-document-error" message={errors.document} />
          </div>

          <div>
            <label htmlFor="register-phone" className="mb-1.5 block text-xs font-medium text-slate-700">Telefone/WhatsApp</label>
            <div className="relative">
              <Phone aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
              <input
                id="register-phone"
                name="phone"
                value={values.phone}
                onChange={(event) => update("phone", formatPhone(event.target.value))}
                inputMode="tel"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                className="register-input register-input-with-icon"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1.5 block text-xs font-medium text-slate-700">E-mail</label>
            <div className="relative">
              <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
              <input
                id="register-email"
                name="email"
                value={values.email}
                onChange={(event) => update("email", event.target.value)}
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "register-email-error" : undefined}
                className="register-input register-input-with-icon"
              />
            </div>
            <FieldMessage id="register-email-error" message={errors.email} />
          </div>

          <PasswordField
            id="register-password"
            label="Senha"
            value={values.password}
            visible={showPassword}
            onChange={(value) => update("password", value)}
            onToggle={() => setShowPassword((current) => !current)}
            error={errors.password}
            autoComplete="new-password"
          />
          <PasswordField
            id="register-confirmation"
            label="Confirmar senha"
            value={values.confirmation}
            visible={showConfirmation}
            onChange={(value) => update("confirmation", value)}
            onToggle={() => setShowConfirmation((current) => !current)}
            error={errors.confirmation}
            autoComplete="new-password"
          />
        </div>
      </fieldset>

      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-slate-700">
          <input
            type="checkbox"
            checked={values.acceptedTerms}
            onChange={(event) => update("acceptedTerms", event.target.checked)}
            aria-invalid={Boolean(errors.acceptedTerms)}
            aria-describedby={errors.acceptedTerms ? "register-terms-error" : "register-terms-description"}
            className="mt-0.5 size-4 shrink-0 accent-[#08734e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24] focus-visible:ring-offset-2"
          />
          <span id="register-terms-description">
            Li e aceito os{" "}
            <a
              href={`${(process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://localhost:3000").replace(/\/$/, "")}/termos`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#08734e] underline underline-offset-2 hover:text-[#075b3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24]"
            >
              Termos de Uso
            </a>{" "}
            e a{" "}
            <a
              href={`${(process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://localhost:3000").replace(/\/$/, "")}/privacidade`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#08734e] underline underline-offset-2 hover:text-[#075b3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24]"
            >
              Política de privacidade
            </a>.
          </span>
        </label>
        <FieldMessage id="register-terms-error" message={errors.acceptedTerms} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#08734e] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(8,115,78,0.18)] transition-[background-color,transform,box-shadow] hover:bg-[#075b3e] hover:shadow-[0_10px_22px_rgba(8,115,78,0.22)] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24] focus-visible:ring-offset-2"
      >
        {isSubmitting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
        {isSubmitting ? "Concluindo cadastro..." : "Concluir cadastro"}
      </button>
    </form>
  );
}

function PasswordField({
  id,
  label,
  value,
  visible,
  onChange,
  onToggle,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  error?: string;
  autoComplete: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-700">{label}</label>
      <div className="relative">
        <input
          id={id}
          name={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder="••••••••"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="register-input pr-11"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24]"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </button>
      </div>
      <FieldMessage id={errorId} message={error} />
    </div>
  );
}
