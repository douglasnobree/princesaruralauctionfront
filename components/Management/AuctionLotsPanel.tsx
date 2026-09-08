"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  FileUp,
  History,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createAuctionLotAction,
  deleteAuctionLotAction,
  reorderAuctionLotsAction,
  updateAuctionLotAction,
  updateAuctionLotStatusAction,
  uploadAuctionLotGenealogyAction,
  uploadAuctionLotImagesAction,
} from "@/hooks/actions/auctionActions";
import { listManagerLotBidsAction } from "@/hooks/actions/auctionEngineActions";
import {
  formatCents,
  formatLotStatus,
  toDateTimeLocalBrt,
  fromDateTimeLocalBrt,
} from "@/lib/auctions/admin-utils";
import { slugifyAuction } from "@/lib/auctions/form-mappers";
import type {
  AuctionAdminLot,
  AuctionAdminMode,
  AuctionLotAdminStatus,
  AuctionLotInput,
} from "@/types/auction-admin";
import type { AuctionCapabilities } from "@/components/Management/capabilities";
import type { EngineBidHistoryItem, EngineLot } from "@/lib/auctions/engine-types";

type Draft = {
  number: string;
  title: string;
  slug: string;
  category: "ANIMAL" | "MACHINE";
  startingBid: string;
  increment: string;
  paymentDescription: string;
  deliveryDescription: string;
  closesAt: string;
  documentText: string;
  youtubeUrl: string;
  changeReason: string;
};

const blank: Draft = {
  number: "",
  title: "",
  slug: "",
  category: "ANIMAL",
  startingBid: "",
  increment: "",
  paymentDescription: "",
  deliveryDescription: "",
  closesAt: "",
  documentText: "",
  youtubeUrl: "",
  changeReason: "",
};

function reaisToCents(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized || !/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  return Math.round(Number(normalized) * 100);
}

function centsToReais(value?: number | null) {
  return value == null ? "" : String(value / 100).replace(".", ",");
}

function draftFromLot(lot: AuctionAdminLot): Draft {
  return {
    number: String(lot.number),
    title: lot.title,
    slug: lot.slug,
    category: lot.category,
    startingBid: centsToReais(lot.startingBidCents),
    increment: centsToReais(lot.incrementCents),
    paymentDescription: lot.paymentDescription ?? "",
    deliveryDescription: lot.deliveryDescription ?? "",
    closesAt: toDateTimeLocalBrt(lot.closesAt),
    documentText: lot.documentText ?? "",
    youtubeUrl: lot.youtubeUrl ?? "",
    changeReason: "",
  };
}

export function AuctionLotsPanel({
  auctionId,
  initialLots,
  capabilities,
  canEditLots,
  mode,
  engineLots = [],
}: {
  auctionId: string;
  initialLots: AuctionAdminLot[];
  capabilities: AuctionCapabilities;
  canEditLots?: boolean;
  mode: AuctionAdminMode;
  engineLots?: EngineLot[];
}) {
  const isShopping = mode === "SHOPPING";
  const [lots, setLots] = useState(initialLots);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [historyLotId, setHistoryLotId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sortedLots = useMemo(
    () => [...lots].sort((a, b) => a.sortOrder - b.sortOrder || a.number - b.number),
    [lots],
  );
  const canMutate = capabilities.canManageLots;
  const canEdit = canEditLots ?? canMutate;
  const requiresChangeReason = canEdit && !canMutate;

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function startCreate() {
    setEditingId(null);
    setDraft({ ...blank, number: String(sortedLots.length + 1) });
    setNotice(null);
  }

  function startEdit(lot: AuctionAdminLot) {
    setEditingId(lot.id);
    setDraft(draftFromLot(lot));
    setNotice(null);
  }

  function saveLot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || (!canMutate && !editingId) || !canEdit) return;
    if (requiresChangeReason && !draft.changeReason.trim()) {
      setNotice("Informe uma justificativa para editar o lote após o início do leilão.");
      return;
    }

    startTransition(async () => {
      const startingBidCents = reaisToCents(draft.startingBid) ?? 0;
      const incrementCents = draft.increment
        ? reaisToCents(draft.increment) ?? null
        : null;
      const editingLot = editingId
        ? lots.find((lot) => lot.id === editingId)
        : undefined;
      const initialDraft = editingLot ? draftFromLot(editingLot) : undefined;
      const initialIncrementInherited = editingLot
        ? (editingLot.incrementInherited ?? editingLot.incrementCents == null)
        : false;
      const financialValuesChanged = editingLot
        ? draft.startingBid !== initialDraft?.startingBid ||
          (!isShopping &&
            (Boolean(draft.increment) !== !initialIncrementInherited ||
              (Boolean(draft.increment) && draft.increment !== initialDraft?.increment)))
        : true;
      const input: Partial<AuctionLotInput> = {
        number: Number(draft.number),
        title: draft.title.trim(),
        slug: draft.slug.trim() || slugifyAuction(draft.title),
        category: draft.category,
        ...(financialValuesChanged
          ? { startingBidCents, ...(isShopping ? {} : { incrementCents }) }
          : {}),
        paymentDescription: draft.paymentDescription.trim() || undefined,
        deliveryDescription: draft.deliveryDescription.trim() || undefined,
        ...(!isShopping ? { closesAt: fromDateTimeLocalBrt(draft.closesAt) } : {}),
        documentText: draft.documentText.trim() || undefined,
        youtubeUrl: draft.youtubeUrl.trim() || undefined,
        ...(requiresChangeReason
          ? { changeReason: draft.changeReason.trim() }
          : {}),
      };
      const result = editingId
        ? await updateAuctionLotAction(auctionId, editingId, input)
        : await createAuctionLotAction(auctionId, input as AuctionLotInput);
      if (!result.success || !result.data) {
        setNotice(result.error || "Não foi possível salvar o lote.");
        return;
      }
      setLots((current) =>
        editingId
          ? current.map((lot) => (lot.id === editingId ? result.data! : lot))
          : [...current, result.data!],
      );
      setDraft(null);
      setEditingId(null);
      setNotice(editingId ? "Lote atualizado." : "Lote criado.");
    });
  }

  function changeStatus(lot: AuctionAdminLot, status: AuctionLotAdminStatus) {
    if (!canMutate) return;
    startTransition(async () => {
      const result = await updateAuctionLotStatusAction(auctionId, lot.id, status);
      if (!result.success || !result.data) {
        setNotice(result.error || "Não foi possível alterar o lote.");
        return;
      }
      setLots((current) =>
        current.map((item) => (item.id === lot.id ? result.data! : item)),
      );
      setNotice(`Lote ${lot.number} atualizado para ${formatLotStatus(status)}.`);
    });
  }

  function removeLot(lot: AuctionAdminLot) {
    if (!canMutate || !window.confirm(`Excluir o lote ${lot.number}?`)) return;
    startTransition(async () => {
      const result = await deleteAuctionLotAction(auctionId, lot.id);
      setNotice(
        result.success
          ? "Lote excluído."
          : result.error || "Não foi possível excluir o lote.",
      );
      if (result.success) {
        setLots((current) => current.filter((item) => item.id !== lot.id));
      }
    });
  }

  function moveLot(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= sortedLots.length || !canMutate) return;
    const next = sortedLots.map((lot, i) =>
      i === index
        ? sortedLots[nextIndex]
        : i === nextIndex
          ? sortedLots[index]
          : lot,
    );
    startTransition(async () => {
      const result = await reorderAuctionLotsAction(
        auctionId,
        next.map((lot) => lot.id),
      );
      if (!result.success) {
        setNotice(result.error || "Não foi possível reordenar os lotes.");
        return;
      }
      setLots(result.data ?? next);
      setNotice("Ordem dos lotes atualizada.");
    });
  }

  function requestChangeReason(action: string) {
    if (!requiresChangeReason) return "";
    const reason = window.prompt(
      `Informe a justificativa para ${action}. Ela será registrada na auditoria e nos logs.`,
    );
    if (!reason?.trim()) {
      setNotice("A justificativa é obrigatória para editar um lote iniciado.");
      return null;
    }
    return reason.trim();
  }

  function uploadImages(lot: AuctionAdminLot, files: FileList | null) {
    if (!files?.length || !canEdit) return;
    const changeReason = requestChangeReason("enviar imagens ao lote");
    if (changeReason === null) return;
    startTransition(async () => {
      const result = await uploadAuctionLotImagesAction(
        auctionId,
        lot.id,
        Array.from(files),
        changeReason || undefined,
      );
      setNotice(
        result.success
          ? "Imagens enviadas."
          : result.error || "Não foi possível enviar as imagens.",
      );
      if (result.success && result.data) {
        setLots((current) =>
          current.map((item) => (item.id === lot.id ? result.data! : item)),
        );
      }
    });
  }

  function uploadGenealogy(lot: AuctionAdminLot, file: File | null) {
    if (!file || !canEdit) return;
    const changeReason = requestChangeReason("enviar a genealogia ao lote");
    if (changeReason === null) return;
    startTransition(async () => {
      const result = await uploadAuctionLotGenealogyAction(
        auctionId,
        lot.id,
        file,
        changeReason || undefined,
      );
      setNotice(
        result.success
          ? "Genealogia enviada."
          : result.error || "Não foi possível enviar a genealogia.",
      );
      if (result.success && result.data) {
        setLots((current) =>
          current.map((item) => (item.id === lot.id ? result.data! : item)),
        );
      }
    });
  }

  return (
    <section className="space-y-5" aria-labelledby="lots-panel-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="lots-panel-title" className="text-xl font-bold">
            Lotes
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Cadastre, ordene e altere o estado dos lotes conforme o contrato do leilão.
          </p>
        </div>
        {canMutate ? (
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#08734e] px-3.5 text-sm font-semibold text-white hover:bg-[#075b3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24] focus-visible:ring-offset-2"
          >
            <Plus className="size-4" aria-hidden="true" />
            Novo lote
          </button>
        ) : canEdit ? (
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
            Edição pós-início · justificativa obrigatória
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            Somente leitura
          </span>
        )}
      </div>
      {canEdit && !canMutate ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          A edição dos lotes continua liberada após o início, mas cada alteração exige uma justificativa, registrada na auditoria e nos logs do sistema.
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-xl border border-[#dfe8e2] bg-[#f3f9f5] px-4 py-3 text-sm text-[#075b3e]">
          {notice}
        </p>
      ) : null}
      {draft ? (
        <LotForm
          draft={draft}
          editing={Boolean(editingId)}
          requiresChangeReason={requiresChangeReason}
          disabled={isPending || (!canMutate && !editingId) || !canEdit}
          onChange={updateDraft}
        onCancel={() => {
            setDraft(null);
            setEditingId(null);
          }}
          onSubmit={saveLot}
          mode={mode}
        />
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-[#dfe8e2] bg-white shadow-sm">
        {sortedLots.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-600">
            Nenhum lote cadastrado. Crie o primeiro para liberar a publicação.
          </div>
        ) : (
          <div className="divide-y divide-[#e9efeb]">
            {sortedLots.map((lot, index) => (
              <LotRow
                key={lot.id}
                lot={lot}
                index={index}
                total={sortedLots.length}
                engineLot={engineLots.find((item) => item.lotNumber === lot.number)}
                canMutate={canMutate}
                canEdit={canEdit}
                canViewBids={capabilities.canViewBids}
                isPending={isPending}
                historyOpen={historyLotId === lot.id}
                onEdit={() => startEdit(lot)}
                onDelete={() => removeLot(lot)}
                onStatus={(status) => changeStatus(lot, status)}
                onMove={(direction) => moveLot(index, direction)}
                onHistory={() =>
                  setHistoryLotId(historyLotId === lot.id ? null : lot.id)
                }
                onImages={(files) => uploadImages(lot, files)}
                onGenealogy={(file) => uploadGenealogy(lot, file)}
                mode={mode}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LotForm({
  draft,
  editing,
  requiresChangeReason,
  disabled,
  onChange,
  onCancel,
  onSubmit,
  mode,
}: {
  draft: Draft;
  editing: boolean;
  requiresChangeReason: boolean;
  disabled: boolean;
  onChange: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  mode: AuctionAdminMode;
}) {
  const isShopping = mode === "SHOPPING";
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-[#b7cfc2] bg-[#fbfdfb] p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{editing ? "Editar lote" : "Novo lote"}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Os campos financeiros são informados em reais e enviados em centavos.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24]"
          aria-label="Fechar formulário"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {requiresChangeReason ? (
        <label className="mt-5 block text-xs font-semibold text-slate-700">
          Justificativa da alteração <span className="text-red-700">*</span>
          <textarea
            id="lot-change-reason"
            required
            maxLength={1000}
            value={draft.changeReason}
            onChange={(event) => onChange("changeReason", event.target.value)}
            disabled={disabled}
            rows={3}
            placeholder="Explique por que este lote precisa ser alterado após o início."
            className="admin-field mt-1.5 h-auto py-2"
          />
          <span className="mt-1 block font-normal text-slate-500">
            A justificativa será registrada na auditoria e nos logs do sistema.
          </span>
        </label>
      ) : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Número" id="lot-number">
          <input
            id="lot-number"
            type="number"
            min="1"
            required
            value={draft.number}
            onChange={(event) => onChange("number", event.target.value)}
            disabled={disabled}
            className="admin-field"
          />
        </Field>
        <Field label="Categoria" id="lot-category">
          <select
            id="lot-category"
            value={draft.category}
            onChange={(event) => onChange("category", event.target.value as Draft["category"])}
            disabled={disabled}
            className="admin-field"
          >
            <option value="ANIMAL">Animais</option>
            <option value="MACHINE">Máquinas</option>
          </select>
        </Field>
        <Field label="Título" id="lot-title">
          <input
            id="lot-title"
            required
            value={draft.title}
            onChange={(event) => onChange("title", event.target.value)}
            disabled={disabled}
            className="admin-field"
          />
        </Field>
        <Field label="Slug" id="lot-slug">
          <input
            id="lot-slug"
            value={draft.slug}
            onChange={(event) => onChange("slug", event.target.value)}
            disabled={disabled}
            className="admin-field"
          />
        </Field>
        <Field label={isShopping ? "Valor do lote (R$)" : "Lance inicial (R$)"} id="lot-starting">
          <input
            id="lot-starting"
            required
            value={draft.startingBid}
            onChange={(event) => onChange("startingBid", event.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            disabled={disabled}
            className="admin-field"
          />
        </Field>
        {!isShopping ? <>
          <Field label="Incremento (R$)" id="lot-increment">
            <input
              id="lot-increment"
              value={draft.increment}
              onChange={(event) => onChange("increment", event.target.value)}
              inputMode="decimal"
              placeholder="Herdado"
              disabled={disabled}
              className="admin-field"
            />
          </Field>
          <Field label="Encerramento" id="lot-closes">
            <input
              id="lot-closes"
              type="datetime-local"
              value={draft.closesAt}
              onChange={(event) => onChange("closesAt", event.target.value)}
              disabled={disabled}
              className="admin-field"
            />
          </Field>
        </> : null}
        <Field label="YouTube" id="lot-youtube">
          <input
            id="lot-youtube"
            type="url"
            value={draft.youtubeUrl}
            onChange={(event) => onChange("youtubeUrl", event.target.value)}
            disabled={disabled}
            className="admin-field"
          />
        </Field>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TextArea
          label="Pagamento"
          id="lot-payment"
          value={draft.paymentDescription}
          onChange={(value) => onChange("paymentDescription", value)}
          disabled={disabled}
        />
        <TextArea
          label="Entrega"
          id="lot-delivery"
          value={draft.deliveryDescription}
          onChange={(value) => onChange("deliveryDescription", value)}
          disabled={disabled}
        />
        <TextArea
          label="Documento"
          id="lot-document"
          value={draft.documentText}
          onChange={(value) => onChange("documentText", value)}
          disabled={disabled}
        />
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-10 items-center rounded-lg border border-[#dfe8e2] px-3 text-sm font-semibold text-slate-700 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#08734e] px-3.5 text-sm font-semibold text-white hover:bg-[#075b3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24] disabled:opacity-50"
        >
          <Save className="size-4" aria-hidden="true" />
          {disabled ? "Salvando…" : editing ? "Salvar lote" : "Criar lote"}
        </button>
      </div>
    </form>
  );
}

function LotRow({
  lot,
  index,
  total,
  engineLot,
  canMutate,
  canEdit,
  canViewBids,
  isPending,
  historyOpen,
  onEdit,
  onDelete,
  onStatus,
  onMove,
  onHistory,
  onImages,
  onGenealogy,
  mode,
}: {
  lot: AuctionAdminLot;
  index: number;
  total: number;
  engineLot?: EngineLot;
  canMutate: boolean;
  canEdit: boolean;
  canViewBids: boolean;
  isPending: boolean;
  historyOpen: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: AuctionLotAdminStatus) => void;
  onMove: (direction: -1 | 1) => void;
  onHistory: () => void;
  onImages: (files: FileList | null) => void;
  onGenealogy: (file: File | null) => void;
  mode: AuctionAdminMode;
}) {
  const isShopping = mode === "SHOPPING";
  return (
    <article className="p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#e8f4ee] px-2.5 py-1 text-xs font-bold text-[#075b3e]">
              LOTE {String(lot.number).padStart(2, "0")}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {formatLotStatus(lot.status)}
            </span>
          </div>
          <h3 className="mt-2 text-base font-bold text-slate-950">{lot.title}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Slug: {lot.slug} · {lot.bidCount ?? engineLot?.lotSequence ?? 0} lance(s)
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 xl:min-w-[330px]">
          <div>
            <p className="text-xs text-slate-500">Lance atual</p>
            <p className="mt-1 font-bold tabular-nums">
              {formatCents(
                lot.currentBidCents ??
                  (engineLot?.currentPriceCents
                    ? Number(engineLot.currentPriceCents)
                    : null),
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Maior licitante</p>
            <p className="mt-1 truncate font-semibold">
              {lot.currentBidderName || engineLot?.currentBidderAlias || "Sem lances"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{isShopping ? "Valor do lote" : "Inicial"}</p>
            <p className="mt-1 font-semibold tabular-nums">
              {formatCents(lot.startingBidCents)}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#e9efeb] pt-4">
        <button
          type="button"
          onClick={onEdit}
          disabled={!canEdit || isPending}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#dfe8e2] px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Editar
        </button>
        {canViewBids ? (
          <button
            type="button"
            onClick={onHistory}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#dfe8e2] px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <History className="size-3.5" aria-hidden="true" />
            {historyOpen ? "Fechar histórico" : "Histórico"}
          </button>
        ) : null}
        <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#dfe8e2] px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
          <FileUp className="size-3.5" aria-hidden="true" />
          Imagens
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(event) => {
              onImages(event.target.files);
              event.currentTarget.value = "";
            }}
            disabled={!canEdit || isPending}
            className="sr-only"
          />
        </label>
        <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#dfe8e2] px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
          <FileUp className="size-3.5" aria-hidden="true" />
          Genealogia
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(event) => {
              onGenealogy(event.target.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
            disabled={!canEdit || isPending}
            className="sr-only"
          />
        </label>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={!canMutate || index === 0 || isPending}
            className="grid size-9 place-items-center rounded-lg border border-[#dfe8e2] text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            aria-label={`Mover lote ${lot.number} para cima`}
          >
            <ArrowUp className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={!canMutate || index === total - 1 || isPending}
            className="grid size-9 place-items-center rounded-lg border border-[#dfe8e2] text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            aria-label={`Mover lote ${lot.number} para baixo`}
          >
            <ArrowDown className="size-3.5" />
          </button>
          <select
            aria-label={`Alterar status do lote ${lot.number}`}
            value={lot.status}
            onChange={(event) => onStatus(event.target.value as AuctionLotAdminStatus)}
            disabled={!canMutate || isPending}
            className="h-9 rounded-lg border border-[#dfe8e2] bg-white px-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
          >
            <option value="DRAFT">Rascunho</option>
            <option value="PAUSED">Pausado</option>
            <option value="OPEN">Aberto</option>
            <option value="SOLD">Vendido</option>
            <option value="CLOSED">Encerrado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
          {canMutate ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              className="grid size-9 place-items-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-40"
              aria-label={`Excluir lote ${lot.number}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      {lot.genealogyFilename ? (
        <p className="mt-3 text-xs text-slate-500">Genealogia: {lot.genealogyFilename}</p>
      ) : null}
      {historyOpen && engineLot ? (
        <BidHistory auctionId={lot.auctionId} lotId={engineLot.externalId} />
      ) : historyOpen ? (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-600">
          Histórico indisponível porque este lote ainda não possui correspondência no Auction Engine.
        </p>
      ) : null}
    </article>
  );
}

function BidHistory({ auctionId, lotId }: { auctionId: string; lotId: string }) {
  const [items, setItems] = useState<EngineBidHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void listManagerLotBidsAction(auctionId, lotId, { limit: "50" }).then((result) => {
      if (!active) return;
      if (result.success) setItems(result.data?.items ?? []);
      else setError(result.error || "Não foi possível carregar o histórico.");
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [auctionId, lotId]);

  return (
    <div className="mt-4 rounded-xl border border-[#e9efeb] bg-[#fbfdfb] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ChevronDown className="size-4 text-[#08734e]" aria-hidden="true" />
        Histórico recente
      </div>
      {loading ? (
        <p className="mt-3 text-xs text-slate-500">Carregando…</p>
      ) : error ? (
        <p className="mt-3 text-xs text-red-700">{error}</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">Nenhum lance encontrado.</p>
      ) : (
        <div className="mt-3 divide-y divide-[#e9efeb]">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
            >
              <span className="font-semibold">{item.bidderAlias}</span>
              <span className="tabular-nums">{formatCents(Number(item.amountCents))}</span>
              <span className="text-slate-500">
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(item.acceptedAt))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
      {label}
      {children}
    </label>
  );
}

function TextArea({
  label,
  id,
  value,
  onChange,
  disabled,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <Field label={label} id={id}>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={3}
        className="admin-field mt-1.5 h-auto py-2"
      />
    </Field>
  );
}
