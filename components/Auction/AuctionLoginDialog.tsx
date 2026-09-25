"use client";

import { LogIn, UserPlus } from "lucide-react";
import { AuctionReturnToLink } from "@/components/Auth/AuctionReturnToLink";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AuctionLoginDialog({
	open,
	onOpenChange,
	shopping = false,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	shopping?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary sm:mx-0">
            <LogIn className="size-7" aria-hidden="true" />
          </div>
			<DialogTitle>{shopping ? "Faça login para comprar este lote" : "Faça login para participar do leilão"}</DialogTitle>
			<DialogDescription>
				{shopping
					? "Para confirmar a compra, entre na sua conta PR Leilões. Ainda não tem cadastro? Crie uma conta gratuita."
					: "Para acompanhar a disputa e enviar lances, entre na sua conta PR Leilões. Ainda não tem cadastro? Crie uma conta gratuita."}
			</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" asChild>
            <AuctionReturnToLink href="/cadastro" className="inline-flex items-center justify-center gap-2">
              <UserPlus className="size-4" aria-hidden="true" />
              Criar cadastro
            </AuctionReturnToLink>
          </Button>
          <Button asChild>
            <AuctionReturnToLink href="/login" className="inline-flex items-center justify-center gap-2">
              <LogIn className="size-4" aria-hidden="true" />
              Entrar
            </AuctionReturnToLink>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
