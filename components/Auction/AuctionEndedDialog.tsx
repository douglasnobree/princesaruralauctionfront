"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export function AuctionEndedDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) router.replace("/leiloes", { scroll: false });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%_-_2rem)] overflow-hidden border-0 p-0 sm:max-w-md sm:p-0">
        <div className="h-1.5 bg-primary" aria-hidden="true" />
        <div className="px-6 pb-7 pt-4 text-center sm:px-8 sm:pb-8">
          <Image
            src="/brand/pr-leiloes/logo-horizontal-color.svg"
            alt="PR Leilões"
            width={180}
            height={54}
            className="mx-auto mb-7 h-auto w-44"
          />
          <DialogTitle className="text-2xl font-bold leading-tight tracking-tight">
            Obrigado por participar!
          </DialogTitle>
          <DialogDescription className="mt-3 text-base leading-7">
            O Leilão terminou, obrigado por participar!
            <br />
            a PR Leilões Agradece.
          </DialogDescription>
          <DialogClose asChild>
            <Button type="button" variant="secondary" className="mt-7 min-h-11 w-full">
              Ver próximos leilões
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
