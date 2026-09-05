"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateBookBuyerAction } from "@/hooks/actions/auctionActions";
import type { AuctionReportBuyerDetail } from "@/types/auction-report";

type BuyerFormValues = {
  document: string;
  phone: string;
  email: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  farmName: string;
  farmDocument: string;
  farmState: string;
  farmCity: string;
};

const buyerFields: Array<{ key: keyof BuyerFormValues; label: string; type?: string }> = [
  { key: "document", label: "CPF/CNPJ" },
  { key: "phone", label: "Telefone" },
  { key: "email", label: "E-mail", type: "email" },
  { key: "street", label: "Rua / estrada" },
  { key: "number", label: "Número (ou s/n)" },
  { key: "complement", label: "Complemento" },
  { key: "neighborhood", label: "Bairro / localidade" },
  { key: "city", label: "Cidade do comprador" },
  { key: "state", label: "UF do comprador" },
  { key: "zipCode", label: "CEP" },
];

const farmFields: Array<{ key: keyof BuyerFormValues; label: string; type?: string }> = [
  { key: "farmName", label: "Nome da fazenda" },
  { key: "farmDocument", label: "CPF/CNPJ da fazenda" },
  { key: "farmState", label: "UF da fazenda" },
  { key: "farmCity", label: "Cidade da fazenda" },
];

const optionalFields: Array<keyof BuyerFormValues> = ["phone", "email", "complement"];
const autocompleteByField: Partial<Record<keyof BuyerFormValues, string>> = {
  street: "address-line1",
  city: "address-level2",
  state: "address-level1",
  zipCode: "postal-code",
  farmName: "organization",
};

function initialValues(buyer: AuctionReportBuyerDetail): BuyerFormValues {
  return {
    document: buyer.document || "",
    phone: buyer.phone || "",
    email: buyer.email || "",
    street: buyer.address?.street || "",
    number: buyer.address?.number || "",
    complement: buyer.address?.complement || "",
    neighborhood: buyer.address?.neighborhood || "",
    city: buyer.address?.city || "",
    state: buyer.address?.state || "",
    zipCode: buyer.address?.zipCode || "",
    farmName: buyer.farmName || "",
    farmDocument: buyer.farmDocument || "",
    farmState: buyer.farmState || "",
    farmCity: buyer.farmCity || "",
  };
}

export function BookBuyerForm({ auctionId, buyer }: { auctionId: string; buyer: AuctionReportBuyerDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [values, setValues] = useState(() => initialValues(buyer));

  function updateValue(key: keyof BuyerFormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!buyer.participantId) return;

    startTransition(async () => {
      const { document, phone, email, farmName, farmDocument, farmState, farmCity, street, number, complement, neighborhood, city, state, zipCode } = values;
      const result = await updateBookBuyerAction(auctionId, buyer.participantId!, {
        document: document.replace(/\D/g, ""),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        farmName: farmName.trim(),
        farmDocument: farmDocument.replace(/\D/g, ""),
        farmState: farmState.trim().toUpperCase(),
        farmCity: farmCity.trim(),
        address: {
          street: street.trim(),
          number: number.trim(),
          ...(complement.trim() ? { complement: complement.trim() } : {}),
          neighborhood: neighborhood.trim(),
          city: city.trim(),
          state: state.trim().toUpperCase(),
          zipCode: zipCode.replace(/\D/g, ""),
        },
      });
      setMessage(result.success ? "Dados salvos no book." : result.error || "Falha ao salvar.");
      if (result.success) router.refresh();
    });
  }

  function renderField(field: { key: keyof BuyerFormValues; label: string; type?: string }) {
    const isState = field.key === "state" || field.key === "farmState";
    const isDocument = field.key === "document" || field.key === "farmDocument";
    return (
      <label key={field.key} className="grid gap-1 text-xs font-semibold text-slate-700">
        {field.label}
        <input
          className="management-field w-full"
          name={field.key}
          type={field.type || "text"}
          inputMode={isState ? "text" : isDocument ? "numeric" : undefined}
          autoComplete={autocompleteByField[field.key]}
          required={!optionalFields.includes(field.key)}
          value={values[field.key]}
          maxLength={isState ? 2 : isDocument ? 18 : 200}
          onChange={(event) => updateValue(field.key, event.target.value)}
        />
      </label>
    );
  }

  return (
    <form className="rounded-lg border border-amber-200 bg-white p-4" onSubmit={save}>
      <h3 className="font-bold text-slate-900">{buyer.name}</h3>
      <p className="mt-1 text-sm text-slate-700">Lotes: {buyer.lotNumbers.join(", ")}. O comprador é identificado automaticamente pelo lance vencedor.</p>
      <p className="mt-1 text-xs text-slate-600">Preencha os dados uma única vez; eles ficam vinculados a este book.</p>

      <fieldset disabled={pending || !buyer.participantId} className="mt-4 space-y-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-800">Dados do comprador</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{buyerFields.map(renderField)}</div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-800">Dados da fazenda</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{farmFields.map(renderField)}</div>
        </div>
        <button className="min-h-10 rounded-md bg-[#075b3e] px-4 font-semibold text-white focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50" type="submit">
          {pending ? "Salvando…" : "Salvar cadastro do book"}
        </button>
      </fieldset>
      {!buyer.participantId ? <p role="alert" className="mt-2 text-sm text-red-800">Não foi possível identificar o cadastro do vencedor. Atualize o relatório quando o histórico estiver disponível.</p> : null}
      <p role="status" className="mt-2 text-sm">{message}</p>
    </form>
  );
}
