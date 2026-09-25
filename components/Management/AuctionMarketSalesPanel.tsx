"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listMarketSalesAction } from "@/hooks/actions/auctionEngineActions";
import type { EngineMarketSale } from "@/lib/auctions/engine-types";

function formatCents(value: string | null, currency: string) {
	if (value == null) return "Valor indisponível";
	return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(value) / 100);
}

function formatDate(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "Data indisponível"
		: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Fortaleza" }).format(date);
}

export function AuctionMarketSalesPanel({ auctionId }: { auctionId: string }) {
	const [items, setItems] = useState<EngineMarketSale[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		const result = await listMarketSalesAction(auctionId);
		if (result.success && result.data) setItems(result.data.items);
		else setError(result.error || "Não foi possível carregar as vendas do Mercado.");
		setLoading(false);
	}, [auctionId]);

	useEffect(() => { void load(); }, [load]);

	return (
		<section className="space-y-5" aria-labelledby="market-sales-title">
			<header className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
				<div className="flex items-center gap-2 text-secondary">
					<ShoppingCart className="size-5" aria-hidden="true" />
					<p className="text-xs font-semibold uppercase tracking-[0.14em]">Mercado</p>
				</div>
				<h2 id="market-sales-title" className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">Vendas do Mercado</h2>
				<p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
					Quando um participante habilitado compra, o comprador é confirmado e o lote fica vendido no mesmo ato. A equipe deve entrar em contato para combinar o pagamento fora do sistema.
				</p>
			</header>

			{error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p> : null}

			{loading ? (
				<div role="status" className="flex items-center gap-2 rounded-xl border bg-card p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Carregando vendas…</div>
			) : items.length === 0 ? (
				<div className="rounded-xl border border-dashed bg-card p-8 text-center">
					<CheckCircle2 className="mx-auto size-7 text-secondary" aria-hidden="true" />
					<p className="mt-2 font-semibold">Nenhuma venda registrada.</p>
					<p className="mt-1 text-sm text-muted-foreground">As compras confirmadas aparecerão aqui com os dados do comprador.</p>
				</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<article key={item.saleId} className="rounded-xl border bg-card p-4 shadow-xs sm:p-5">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lote {String(item.lotNumber).padStart(2, "0")} · vendido em {formatDate(item.createdAt)}</p>
									<h3 className="mt-1 text-lg font-bold">{item.lotTitle}</h3>
									<p className="mt-1 font-semibold text-secondary">{formatCents(item.amountCents, item.currency)}</p>
								</div>
								<span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary"><CheckCircle2 className="size-3.5" aria-hidden="true" />Vendido</span>
							</div>
							<div className="mt-4 rounded-lg bg-muted/35 p-3 text-sm">
								<p className="font-semibold">Comprador: {item.displayName || "Participante"}</p>
								<p className="mt-1 text-muted-foreground">E-mail: {item.contactEmail || "não informado"}</p>
								<p className="text-muted-foreground">Telefone: {item.contactPhone || "não informado"}</p>
							</div>
						</article>
					))}
				</div>
			)}

			<div className="flex justify-end">
				<Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
					<RefreshCw className="size-4" aria-hidden="true" />Atualizar
				</Button>
			</div>
		</section>
	);
}
