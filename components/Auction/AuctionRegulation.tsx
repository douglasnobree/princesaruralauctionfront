"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AuctionRegulation({ text }: { text?: string | null }) {
  const regulation = text?.trim();

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Regulamento do leilão">
      <div className="flex min-w-0 items-start gap-3">
        <FileText className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Conheça as regras do leilão</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {regulation
              ? "Leia o regulamento completo, com as condições de participação e retirada dos lotes."
              : "Consulte o regulamento deste leilão com nossa equipe."}
          </p>
        </div>
      </div>
      {regulation ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="min-h-11 shrink-0">
              <FileText className="size-4" aria-hidden="true" />
              Ver regulamento
            </Button>
          </DialogTrigger>
          <DialogContent className="flex min-h-0 flex-col overflow-hidden sm:max-w-2xl">
            <DialogHeader className="shrink-0">
              <DialogTitle>Regulamento do leilão</DialogTitle>
              <DialogDescription>Condições completas de participação neste leilão.</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 overflow-y-auto overscroll-contain whitespace-pre-wrap break-words pr-2 text-sm leading-7" tabIndex={0} role="region" aria-label="Texto completo do regulamento">
              {regulation}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}
