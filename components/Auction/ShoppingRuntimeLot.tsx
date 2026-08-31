"use client";

import * as React from "react";
import { CircleAlert, Loader2, ShoppingCart } from "lucide-react";
import { ShoppingPurchaseDialog } from "@/components/Auction/ShoppingPurchaseDialog";
import { Button } from "@/components/ui/button";
import { buyShoppingLotAction } from "@/hooks/actions/auctionEngineActions";
import type { EngineAuctionSnapshot, EngineBidResult, EngineLot } from "@/lib/auctions/engine-types";
import type { ActionResult } from "@/types/common";

function formatCents(value: string | null, currency: string) {
	if (value === null) return "—";
	return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(value) / 100);
}

export function ShoppingRuntimeLot({ auctionId, auction, currency, lot, registrationApproved, onResult }: { auctionId: string; auction: EngineAuctionSnapshot["auction"]; currency: string; lot: EngineLot; registrationApproved: boolean; onResult: (result: ActionResult<EngineBidResult | Record<string, unknown>>) => void }) {
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const [busy, setBusy] = React.useState(false);
	const purchaseOpen = registrationApproved && ["SCHEDULED", "RUNNING"].includes(auction.status) && lot.status === "OPEN" && lot.fixedPriceCents !== null;
	const unavailableMessage = !registrationApproved ? "Somente usuários habilitados podem comprar este lote." : purchaseOpen ? null : "Este lote não está disponível para compra agora.";
	const confirmPurchase = async () => {
		if (busy || !purchaseOpen) return;
		setBusy(true);
		try {
			const result = await buyShoppingLotAction(auctionId, lot.externalId);
			onResult(result);
			if (result.success) setDialogOpen(false);
		} finally {
			setBusy(false);
		}
	};
	return <>
		<article aria-busy={busy} className="rounded-2xl border bg-card p-5 shadow-xs transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
			<div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Lote {String(lot.lotNumber).padStart(2, "0")}</p><h3 className="mt-1 truncate text-lg font-bold">{lot.title}</h3></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${lot.status === "OPEN" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{lot.status === "OPEN" ? "Disponível" : lot.status === "SOLD" ? "Vendido" : "Indisponível"}</span></div>
			<div className="mt-5 rounded-xl bg-muted/45 p-4"><p className="text-xs text-muted-foreground">Preço fixo</p><p className="mt-1 text-3xl font-bold tabular-nums text-primary">{formatCents(lot.fixedPriceCents, currency)}</p></div>
			<p className="mt-3 text-sm leading-6 text-muted-foreground">Compra imediata: o primeiro usuário habilitado que confirmar fica com o lote.</p>
			<Button type="button" className="mt-5 h-11 w-full" disabled={!purchaseOpen || busy} onClick={() => setDialogOpen(true)}>{busy ? <Loader2 className="size-4 animate-spin" /> : <><ShoppingCart className="size-4" />Comprar agora</>}</Button>
			{unavailableMessage ? <p className="mt-4 inline-flex items-center gap-2 text-sm text-amber-700"><CircleAlert className="size-4 shrink-0" />{unavailableMessage}</p> : null}
		</article>
		<ShoppingPurchaseDialog open={dialogOpen} onOpenChange={setDialogOpen} lotTitle={lot.title} priceLabel={formatCents(lot.fixedPriceCents, currency)} isSubmitting={busy} onConfirm={() => void confirmPurchase()} />
	</>;
}
