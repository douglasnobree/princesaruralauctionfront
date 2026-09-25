import type { AuctionLotStatus, AuctionMode, AuctionStatus } from "@/lib/auctions/types";

const auctionLabels: Record<AuctionStatus, string> = {
	PRE_LAUNCH: "Pré-lance",
	COMING_SOON: "Em breve",
	WAITING_OPENING: "Aguardando abertura",
	OPEN: "Aberto",
	CLOSED: "Encerrado",
	CANCELLED: "Cancelado",
};

const auctionStyles: Record<AuctionStatus, string> = {
	PRE_LAUNCH: "bg-muted text-foreground",
	COMING_SOON: "bg-primary text-primary-foreground",
	WAITING_OPENING: "bg-muted text-foreground",
	OPEN: "bg-secondary text-secondary-foreground",
	CLOSED: "bg-muted text-muted-foreground",
	CANCELLED: "bg-primary text-primary-foreground",
};

const lotLabels: Record<AuctionLotStatus, string> = {
	OPEN: "Aberto",
	PAUSED: "Pausado",
	SOLD: "Vendido",
	CLOSED: "Encerrado",
	CANCELLED: "Cancelado",
};

const lotStyles: Record<AuctionLotStatus, string> = {
	OPEN: "bg-secondary text-secondary-foreground",
	PAUSED: "bg-muted text-muted-foreground",
	SOLD: "bg-primary text-primary-foreground",
	CLOSED: "bg-muted text-muted-foreground",
	CANCELLED: "bg-primary text-primary-foreground",
};

function auctionLabel(status: AuctionStatus, mode?: AuctionMode) {
	if (status === "PRE_LAUNCH") return "Pré-lance";
	if (status === "COMING_SOON" || status === "WAITING_OPENING") return "Em breve";
	if (status === "OPEN") {
		if (mode === "LIVE") return "Ao vivo";
		if (mode === "TIMED") return "Shopping no ar";
		if (mode === "SHOPPING") return "Mercado no ar";
	}
	return auctionLabels[status];
}

export function AuctionStatusBadge({ status, mode }: { status: AuctionStatus; mode?: AuctionMode }) {
	return (
		<span
			className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${auctionStyles[status]}`}
		>
			{auctionLabel(status, mode)}
		</span>
	);
}

export function AuctionLotStatusBadge({
	status,
	mode,
	preBidActive = false,
}: {
	status: AuctionLotStatus;
	mode?: AuctionMode;
	preBidActive?: boolean;
}) {
	const label = status === "SOLD"
		? "VENDIDO"
		: status === "OPEN" && preBidActive
			? "Pré-lance"
			: status === "OPEN" && mode === "LIVE"
				? "AO VIVO"
					: lotLabels[status];
	return (
		<span
			className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${lotStyles[status]}`}
		>
			{label}
		</span>
	);
}
