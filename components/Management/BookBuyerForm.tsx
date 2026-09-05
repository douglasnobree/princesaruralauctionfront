"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBookBuyerAction } from "@/hooks/actions/auctionActions";
import type { AuctionReportBuyerDetail } from "@/types/auction-report";

export function BookBuyerForm({ auctionId, buyer }: { auctionId: string; buyer: AuctionReportBuyerDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [values, setValues] = useState({ document: buyer.document || "", phone: buyer.phone || "", email: buyer.email || "", street: buyer.address?.street || "", number: buyer.address?.number || "", complement: buyer.address?.complement || "", neighborhood: buyer.address?.neighborhood || "", city: buyer.address?.city || "", state: buyer.address?.state || "", zipCode: buyer.address?.zipCode || "" });
  const labels = { document: "CPF/CNPJ", phone: "Telefone", email: "E-mail", street: "Rua / estrada", number: "Número (ou s/n)", complement: "Complemento", neighborhood: "Bairro / localidade", city: "Cidade", state: "UF", zipCode: "CEP" };
  return <form className="rounded-lg border border-amber-200 bg-white p-4" onSubmit={(event) => {
    event.preventDefault(); setMessage("");
    if (!buyer.participantId) return;
    startTransition(async () => {
      const { document, phone, email, ...address } = values;
      const result = await updateBookBuyerAction(auctionId, buyer.participantId!, { document: document.replace(/\D/g, ""), ...(phone.trim() ? { phone: phone.trim() } : {}), ...(email.trim() ? { email: email.trim() } : {}), address: { ...address, state: address.state.trim().toUpperCase(), zipCode: address.zipCode.replace(/\D/g, "") } });
      setMessage(result.success ? "Dados salvos no book." : result.error || "Falha ao salvar.");
      if (result.success) router.refresh();
    });
  }}>
    <h3 className="font-bold">{buyer.name}</h3>
    <p className="mt-1 text-sm">Lotes: {buyer.lotNumbers.join(", ")}. Identificação automática pelo lance vencedor.</p>
    <p className="mt-1 text-xs">As correções abaixo ficam vinculadas a este book.</p>
    <fieldset disabled={pending || !buyer.participantId} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {(Object.keys(labels) as (keyof typeof values)[]).map((key) => <label key={key} className="grid gap-1 text-xs font-semibold">{labels[key]}<input className="management-field w-full" type={key === "email" ? "email" : "text"} required={!["phone", "email", "complement"].includes(key)} value={values[key]} maxLength={key === "state" ? 2 : 200} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></label>)}
      <button className="min-h-10 self-end rounded-md bg-[#075b3e] px-4 font-semibold text-white focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50" type="submit">{pending ? "Salvando…" : "Salvar cadastro do book"}</button>
    </fieldset>
    {!buyer.participantId ? <p role="alert" className="mt-2 text-sm text-red-800">Não foi possível identificar o cadastro do vencedor. Atualize o relatório quando o histórico estiver disponível.</p> : null}
    <p role="status" className="mt-2 text-sm">{message}</p>
  </form>;
}
