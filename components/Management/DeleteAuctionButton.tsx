"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { deleteAuctionAction } from "@/hooks/actions/auctionActions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { AuctionAdmin } from "@/types/auction-admin";

export function DeleteAuctionButton({ auction, redirectOnDelete = false }: { auction: AuctionAdmin; redirectOnDelete?: boolean }) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmationTitle, setConfirmationTitle] = useState("");
  const [error, setError] = useState("");
  const [invalidName, setInvalidName] = useState(false);
  const [pending, startTransition] = useTransition();

  function changeOpen(next: boolean) {
    if (pending) return;
    setOpen(next);
    setConfirmationTitle("");
    setError("");
    setInvalidName(false);
  }

  function remove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (confirmationTitle.trim() !== auction.title.trim()) {
      setError("Digite o nome do leilão exatamente como aparece acima.");
      setInvalidName(true);
      inputRef.current?.focus();
      return;
    }
    setError("");
    setInvalidName(false);
    startTransition(async () => {
      const result = await deleteAuctionAction(auction.id, confirmationTitle);
      if (!result.success) {
        setError(result.error || "Não foi possível excluir o leilão. Tente novamente.");
        return;
      }
      setOpen(false);
      if (redirectOnDelete) router.push("/admin/leiloes");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <button type="button" aria-label={`Excluir leilão ${auction.title}`} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-destructive/30 px-3 text-sm font-semibold text-destructive outline-none transition-[background-color,scale] duration-150 hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/40 active:scale-[0.96]">
          <Trash2 className="size-4" aria-hidden="true" />Excluir
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%_-_2rem)] sm:max-w-lg" showCloseButton={!pending} onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }} onInteractOutside={(event) => { if (pending) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Excluir leilão definitivamente</DialogTitle>
          <DialogDescription>
            O leilão “{auction.title}”, seus lotes, lances, arrematações, inscrições e todo o histórico vinculado serão apagados. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={remove} className="grid gap-4" aria-busy={pending}>
          <p className="break-words rounded-md bg-muted p-3 font-semibold">{auction.title}</p>
          <div className="grid gap-2">
            <label htmlFor={inputId} className="text-sm font-medium">Digite o nome do leilão para confirmar</label>
            <input ref={inputRef} id={inputId} name="confirmationTitle" type="text" autoComplete="off" value={confirmationTitle} disabled={pending} aria-invalid={invalidName} aria-describedby={error ? `${inputId}-error` : undefined} onChange={(event) => { setConfirmationTitle(event.target.value); setInvalidName(false); setError(""); }} className="min-h-11 w-full rounded-md border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" />
            {error ? <p id={`${inputId}-error`} role="alert" className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => changeOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={pending}>{pending ? "Excluindo…" : "Excluir definitivamente"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
