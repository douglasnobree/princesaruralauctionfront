import {
	ChevronDown,
	GitFork,
	MessageCircle,
} from "lucide-react";
import type { Auction, AuctionLot } from "@/lib/auctions/types";

const PRINCESA_RURAL_WHATSAPP = "5588999555710";

export function AuctionLotInformationSections({
	auction,
	lot,
}: {
	auction: Auction;
	lot: AuctionLot;
}) {
	const information = [
		{
			title: "Regulamento",
			text:
				auction.regulationText ||
				"Consulte o regulamento deste leilão com nossa equipe.",
		},
		{
			title: "Forma de pagamento",
			text:
				lot.payment ||
				auction.paymentText ||
				"Consulte as condições de pagamento deste lote com nossa equipe.",
		},
		{
			title: "Frete e entrega",
			text:
				lot.deliveryDescription ||
				auction.deliveryText ||
				"Consulte as condições de frete e entrega deste lote com nossa equipe.",
		},
	];
	const whatsappMessage = `Olá! Tenho uma dúvida sobre o lote ${String(lot.number).padStart(2, "0")} - ${lot.title}, do leilão ${auction.title}.`;
	const whatsappUrl = `https://wa.me/${PRINCESA_RURAL_WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`;

	return (
		<section
			className="rounded-xl border bg-card p-5 shadow-xs sm:p-6"
			aria-label="Documentos e condições do lote"
		>
			{lot.genealogyUrl ? (
				<a
					href={lot.genealogyUrl}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={`Abrir PDF da genealogia do lote ${String(lot.number).padStart(2, "0")} em nova guia`}
					className="flex min-h-14 w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 text-center font-semibold text-foreground outline-none transition-[border-color,color,box-shadow] hover:border-secondary/60 hover:text-secondary focus-visible:ring-3 focus-visible:ring-ring"
				>
					<GitFork className="size-5 text-secondary" aria-hidden="true" />
					Ver genealogia do lote
				</a>
			) : (
				<div
					className="flex min-h-14 w-full items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground"
					role="status"
				>
					<GitFork className="size-5 shrink-0" aria-hidden="true" />
					<span>
						<strong className="font-semibold text-foreground">
							Genealogia indisponível.
						</strong>{" "}
						Este lote ainda não possui PDF de genealogia cadastrado.
					</span>
				</div>
			)}

			<div className="mt-8 border-t pt-8">
				<div className="space-y-7">
					{information.map((item) => (
						<details
							key={item.title}
							className="group rounded-lg border bg-background [&_summary::-webkit-details-marker]:hidden"
						>
							<summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-base font-semibold outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring sm:px-5">
								{item.title}
								<ChevronDown
									className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
									aria-hidden="true"
								/>
							</summary>
							<p className="border-t px-4 py-4 text-sm leading-7 whitespace-pre-wrap text-muted-foreground sm:px-5">
								{item.text}
							</p>
						</details>
					))}
				</div>

				<div className="mt-9">
					<div className="flex items-center gap-3">
						<span className="flex size-12 shrink-0 items-center justify-center rounded-full border bg-background">
							<MessageCircle className="size-5" aria-hidden="true" />
						</span>
						<div>
							<p className="font-semibold">Dúvidas?</p>
							<p className="text-sm text-muted-foreground">
								Entre em contato com nossa equipe
							</p>
						</div>
					</div>
					<a
						href={whatsappUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-secondary px-5 py-3 text-sm font-semibold text-secondary outline-none transition-[background-color,color,box-shadow] hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-3 focus-visible:ring-ring sm:max-w-sm"
					>
						Entrar em contato
					</a>
				</div>
			</div>
		</section>
	);
}
