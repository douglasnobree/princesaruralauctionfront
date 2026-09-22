"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getAuctionAssetUrl } from "@/lib/auctions/admin-utils";

export function AuctionBannerField({ device, savedUrl, value, disabled, onChange }: {
  device: "desktop" | "mobile";
  savedUrl?: string | null;
  value?: File | null;
  disabled: boolean;
  onChange: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  const url = value === null ? null : (value && preview?.file === value ? preview.url : (savedUrl ? getAuctionAssetUrl(savedUrl) : null));
  const label = device === "mobile" ? "Banner para celular" : "Banner para desktop";
  return <div className="min-w-0 space-y-3">
    <label htmlFor={`banner-${device}`} className="block text-sm font-semibold">{label}</label>
    <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
      {url ? <Image src={url} alt={`Prévia: ${label.toLowerCase()}`} fill unoptimized className="object-contain" /> : <p className="px-4 text-center text-sm text-muted-foreground">{value === null ? "Será removido ao salvar" : "Nenhum banner selecionado"}</p>}
    </div>
    <input id={`banner-${device}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} aria-describedby={`banner-${device}-help`} className="block min-h-11 w-full min-w-0 text-sm file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-muted file:px-3 file:font-medium disabled:opacity-50" onChange={(event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
        setError("Escolha uma imagem JPG, PNG ou WEBP de até 10 MB."); return;
      }
      setError(null); setPreview({ file, url: URL.createObjectURL(file) }); onChange(file);
    }} />
    <p id={`banner-${device}-help`} className="text-xs leading-5 text-muted-foreground">JPG, PNG ou WEBP, até 10 MB. Sugestão: {device === "mobile" ? "750 × 600" : "1920 × 600"} px. O envio acontece ao salvar as alterações.</p>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    {url || value ? <button type="button" disabled={disabled} onClick={() => { setError(null); onChange(null); }} className="min-h-11 rounded-md border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50">Remover banner</button> : null}
  </div>;
}
