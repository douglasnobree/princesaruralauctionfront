"use client";

import Link from "next/link";
import { Download, Printer } from "lucide-react";

export function ReportPrintButton({ downloadHref, canGenerate = true }: { downloadHref?: string; canGenerate?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {downloadHref && canGenerate ? (
        <Link
          href={downloadHref}
          className="inline-flex min-h-10 items-center rounded-lg border border-[#dfe8e2] bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24] active:scale-[0.96]"
          download
        >
          <Download className="mr-2 size-4" aria-hidden="true" />
          Baixar PDF final
        </Link>
      ) : null}
      {downloadHref && !canGenerate ? <span className="inline-flex min-h-10 items-center rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-900">Complete os campos obrigatórios</span> : null}
      <button
        type="button"
        onClick={() => window.print()}
        disabled={!canGenerate}
        className="inline-flex min-h-10 items-center rounded-lg border border-[#075b3e] bg-[#075b3e] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#064d35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Printer className="mr-2 size-4" aria-hidden="true" />
        {canGenerate ? "Imprimir / salvar PDF" : "Impressão bloqueada"}
      </button>
    </div>
  );
}
