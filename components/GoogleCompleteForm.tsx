"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { completeGoogleLogin, type GooglePending } from "@/lib/auth/server/google-actions";

export function GoogleCompleteForm({ pending, returnTo, termsBase = "" }: { pending: GooglePending; returnTo: string; termsBase?: string }) {
  const router = useRouter();
  const [accountType, setAccountType] = useState(pending.accountType);
  const [name, setName] = useState(pending.name);
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [password, setPassword] = useState("");
  const [confirmLink, setConfirmLink] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isNew = pending.newAccount;
  const needsPhone = pending.needsPhone;
  const needsDocument = isNew || pending.needsDocument;
  const needsName = isNew || pending.needsName;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (pending.linkRequired && !confirmLink) { setError("Confirme o vínculo para continuar."); return; }
    if (isNew && !acceptedTerms) { setError("Aceite os termos para criar sua conta."); return; }
    const digits = document.replace(/\D/g, "");
    if (needsPhone && !/^\d{10,11}$/.test(phone.replace(/\D/g, ""))) { setError("Informe um telefone com DDD válido."); return; }
    if (needsDocument && digits.length !== (accountType === "COMPANY" ? 14 : 11)) { setError(accountType === "COMPANY" ? "Informe um CNPJ com 14 dígitos." : "Informe um CPF com 11 dígitos."); return; }
    setBusy(true);
    const result = await completeGoogleLogin({ confirmLink, acceptedTerms, password, accountType, name, phone, cpf: accountType !== "COMPANY" ? digits : "", cnpj: accountType === "COMPANY" ? digits : "" });
    setBusy(false);
    if (!result.success) { setError(result.error); return; }
    router.replace(returnTo); router.refresh();
  }

  return <form onSubmit={submit} className="space-y-5" noValidate>
    <p className="text-sm text-gray-600">Conta Google: <strong>{pending.email}</strong></p>
    {pending.linkRequired && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-gray-800"><p>Já existe uma conta Princesa Rural com este email. Confirme para vinculá-la ao Google.</p><label className="mt-3 flex items-start gap-2"><input type="checkbox" checked={confirmLink} onChange={event => setConfirmLink(event.target.checked)} className="mt-1" /><span>Sim, quero vincular minha conta existente.</span></label></div>}
    {pending.passwordRequired && <label className="block text-sm font-medium">Senha da conta existente<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-3" /></label>}
    {!pending.linkRequired && isNew && <label className="block text-sm font-medium">Tipo de conta<select value={accountType} onChange={event => { setAccountType(event.target.value as "PERSON" | "COMPANY"); setDocument(""); }} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-3"><option value="PERSON">Pessoa física</option><option value="COMPANY">Empresa</option></select></label>}
    {needsName && <label className="block text-sm font-medium">Nome completo<input value={name} onChange={event => setName(event.target.value)} autoComplete="name" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-3" /></label>}
    {needsPhone && <label className="block text-sm font-medium">Telefone com DDD<input value={phone} onChange={event => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-3" /></label>}
    {needsDocument && <label className="block text-sm font-medium">{accountType === "COMPANY" ? "CNPJ" : "CPF"}<input value={document} onChange={event => setDocument(event.target.value)} inputMode="numeric" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-3" /></label>}
    {isNew && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={acceptedTerms} onChange={event => setAcceptedTerms(event.target.checked)} className="mt-1" /><span>Li e aceito os <Link href={`${termsBase}/termos`} target="_blank" className="underline">termos de uso</Link> e a <Link href={`${termsBase}/privacidade`} target="_blank" className="underline">política de privacidade</Link>.</span></label>}
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="min-h-12 w-full rounded-md bg-green-600 px-5 font-semibold text-white disabled:opacity-60">{busy ? "Concluindo..." : pending.linkRequired ? "Vincular e entrar" : "Concluir e entrar"}</button>
  </form>;
}
