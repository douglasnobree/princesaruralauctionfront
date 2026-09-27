"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { completeGoogleLogin, type GooglePending } from "@/lib/auth/server/google-actions";

type Field = "name" | "phone" | "document" | "password" | "confirmLink" | "acceptedTerms";
type FieldErrors = Partial<Record<Field, string>>;

const inputClass = "mt-2 block min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 placeholder:text-slate-500 aria-invalid:border-red-500 focus-visible:border-[#28834c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fbaa34]";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatDocument(value: string, company: boolean) {
  const digits = value.replace(/\D/g, "").slice(0, company ? 14 : 11);
  return company
    ? digits.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d)/, "$1-$2")
    : digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1-$2");
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} role="alert" className="mt-2 text-sm font-medium text-red-700">{message}</p> : null;
}

export function GoogleCompleteForm({ pending, returnTo, termsBase = "" }: { pending: GooglePending; returnTo: string; termsBase?: string }) {
  const router = useRouter();
  const [accountType, setAccountType] = useState(pending.accountType);
  const [name, setName] = useState(pending.name);
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [password, setPassword] = useState("");
  const [confirmLink, setConfirmLink] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const isNew = pending.newAccount;
  const needsName = isNew || pending.needsName;
  const needsPhone = pending.needsPhone;
  const needsDocument = isNew || pending.needsDocument;
  const needsProfile = needsName || needsPhone || needsDocument;
  const company = accountType === "COMPANY";

  function clearError(field: Field) {
    setErrors(current => ({ ...current, [field]: undefined }));
    setFormError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const nextErrors: FieldErrors = {};
    if (pending.linkRequired && !confirmLink) nextErrors.confirmLink = "Confirme o vínculo para continuar.";
    if (pending.passwordRequired && !password) nextErrors.password = "Informe a senha da conta existente.";
    if (needsName && !name.trim()) nextErrors.name = "Informe seu nome.";
    if (needsPhone && !/^\d{10,11}$/.test(phone.replace(/\D/g, ""))) nextErrors.phone = "Informe um telefone com DDD válido.";
    const digits = document.replace(/\D/g, "");
    if (needsDocument && digits.length !== (company ? 14 : 11)) nextErrors.document = company ? "Informe um CNPJ com 14 dígitos." : "Informe um CPF com 11 dígitos.";
    if (isNew && !acceptedTerms) nextErrors.acceptedTerms = "Aceite os termos para criar sua conta.";
    setErrors(nextErrors);
    const firstInvalid = (Object.keys(nextErrors) as Field[])[0];
    if (firstInvalid) {
      if (firstInvalid === "confirmLink") linkRef.current?.focus();
      if (firstInvalid === "password") passwordRef.current?.focus();
      if (firstInvalid === "name") nameRef.current?.focus();
      if (firstInvalid === "phone") phoneRef.current?.focus();
      if (firstInvalid === "document") documentRef.current?.focus();
      if (firstInvalid === "acceptedTerms") termsRef.current?.focus();
      return;
    }

    setBusy(true);
    try {
      const result = await completeGoogleLogin({
        confirmLink, acceptedTerms, password, accountType, name: name.trim(), phone,
        cpf: company ? "" : digits, cnpj: company ? digits : "",
      });
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      router.replace(returnTo);
      router.refresh();
    } catch {
      setFormError("Não foi possível concluir o acesso. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-7">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm font-medium text-slate-600">Email da Conta Google</p>
        <p className="mt-1 break-all text-base font-semibold text-slate-950">{pending.email}</p>
      </div>

      {pending.linkRequired && (
        <section aria-labelledby="google-link-title" className="rounded-xl bg-[#edf6ef] p-5 sm:p-6">
          <h2 id="google-link-title" className="text-lg font-semibold text-[#123d27]">Conta já cadastrada</h2>
          <p className="mt-2 text-sm leading-6 text-[#31543e]">Este email já tem uma conta na Princesa Rural. Confirme que deseja usar o Google para entrar nela.</p>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-[#b9d7c3] bg-white p-4 text-sm font-medium leading-6 text-slate-900 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#fbaa34]">
            <input ref={linkRef} type="checkbox" required checked={confirmLink} onChange={event => { setConfirmLink(event.target.checked); clearError("confirmLink"); }} aria-invalid={Boolean(errors.confirmLink)} aria-describedby={errors.confirmLink ? "google-link-error" : undefined} className="mt-1 size-5 shrink-0 accent-[#28834c]" />
            <span>Sim, quero vincular minha conta ao Google.</span>
          </label>
          <FieldError id="google-link-error" message={errors.confirmLink} />
          {pending.passwordRequired && (
            <div className="mt-5">
              <label htmlFor="google-existing-password" className="block text-sm font-semibold text-slate-800">Senha da conta existente</label>
              <input ref={passwordRef} id="google-existing-password" type="password" autoComplete="current-password" required value={password} onChange={event => { setPassword(event.target.value); clearError("password"); }} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "google-password-error" : undefined} className={inputClass} />
              <FieldError id="google-password-error" message={errors.password} />
            </div>
          )}
        </section>
      )}

      {isNew && !pending.linkRequired && (
        <fieldset>
          <legend className="text-lg font-semibold text-slate-950">Tipo de conta</legend>
          <p className="mt-1 text-sm leading-6 text-slate-600">Escolha o tipo de cadastro para informar o documento correto.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["PERSON", "COMPANY"] as const).map(type => (
              <label key={type} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#fbaa34] ${accountType === type ? "border-[#28834c] bg-[#edf6ef] text-[#123d27]" : "border-slate-300 bg-white text-slate-700 hover:border-[#28834c]"}`}>
                <input type="radio" name="google-account-type" value={type} checked={accountType === type} onChange={() => { setAccountType(type); setDocument(""); clearError("document"); }} className="size-4 accent-[#28834c]" />
                {type === "PERSON" ? "Pessoa física" : "Empresa"}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {needsProfile && (
        <section aria-labelledby="google-profile-title">
          <h2 id="google-profile-title" className="text-lg font-semibold text-slate-950">Dados para concluir</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Preencha as informações obrigatórias que ainda faltam.</p>
          <div className="mt-5 grid gap-x-5 gap-y-5 sm:grid-cols-2">
            {needsName && (
              <div className="sm:col-span-2">
                <label htmlFor="google-name" className="block text-sm font-semibold text-slate-800">{company ? "Nome do responsável" : "Nome completo"}</label>
                <input ref={nameRef} id="google-name" name="name" autoComplete="name" required value={name} onChange={event => { setName(event.target.value); clearError("name"); }} placeholder={company ? "Nome de quem representa a empresa" : "Seu nome completo"} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "google-name-error" : undefined} className={inputClass} />
                <FieldError id="google-name-error" message={errors.name} />
              </div>
            )}
            {needsPhone && (
              <div>
                <label htmlFor="google-phone" className="block text-sm font-semibold text-slate-800">Telefone com DDD</label>
                <input ref={phoneRef} id="google-phone" name="tel" type="tel" inputMode="tel" autoComplete="tel" required maxLength={15} value={phone} onChange={event => { setPhone(formatPhone(event.target.value)); clearError("phone"); }} placeholder="(00) 00000-0000" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "google-phone-error" : undefined} className={inputClass} />
                <FieldError id="google-phone-error" message={errors.phone} />
              </div>
            )}
            {needsDocument && (
              <div>
                <label htmlFor="google-document" className="block text-sm font-semibold text-slate-800">{company ? "CNPJ" : "CPF"}</label>
                <input ref={documentRef} id="google-document" name={company ? "cnpj" : "cpf"} inputMode="numeric" required maxLength={company ? 18 : 14} value={document} onChange={event => { setDocument(formatDocument(event.target.value, company)); clearError("document"); }} placeholder={company ? "00.000.000/0000-00" : "000.000.000-00"} aria-invalid={Boolean(errors.document)} aria-describedby={errors.document ? "google-document-error" : undefined} className={inputClass} />
                <FieldError id="google-document-error" message={errors.document} />
              </div>
            )}
          </div>
        </section>
      )}

      {isNew && (
        <div className="border-t border-slate-200 pt-6">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-700 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#fbaa34]">
            <input ref={termsRef} type="checkbox" required checked={acceptedTerms} onChange={event => { setAcceptedTerms(event.target.checked); clearError("acceptedTerms"); }} aria-invalid={Boolean(errors.acceptedTerms)} aria-describedby={errors.acceptedTerms ? "google-terms-error" : undefined} className="mt-1 size-5 shrink-0 accent-[#28834c]" />
            <span>Li e aceito os <Link href={`${termsBase}/termos`} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#17663d] underline underline-offset-2 hover:text-[#104d2e]">termos de uso</Link> e a <Link href={`${termsBase}/privacidade`} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#17663d] underline underline-offset-2 hover:text-[#104d2e]">política de privacidade</Link>.</span>
          </label>
          <FieldError id="google-terms-error" message={errors.acceptedTerms} />
        </div>
      )}

      <div className="border-t border-slate-200 pt-6">
        {formError && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{formError}</p>}
        <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center rounded-lg bg-[#247c49] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[#175a35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fbaa34] disabled:cursor-wait disabled:opacity-60">
          {busy ? "Concluindo acesso…" : pending.linkRequired ? "Vincular conta e entrar" : "Concluir cadastro e entrar"}
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-slate-500">{pending.linkRequired ? "Sua conta existente continuará disponível." : "Você poderá entrar com esta Conta Google nas próximas visitas."}</p>
      </div>
    </form>
  );
}
