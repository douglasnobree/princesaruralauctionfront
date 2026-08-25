"use client";

import {
  CalendarClock,
  FlaskConical,
  Gavel,
  Plus,
  Search,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { deleteAuctionAction } from "@/hooks/actions/auctionActions";
import {
  formatAuctionDate,
  formatAuctionStatus,
  getAuctionAssetUrl,
} from "@/lib/auctions/admin-utils";
import { categoryLabel } from "@/lib/auctions/form-mappers";
import {
  AUCTION_CATEGORIES,
  AUCTION_STATUSES,
  type AuctionAdmin,
  type AuctionAdminStatus,
} from "@/types/auction-admin";
import type { AuctionCapabilities } from "@/components/Management/capabilities";
import { AccessDenied } from "@/components/Management/AccessDenied";

const PAGE_SIZE = 10;
type QuickFilter = "all" | "attention" | "draft" | "scheduled" | "running" | "closed";

const statusClasses: Record<AuctionAdminStatus, string> = {
  DRAFT: "border-amber-200 bg-amber-50 text-amber-700",
  PRE_LAUNCH: "border-sky-200 bg-sky-50 text-sky-700",
  COMING_SOON: "border-indigo-200 bg-indigo-50 text-indigo-700",
  WAITING_OPENING: "border-violet-200 bg-violet-50 text-violet-700",
  OPEN: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CLOSED: "border-slate-200 bg-slate-50 text-slate-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
};

function needsAttention(auction: AuctionAdmin) {
  return (
    auction.status === "DRAFT" ||
    !auction.category ||
    auction.lotCount === 0 ||
    Boolean(auction.availableActions?.reasons.publish)
  );
}

function auctionCategory(auction: AuctionAdmin) {
  return auction.category ? categoryLabel(auction.category) : "Sem categoria";
}

export function AuctionList({
  auctions,
  capabilities,
  error,
}: {
  auctions: AuctionAdmin[];
  capabilities: AuctionCapabilities;
  error?: string;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | AuctionAdminStatus>("");
  const [category, setCategory] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      attention: auctions.filter(needsAttention).length,
      draft: auctions.filter((auction) => auction.status === "DRAFT").length,
      scheduled: auctions.filter((auction) =>
        ["PRE_LAUNCH", "COMING_SOON", "WAITING_OPENING"].includes(auction.status),
      ).length,
      running: auctions.filter((auction) => auction.status === "OPEN").length,
      closed: auctions.filter((auction) => ["CLOSED", "CANCELLED"].includes(auction.status)).length,
    }),
    [auctions],
  );

  const filteredAuctions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return auctions.filter((auction) => {
      const matchesSearch =
        !normalizedSearch ||
        [auction.title, auction.slug, auction.description].some((value) =>
          value?.toLowerCase().includes(normalizedSearch),
        );
      const matchesStatus = !status || auction.status === status;
      const matchesCategory = !category || auction.category === category;
      const matchesQuickFilter =
        quickFilter === "all" ||
        (quickFilter === "attention" && needsAttention(auction)) ||
        (quickFilter === "draft" && auction.status === "DRAFT") ||
        (quickFilter === "scheduled" && ["PRE_LAUNCH", "COMING_SOON", "WAITING_OPENING"].includes(auction.status)) ||
        (quickFilter === "running" && auction.status === "OPEN") ||
        (quickFilter === "closed" && ["CLOSED", "CANCELLED"].includes(auction.status));
      return matchesSearch && matchesStatus && matchesCategory && matchesQuickFilter;
    });
  }, [auctions, category, quickFilter, search, status]);

  const totalPages = Math.max(1, Math.ceil(filteredAuctions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleAuctions = filteredAuctions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function selectQuickFilter(value: QuickFilter) {
    setQuickFilter(value);
    setPage(1);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateStatus(value: "" | AuctionAdminStatus) {
    setStatus(value);
    setPage(1);
  }

  function updateCategory(value: string) {
    setCategory(value);
    setPage(1);
  }

  function removeAuction(auction: AuctionAdmin) {
    if (
      !capabilities.canDelete ||
      !window.confirm(
        `Excluir o leilão “${auction.title}”? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteAuctionAction(auction.id);
      setNotice(
        result.success
          ? "Leilão excluído."
          : result.error || "Não foi possível excluir o leilão.",
      );
      if (result.success) window.location.reload();
    });
  }

  if (!capabilities.canView) {
    return (
      <AccessDenied message="Seu perfil não possui a permissão de consulta de leilões." />
    );
  }

  const quickFilters: Array<{ value: QuickFilter; label: string; count: number }> = [
    { value: "all", label: "Todos", count: auctions.length },
    { value: "attention", label: "Requer atenção", count: counts.attention },
    { value: "draft", label: "Rascunhos", count: counts.draft },
    { value: "scheduled", label: "Programados", count: counts.scheduled },
    { value: "running", label: "Em andamento", count: counts.running },
    { value: "closed", label: "Encerrados", count: counts.closed },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Gavel className="size-4" aria-hidden="true" />
            <span>Leilões</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Catálogo operacional
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Prepare seus leilões, lotes e a operação ao vivo em um único espaço.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {capabilities.canCreate ? (
            <Link
              href="/admin/leiloes/novo"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none transition-[background-color,scale] duration-150 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
            >
              <Plus className="size-4" aria-hidden="true" />
              Novo leilão
            </Link>
          ) : null}
          <Link
            href="/admin/leiloes/sandbox"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-semibold outline-none transition-[background-color,scale] duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
          >
            <FlaskConical className="size-4" aria-hidden="true" />
            Testar motor
          </Link>
        </div>
      </div>

      {notice ? (
        <p className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          Não foi possível carregar todos os leilões: {error}
        </p>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtros rápidos">
        {quickFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={quickFilter === filter.value}
            onClick={() => selectQuickFilter(filter.value)}
            className={`shrink-0 rounded-full border px-3 py-2 text-sm outline-none transition-[background-color,color,border-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] ${quickFilter === filter.value ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}
          >
            {filter.label}
            <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${quickFilter === filter.value ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}>
              {filter.count}
            </span>
          </button>
        ))}
      </div>

      <section className="rounded-xl border bg-card shadow-sm" aria-labelledby="auction-list-title">
        <div className="border-b px-4 py-4 sm:px-5">
          <h2 id="auction-list-title" className="font-semibold">Leilões cadastrados</h2>
          <p className="mt-1 text-sm text-muted-foreground">Filtre por status, categoria ou ação necessária.</p>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_190px]">
            <label className="relative block">
              <span className="sr-only">Buscar leilão</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 pl-9 text-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Buscar por título, slug ou descrição"
              />
            </label>
            <label className="sr-only" htmlFor="auction-status">Status</label>
            <select id="auction-status" className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40" value={status} onChange={(event) => updateStatus(event.target.value as "" | AuctionAdminStatus)}>
              <option value="">Todos os status</option>
              {AUCTION_STATUSES.map((item) => <option key={item} value={item}>{formatAuctionStatus(item)}</option>)}
            </select>
            <label className="sr-only" htmlFor="auction-category">Categoria</label>
            <select id="auction-category" className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40" value={category} onChange={(event) => updateCategory(event.target.value)}>
              <option value="">Todas as categorias</option>
              {AUCTION_CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}
            </select>
          </div>

          {visibleAuctions.length === 0 ? (
            <div className="grid min-h-56 place-items-center rounded-lg border border-dashed px-6 py-10 text-center">
              <div>
                <Gavel className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">Nenhum leilão encontrado</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {auctions.length === 0 ? "Cadastre o primeiro rascunho para começar." : "Ajuste os filtros e tente novamente."}
                </p>
                {capabilities.canCreate && auctions.length === 0 ? <Link href="/admin/leiloes/novo" className="mt-4 inline-flex min-h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring">Criar leilão</Link> : null}
              </div>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Leilão</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Próxima data</th>
                      <th className="px-4 py-3">Lotes</th>
                      <th className="px-4 py-3">Ação necessária</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visibleAuctions.map((auction) => (
                      <tr key={auction.id} className="align-middle transition-colors hover:bg-muted/30">
                        <td className="px-4 py-4">
                          <Link href={`/admin/leiloes/${auction.id}?aba=resumo`} className="flex min-w-0 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
                              <Image src={getAuctionAssetUrl(auction.coverImageUrl || auction.coverImage)} alt="" fill className="object-cover" unoptimized />
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold hover:underline">{auction.title}</span>
                              <p className="truncate text-xs text-muted-foreground">/{auction.slug} · {auctionCategory(auction)}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-4"><span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusClasses[auction.status]}`}>{formatAuctionStatus(auction.status)}</span></td>
                        <td className="whitespace-nowrap px-4 py-4 text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CalendarClock className="size-3.5" aria-hidden="true" />{formatAuctionDate(auction.startsAt)}</span></td>
                        <td className="px-4 py-4">{auction.lotCount}{auction.plannedLotCount > 0 ? `/${auction.plannedLotCount}` : ""}</td>
                        <td className="max-w-[18rem] px-4 py-4 text-xs text-muted-foreground">{needsAttention(auction) ? auction.availableActions?.reasons.publish?.message || "Complete os dados e os lotes" : "Pronto para acompanhar"}</td>
                        <td className="px-4 py-4 text-right"><Link href={`/admin/leiloes/${auction.id}?aba=resumo`} className="inline-flex min-h-9 items-center rounded-md border bg-background px-3 text-sm font-semibold outline-none transition-[background-color,scale] duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]">Abrir</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 md:hidden">
                {visibleAuctions.map((auction) => (
                  <article key={auction.id} className="rounded-lg border p-4 transition-[box-shadow] duration-150 hover:shadow-sm">
                    <div className="flex gap-3">
                      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"><Image src={getAuctionAssetUrl(auction.coverImageUrl || auction.coverImage)} alt="" fill className="object-cover" unoptimized /></div>
                      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold">{auction.title}</h2><span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusClasses[auction.status]}`}>{formatAuctionStatus(auction.status)}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{auctionCategory(auction)} · {auction.lotCount} lote(s)</p></div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">Próxima data: {formatAuctionDate(auction.startsAt)}</p>
                    {needsAttention(auction) ? <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{auction.availableActions?.reasons.publish?.message || "Complete os dados e os lotes."}</p> : null}
                    <div className="mt-3 flex justify-end gap-2"><Link href={`/admin/leiloes/${auction.id}?aba=resumo`} className="inline-flex min-h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring">Abrir workspace</Link>{capabilities.canDelete && auction.availableActions?.canDelete !== false ? <button type="button" onClick={() => removeAuction(auction)} disabled={isPending} className="inline-flex min-h-9 items-center rounded-md border border-destructive/30 px-3 text-sm font-semibold text-destructive outline-none hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/40 disabled:opacity-50">Excluir</button> : null}</div>
                  </article>
                ))}
              </div>
            </>
          )}

          {totalPages > 1 ? (
            <nav className="flex flex-wrap items-center justify-between gap-3 border-t pt-4" aria-label="Paginação de leilões">
              <p className="text-xs text-muted-foreground">{filteredAuctions.length} resultado(s)</p>
              <div className="flex items-center gap-1">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-md border px-3 py-1.5 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} type="button" aria-current={pageNumber === currentPage ? "page" : undefined} onClick={() => setPage(pageNumber)} className={`size-8 rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${pageNumber === currentPage ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{pageNumber}</button>)}
                <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-md border px-3 py-1.5 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40">Próxima</button>
              </div>
            </nav>
          ) : null}
        </div>
      </section>
    </div>
  );
}
