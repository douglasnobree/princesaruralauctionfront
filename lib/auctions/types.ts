export type AuctionStatus =
	| "PRE_LAUNCH"
	| "COMING_SOON"
	| "WAITING_OPENING"
	| "OPEN"
	| "CLOSED"
	| "CANCELLED";

export type AuctionLotStatus = "OPEN" | "PAUSED" | "SOLD" | "CLOSED" | "CANCELLED";

export type AuctionCategory = "ANIMAL" | "MACHINE";
export type AuctionMode = "SHOPPING" | "LIVE" | "TIMED";

export type AuctionImage = {
	id: string;
	url: string;
	altText?: string | null;
	sortOrder: number;
};

export type AuctionDetail = {
	label: string;
	value: string;
};

export type AuctionLot = {
	id: string;
	slug: string;
	number: number;
	title: string;
	mode?: AuctionMode;
	auctionSlug: string;
	category: AuctionCategory;
	status: AuctionLotStatus;
	startingBidCents?: number | null;
	image: string;
	images: AuctionImage[];
	closesAt?: string | null;
	closesAtLabel: string;
	payment?: string | null;
	deliveryDescription?: string | null;
	details: AuctionDetail[];
	documentText?: string | null;
	youtubeUrl?: string | null;
	genealogyUrl?: string | null;
};

export type Auction = {
	id?: string;
	slug: string;
	title: string;
	mode?: "SHOPPING" | "LIVE" | "TIMED";
	description?: string | null;
	regulationText?: string | null;
	paymentText?: string | null;
	deliveryText?: string | null;
	startsAt: string;
	endsAt?: string | null;
	date: string;
	time: string;
	lotCount: number;
	status: AuctionStatus;
	image: string;
	lots: AuctionLot[];
};
