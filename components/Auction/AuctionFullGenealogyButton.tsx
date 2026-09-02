"use client";

import { FileStack, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type AuctionFullGenealogyButtonProps = {
  catalogUrl: string;
};

export function AuctionFullGenealogyButton({
  catalogUrl,
}: AuctionFullGenealogyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openCatalog() {
    if (isLoading) return;

    setError(null);
    setIsLoading(true);
    const newTab = window.open("about:blank", "_blank");

    if (!newTab) {
      setIsLoading(false);
      setError("Permita pop-ups para abrir o catálogo completo em uma nova guia.");
      return;
    }

    newTab.opener = null;

    try {
      const response = await fetch(catalogUrl, { cache: "no-store" });
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

      if (!response.ok || !contentType.includes("application/pdf")) {
        newTab.close();
        throw new Error("catalog-request-failed");
      }

      await response.blob();
      newTab.location.replace(catalogUrl);
      setIsLoading(false);
    } catch {
      newTab.close();
      setIsLoading(false);
      setError("Não foi possível gerar o catálogo completo agora. Tente novamente.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={openCatalog}
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <FileStack className="size-4" aria-hidden="true" />
        )}
        {isLoading ? "Preparando catálogo…" : "Catálogo completo"}
      </Button>
      {isLoading ? (
        <p className="text-xs text-muted-foreground" role="status">
          Reunindo as genealogias na ordem oficial dos lotes…
        </p>
      ) : null}
      {error ? (
        <p className="max-w-md text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
