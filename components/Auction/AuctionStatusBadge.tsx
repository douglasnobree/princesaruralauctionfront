import type { AuctionLotStatus, AuctionStatus } from "@/lib/auctions/types";

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

export function AuctionStatusBadge({ status }: { status: AuctionStatus }) {
	return (
		<span
			className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${auctionStyles[status]}`}
		>
			{auctionLabels[status]}
		</span>
	);
}

export function AuctionLotStatusBadge({
	status,
}: {
	status: AuctionLotStatus;
}) {
	return (
		<span
			className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${lotStyles[status]}`}
		>
			{lotLabels[status]}
		</span>
	);
}
