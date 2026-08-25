"use client";

export function ReportPrintButton() { return <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center rounded-lg border border-[#dfe8e2] bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f08a24]">Imprimir</button>; }
