"use client";

import {
  ArrowLeft,
  ImagePlus,
  LockKeyhole,
  Radio,
  Save,
  ShoppingBasket,
  TimerReset,
  WandSparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  createAuctionAction,
  updateAuctionAction,
  uploadAuctionCoverImageAction,
} from "@/hooks/actions/auctionActions";
import {
  fromDateTimeLocalBrt,
  getAuctionAssetUrl,
  toDateTimeLocalBrt,
} from "@/lib/auctions/admin-utils";
import { slugifyAuction } from "@/lib/auctions/form-mappers";
import type { AuctionAdmin, AuctionInput } from "@/types/auction-admin";
import type { AuctionCapabilities } from "@/components/Management/capabilities";

type FormState = {
  title: string;
  slug: string;
  category: "ANIMAL" | "MACHINE";
  mode: "TIMED" | "LIVE" | "SHOPPING";
  description: string;
  regulationText: string;
  paymentText: string;
  deliveryText: string;
  startsAt: string;
  endsAt: string;
  preBidStartsAt: string;
  preBidEndsAt: string;
  incrementReais: string;
  secondaryIncrementReais: string;
  extensionMinutes: string;
  plannedLotCount: string;
};

const emptyState: FormState = {
  title: "",
  slug: "",
  category: "ANIMAL",
  mode: "LIVE",
  description: "",
  regulationText: "",
  paymentText: "",
  deliveryText: "",
  startsAt: "",
  endsAt: "",
  preBidStartsAt: "",
  preBidEndsAt: "",
  incrementReais: "",
  secondaryIncrementReais: "",
  extensionMinutes: "",
  plannedLotCount: "",
};

const modeDetails = {
  TIMED: {
    shortTitle: "Pré-lance / fechamento",
    description: "Lances na janela definida. Fechamento pelo operador.",
    icon: TimerReset,
    badge: "Sem transmissão",
  },
  LIVE: {
    shortTitle: "Ao vivo",
    description: "Pré-lances antes da abertura. Disputa com transmissão.",
    icon: Radio,
    badge: "Transmissão obrigatória",
  },
  SHOPPING: {
    shortTitle: "Shopping / pré-lance",
    description: "Pré-lance com opção de preço fixo.",
    icon: ShoppingBasket,
    badge: "Pré-lance sem transmissão",
  },
} as const;

function cents(value?: number | null) {
  return value == null ? "" : String(value / 100).replace(".", ",");
}

function parseCents(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized || !/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  return Math.round(Number(normalized) * 100);
}

function getInitialState(initialData?: AuctionAdmin): FormState {
  return initialData
    ? {
        title: initialData.title,
        slug: initialData.slug,
        category: initialData.category ?? "ANIMAL",
        mode: initialData.mode,
        description: initialData.description ?? "",
        regulationText: initialData.regulationText ?? "",
        paymentText: initialData.paymentText ?? "",
        deliveryText: initialData.deliveryText ?? "",
        startsAt: toDateTimeLocalBrt(initialData.startsAt),
        endsAt: toDateTimeLocalBrt(initialData.endsAt),
        preBidStartsAt: toDateTimeLocalBrt(initialData.preBidStartsAt),
        preBidEndsAt: toDateTimeLocalBrt(initialData.preBidEndsAt),
        incrementReais: cents(initialData.incrementCents),
        secondaryIncrementReais: cents(initialData.secondaryIncrementCents),
        extensionMinutes:
          initialData.extensionMinutes == null
            ? ""
            : String(initialData.extensionMinutes),
        plannedLotCount: String(initialData.plannedLotCount || ""),
      }
    : emptyState;
}

export function AuctionForm({
  initialData,
  capabilities,
}: {
  initialData?: AuctionAdmin;
  capabilities: AuctionCapabilities;
}) {
  const isEditing = Boolean(initialData);
  const canSave = isEditing ? capabilities.canEdit : capabilities.canCreate;
  const lifecycleEditBlock = Boolean(
    isEditing && initialData?.availableActions?.reasons.edit,
  );
  const [form, setForm] = useState<FormState>(() => getInitialState(initialData));
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    initialData?.coverImageUrl || initialData?.coverImage
      ? getAuctionAssetUrl(initialData.coverImageUrl || initialData.coverImage)
      : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleCoverChange(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Selecione um arquivo de imagem válido para a capa.");
      return;
    }
    if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCover(file);
    setCoverPreview(URL.createObjectURL(file));
    setNotice(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) {
      setNotice(
        lifecycleEditBlock
          ? initialData?.availableActions?.reasons.edit?.message ||
              "O leilão não pode mais ser alterado neste estágio."
          : "Seu perfil não possui permissão para salvar este leilão.",
      );
      return;
    }
    if (!form.title.trim() || !form.startsAt) {
      setNotice("Informe o título e o início do leilão para continuar.");
      return;
    }

    startTransition(async () => {
      const input: AuctionInput = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugifyAuction(form.title),
        category: form.category,
        mode: form.mode,
        description: form.description.trim() || undefined,
        regulationText: form.regulationText.trim() || undefined,
        paymentText: form.paymentText.trim() || undefined,
        deliveryText: form.deliveryText.trim() || undefined,
        startsAt: fromDateTimeLocalBrt(form.startsAt) ?? "",
        endsAt: fromDateTimeLocalBrt(form.endsAt),
        preBidStartsAt: fromDateTimeLocalBrt(form.preBidStartsAt),
        preBidEndsAt: fromDateTimeLocalBrt(form.preBidEndsAt),
        incrementCents: parseCents(form.incrementReais),
        secondaryIncrementCents: form.secondaryIncrementReais
          ? parseCents(form.secondaryIncrementReais) ?? null
          : null,
        extensionMinutes: form.extensionMinutes
          ? Number(form.extensionMinutes)
          : undefined,
        plannedLotCount: form.plannedLotCount
          ? Number(form.plannedLotCount)
          : undefined,
      };
      const result = initialData
        ? await updateAuctionAction(initialData.id, input)
        : await createAuctionAction(input);
      if (!result.success || !result.data) {
        setNotice(result.error || "Não foi possível salvar os dados.");
        return;
      }
      if (cover) {
        const imageResult = await uploadAuctionCoverImageAction(
          result.data.id,
          cover,
        );
        if (!imageResult.success) {
          setNotice(
            `Dados salvos, mas a capa não foi enviada: ${imageResult.error || "erro desconhecido"}`,
          );
          return;
        }
      }
      setNotice(initialData ? "Alterações salvas." : "Rascunho criado.");
      if (!initialData) {
        window.location.assign(`/admin/leiloes/${result.data.id}?aba=lotes`);
      } else {
        window.location.reload();
      }
    });
  }

  const fieldDisabled = isPending || !canSave;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={initialData ? `/admin/leiloes/${initialData.id}?aba=resumo` : "/admin/leiloes"}
          className="inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground outline-none transition-[background-color,color,scale] duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isEditing ? "Editar leilão" : "Novo leilão"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing ? "Atualize os dados do leilão." : "Crie o rascunho. Complete os dados depois."}
          </p>
        </div>
      </div>

      {!canSave ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status"><span className="font-semibold">Edição bloqueada.</span> {lifecycleEditBlock ? initialData?.availableActions?.reasons.edit?.message || "O leilão não pode mais ser alterado neste estágio." : "Seu perfil pode consultar esta área, mas não possui permissão para salvar alterações."}</p> : null}
      {notice ? <p className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground" role="status">{notice}</p> : null}

      <form onSubmit={submit} noValidate className="space-y-5">
        <section className="rounded-xl border bg-card" aria-labelledby="auction-basic-title">
          <div className="border-b px-5 py-4"><h2 id="auction-basic-title" className="font-semibold">Dados básicos</h2><p className="mt-1 text-sm text-muted-foreground">Título, categoria, formato e início do leilão.</p></div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <Field label="Título" id="auction-title" required><input id="auction-title" value={form.title} onChange={(event) => update("title", event.target.value)} required disabled={fieldDisabled} autoFocus={!isEditing} className="management-field" /></Field>
            <Field label="Categoria" id="auction-category" required><select id="auction-category" value={form.category} onChange={(event) => update("category", event.target.value as FormState["category"])} required disabled={fieldDisabled} className="management-field"><option value="ANIMAL">Animais</option><option value="MACHINE">Máquinas</option></select></Field>
            <Field label="Início do leilão" id="auction-starts" required><input id="auction-starts" type="datetime-local" value={form.startsAt} onChange={(event) => update("startsAt", event.target.value)} required disabled={fieldDisabled} className="management-field" /><span className="mt-1 block text-xs font-normal text-muted-foreground">Horário de Brasília (UTC−03:00).</span></Field>
            <Field label="Slug público" id="auction-slug"><div className="flex gap-2"><input id="auction-slug" value={form.slug} onChange={(event) => update("slug", event.target.value)} disabled={fieldDisabled} className="management-field min-w-0 flex-1" /><button type="button" onClick={() => update("slug", slugifyAuction(form.title))} disabled={fieldDisabled} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-md border px-3 text-xs font-semibold text-primary outline-none transition-[background-color,scale] duration-150 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] disabled:opacity-50"><WandSparkles className="size-3.5" aria-hidden="true" />Gerar</button></div></Field>
            <div className="rounded-lg bg-muted/40 p-3 text-sm md:col-span-2"><p className="font-medium">Endereço público</p><p className="mt-1 break-all text-xs text-muted-foreground">/{form.slug || "seu-leilao"}</p></div>
            <div className="space-y-3 text-sm font-medium md:col-span-2"><span>Formato dos lances</span><div className="grid gap-3 lg:grid-cols-3">{(Object.keys(modeDetails) as Array<keyof typeof modeDetails>).map((mode) => { const detail = modeDetails[mode]; const Icon = detail.icon; const selected = form.mode === mode; return <button key={mode} type="button" className={`rounded-xl border p-4 text-left outline-none transition-[background-color,border-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] ${selected ? "border-secondary bg-secondary/5" : "bg-background hover:border-secondary/50"}`} onClick={() => update("mode", mode)} disabled={fieldDisabled} aria-pressed={selected}><span className={`flex size-9 items-center justify-center rounded-lg ${selected ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}><Icon className="size-4" aria-hidden="true" /></span><span className="mt-3 block font-semibold">{detail.shortTitle}</span><span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">{detail.description}</span><span className={`mt-3 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${selected ? "bg-secondary/15 text-secondary" : "bg-muted text-muted-foreground"}`}>{detail.badge}</span></button>; })}</div></div>
          </div>
        </section>

        <details className="group rounded-xl border bg-card" open={isEditing}>
          <summary className="cursor-pointer list-none px-5 py-4 font-semibold outline-none [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-ring">Completar dados, agenda e publicação <span className="float-right text-xs font-normal text-muted-foreground group-open:hidden">Abrir</span><span className="float-right hidden text-xs font-normal text-muted-foreground group-open:inline">Recolher</span></summary>
          <div className="space-y-5 border-t p-5">
            <section className="rounded-xl border bg-background"><div className="border-b px-5 py-4"><h2 className="font-semibold">Descrição</h2></div><div className="p-5"><Field label="Descrição do leilão" id="auction-description"><textarea id="auction-description" value={form.description} onChange={(event) => update("description", event.target.value)} disabled={fieldDisabled} rows={4} className="management-field h-auto py-2" /></Field></div></section>
            <section className="rounded-xl border bg-background"><div className="border-b px-5 py-4"><h2 className="font-semibold">Agenda e regras</h2><p className="mt-1 text-sm text-muted-foreground">Os horários são interpretados no horário de Brasília.</p></div><div className="grid gap-5 p-5 md:grid-cols-2 lg:grid-cols-3"><Field label="Início dos pré-lances" id="auction-pre-start"><input id="auction-pre-start" type="datetime-local" value={form.preBidStartsAt} onChange={(event) => update("preBidStartsAt", event.target.value)} disabled={fieldDisabled} className="management-field" /></Field><Field label="Fim dos pré-lances" id="auction-pre-end"><input id="auction-pre-end" type="datetime-local" value={form.preBidEndsAt} onChange={(event) => update("preBidEndsAt", event.target.value)} disabled={fieldDisabled} className="management-field" /></Field><Field label="Fim do leilão" id="auction-ends"><input id="auction-ends" type="datetime-local" value={form.endsAt} onChange={(event) => update("endsAt", event.target.value)} disabled={fieldDisabled} className="management-field" /></Field><Field label="Incremento padrão" id="auction-increment"><input id="auction-increment" value={form.incrementReais} onChange={(event) => update("incrementReais", event.target.value)} inputMode="decimal" placeholder="1.000,00" disabled={fieldDisabled} className="management-field" /></Field><Field label="Incremento alternativo" id="auction-secondary"><input id="auction-secondary" value={form.secondaryIncrementReais} onChange={(event) => update("secondaryIncrementReais", event.target.value)} inputMode="decimal" placeholder="Opcional" disabled={fieldDisabled} className="management-field" /><span className="mt-1 block text-xs font-normal text-muted-foreground">Deixe vazio para usar apenas o padrão.</span></Field><Field label="Prorrogação (minutos)" id="auction-extension"><input id="auction-extension" value={form.extensionMinutes} onChange={(event) => update("extensionMinutes", event.target.value)} type="number" min="0" max="120" disabled={fieldDisabled} className="management-field" /></Field><Field label="Lotes planejados" id="auction-planned-lots"><input id="auction-planned-lots" value={form.plannedLotCount} onChange={(event) => update("plannedLotCount", event.target.value)} type="number" min="0" disabled={fieldDisabled} className="management-field" /></Field></div></section>
            <section className="rounded-xl border bg-background"><div className="border-b px-5 py-4"><h2 className="font-semibold">Informações comerciais e capa</h2></div><div className="grid gap-5 p-5 md:grid-cols-2"><Field label="Regulamento" id="auction-regulation"><textarea id="auction-regulation" value={form.regulationText} onChange={(event) => update("regulationText", event.target.value)} disabled={fieldDisabled} rows={5} className="management-field h-auto py-2" /></Field><div className="grid gap-5 sm:grid-cols-2 md:col-span-2"><Field label="Pagamento" id="auction-payment"><textarea id="auction-payment" value={form.paymentText} onChange={(event) => update("paymentText", event.target.value)} disabled={fieldDisabled} rows={4} className="management-field h-auto py-2" /></Field><Field label="Entrega" id="auction-delivery"><textarea id="auction-delivery" value={form.deliveryText} onChange={(event) => update("deliveryText", event.target.value)} disabled={fieldDisabled} rows={4} className="management-field h-auto py-2" /></Field></div><div className="space-y-2 text-sm font-medium"><span>Capa do leilão</span><label className="flex min-h-28 cursor-pointer items-center justify-center rounded-lg border border-dashed border-input bg-muted/20 p-3 text-center outline-none transition-[background-color] duration-150 hover:bg-muted/40 focus-within:ring-2 focus-within:ring-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => handleCoverChange(event.target.files?.[0])} disabled={fieldDisabled} />{coverPreview ? <div className="relative h-28 w-full overflow-hidden rounded-md outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"><Image src={coverPreview} alt="Prévia da capa do leilão" fill className="object-cover" unoptimized /></div> : <span className="flex flex-col items-center gap-2 text-muted-foreground"><ImagePlus className="size-6" aria-hidden="true" />Selecionar imagem</span>}</label><p className="text-xs font-normal text-muted-foreground">PNG, JPG ou WEBP. O envio acontece depois de salvar.</p></div></div></section>
          </div>
        </details>

        <div className="sticky bottom-4 z-10 flex flex-col-reverse items-stretch justify-between gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center"><span className="inline-flex items-center gap-2 text-xs text-muted-foreground">{!canSave ? <><LockKeyhole className="size-4" aria-hidden="true" />Edição bloqueada</> : <><span className="text-destructive">*</span> Campos obrigatórios · {isEditing ? "Atualize e salve quando necessário" : "Rascunho ainda não criado"}</>}</span><button type="submit" disabled={fieldDisabled} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none transition-[background-color,scale] duration-150 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] disabled:opacity-50 sm:min-w-44"><Save className="size-4" aria-hidden="true" />{isPending ? "Salvando dados…" : isEditing ? "Salvar alterações" : "Criar rascunho"}</button></div>
      </form>
    </div>
  );
}

function Field({ label, id, required = false, children }: { label: string; id: string; required?: boolean; children: React.ReactNode }) {
  return <label htmlFor={id} className="space-y-2 text-sm font-medium">{label}{required ? <span className="ml-1 text-destructive">*</span> : null}{children}</label>;
}
