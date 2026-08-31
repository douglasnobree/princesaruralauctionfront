"use client";

import { Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export function ShoppingPurchaseDialog({
	open,
	onOpenChange,
	lotTitle,
	priceLabel,
	isSubmitting,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	lotTitle: string;
	priceLabel: string;
	isSubmitting: boolean;
	onConfirm: () => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<div className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
						<ShoppingCart className="size-5" aria-hidden="true" />
					</div>
					<DialogTitle>Confirmar compra do lote?</DialogTitle>
					<DialogDescription>
						Você está prestes a comprar <strong className="text-foreground">{lotTitle}</strong> por <strong className="text-foreground">{priceLabel}</strong>. A compra é imediata e definitiva: o primeiro usuário habilitado que confirmar ficará com o lote.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
					</DialogClose>
					<Button type="button" onClick={onConfirm} disabled={isSubmitting}>
						{isSubmitting ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" />Confirmando…</> : `Comprar por ${priceLabel}`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
