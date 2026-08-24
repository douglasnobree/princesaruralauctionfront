"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuctionLot } from "@/lib/auctions/types";

type AuctionGenealogyViewerProps = {
  lots: AuctionLot[];
};

export function AuctionGenealogyViewer({ lots }: AuctionGenealogyViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (lots.length === 0) return null;

  const pageIndex = Math.min(currentIndex, lots.length - 1);
  const currentLot = lots[pageIndex];
  const hasPrevious = pageIndex > 0;
  const hasNext = pageIndex < lots.length - 1;

  return (
    <section
      className="mt-10 border-t pt-8"
      aria-labelledby="genealogy-lots-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <FileText className="size-3.5" aria-hidden="true" />
            Documentos dos lotes
          </p>
          <h2
            id="genealogy-lots-title"
            className="mt-1 text-2xl font-bold tracking-tight"
          >
            Genealogias dos lotes
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Consulte cada lote página a página e abra o PDF quando o documento
            estiver disponível.
          </p>
        </div>
        <span
          className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
          aria-live="polite"
        >
          Página {pageIndex + 1} de {lots.length}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label
            className="grid gap-1.5 text-sm font-semibold"
            htmlFor="genealogy-lot-selector"
          >
            Selecionar lote
            <select
              id="genealogy-lot-selector"
              value={pageIndex}
              onChange={(event) => setCurrentIndex(Number(event.target.value))}
              className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:min-w-80"
            >
              {lots.map((lot, index) => (
                <option key={lot.id} value={index}>
                  Lote {String(lot.number).padStart(2, "0")} · {lot.title}
                </option>
              ))}
            </select>
          </label>

          <div
            className="flex items-center justify-between gap-3"
            role="group"
            aria-label="Navegação das genealogias"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex(pageIndex - 1)}
              disabled={!hasPrevious}
              aria-label="Ver lote anterior"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Anterior
            </Button>
            <span
              className="min-w-20 text-center text-sm font-semibold tabular-nums text-muted-foreground"
              aria-live="polite"
            >
              {pageIndex + 1} / {lots.length}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex(pageIndex + 1)}
              disabled={!hasNext}
              aria-label="Ver próximo lote"
            >
              Próximo
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <article
          className="mt-5 rounded-xl border bg-muted/25 p-5 sm:p-6"
          aria-live="polite"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Lote {String(currentLot.number).padStart(2, "0")}
              </p>
              <h3 className="mt-1 text-xl font-bold">{currentLot.title}</h3>
            </div>
            <span className="w-fit rounded-full border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {currentLot.genealogyUrl
                ? "PDF disponível"
                : "PDF não cadastrado"}
            </span>
          </div>

          {currentLot.genealogyUrl ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-muted-foreground">
                A genealogia deste lote está disponível para consulta.
              </p>
              <a
                href={currentLot.genealogyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-secondary outline-none transition-colors hover:bg-secondary/10 focus-visible:ring-3 focus-visible:ring-ring"
              >
                Abrir genealogia em PDF
                <ExternalLink className="size-4" aria-hidden="true" />
                <span className="sr-only"> do lote {currentLot.number}</span>
              </a>
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Este lote ainda não possui genealogia cadastrada.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
