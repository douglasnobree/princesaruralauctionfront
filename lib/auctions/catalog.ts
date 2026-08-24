import type {
	Auction,
	AuctionCategory,
	AuctionDetail,
	AuctionImage,
	AuctionLot,
	AuctionLotStatus,
	AuctionStatus,
} from "@/lib/auctions/types";

const API_BASE_URL = (
	process.env.NEXT_PUBLIC_API_BASE_URL ||
	process.env.NEXT_PUBLIC_API_URL ||
	"http://localhost:4000/api"
).replace(/\/$/, "");
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
const PLACEHOLDER_IMAGE = "/placeholder-image.svg";

type ApiAuctionImage = {
	id: string;
	filename: string;
	url?: string | null;
	altText?: string | null;
	sortOrder: number;
};

type ApiAuctionLot = {
	id: string;
	auctionId: string;
	auctionSlug?: string;
	number: number;
	slug: string;
	title: string;
	category: AuctionCategory;
	status: AuctionLotStatus;
	paymentDescription?: string | null;
	deliveryDescription?: string | null;
	details?: unknown;
	closesAt?: string | null;
	documentText?: string | null;
	youtubeUrl?: string | null;
	genealogyUrl?: string | null;
	images?: ApiAuctionImage[];
};

type ApiAuction = {
	id: string;
	title: string;
	slug: string;
	description?: string | null;
	mode?: "SHOPPING" | "LIVE" | "TIMED";
	coverImage?: string | null;
	coverImageUrl?: string | null;
	startsAt: string;
	endsAt?: string | null;
	plannedLotCount?: number;
	lotCount: number;
	status: AuctionStatus;
	lots?: ApiAuctionLot[];
};

export class AuctionCatalogError extends Error {
	constructor(
		message = "Não foi possível carregar os leilões.",
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = "AuctionCatalogError";
	}
}

async function fetchApi<T>(path: string): Promise<T | undefined> {
	try {
		const response = await fetch(`${API_BASE_URL}${path}`, {
			cache: "no-store",
		});

		if (response.status === 404) return undefined;
		if (!response.ok) {
			throw new AuctionCatalogError(
				`A API de leilões retornou o status ${response.status}.`,
			);
		}

		return (await response.json()) as T;
	} catch (error) {
		if (error instanceof AuctionCatalogError) throw error;
		throw new AuctionCatalogError(undefined, { cause: error });
	}
}

function formatDate(value: string, includeYear = false) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Data não informada";

	const formatted = new Intl.DateTimeFormat("pt-BR", {
		day: "numeric",
		month: "long",
		...(includeYear ? { year: "numeric" as const } : {}),
		timeZone: "America/Sao_Paulo",
	}).format(date);

	return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatTime(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Horário não informado";

	return `${new Intl.DateTimeFormat("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		timeZone: "America/Sao_Paulo",
	}).format(date)}h`;
}

function formatDateTime(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Data não informada";

	return new Intl.DateTimeFormat("pt-BR", {
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "America/Sao_Paulo",
	}).format(date);
}

function resolveAsset(pathOrUrl?: string | null, fallbackPath?: string) {
	if (!pathOrUrl) return PLACEHOLDER_IMAGE;
	if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
	if (pathOrUrl.startsWith("/uploads/")) return `${API_ORIGIN}${pathOrUrl}`;
	if (
		pathOrUrl === PLACEHOLDER_IMAGE ||
		pathOrUrl.startsWith("/BestSellers/") ||
		pathOrUrl.startsWith("/FeaturedProducts/")
	) {
		return pathOrUrl;
	}
	if (fallbackPath && !pathOrUrl.startsWith("/")) {
		return `${API_ORIGIN}${fallbackPath}${pathOrUrl}`;
	}

	return PLACEHOLDER_IMAGE;
}

function mapDetails(value: unknown): AuctionDetail[] {
	if (Array.isArray(value)) {
		return value.filter(
			(item): item is AuctionDetail =>
				Boolean(item) &&
				typeof item === "object" &&
				typeof (item as { label?: unknown }).label === "string" &&
				typeof (item as { value?: unknown }).value === "string",
		);
	}

	if (!value || typeof value !== "object") return [];

	return Object.entries(value).flatMap(([label, item]) =>
		typeof item === "string" ||
		typeof item === "number" ||
		typeof item === "boolean"
			? [{ label, value: String(item) }]
			: [],
	);
}

function mapImages(images: ApiAuctionImage[] | undefined): AuctionImage[] {
	return [...(images ?? [])]
		.sort((first, second) => first.sortOrder - second.sortOrder)
		.map((image) => ({
			id: image.id,
			url: resolveAsset(image.url || image.filename, "/uploads/auctions/lots/"),
			altText: image.altText,
			sortOrder: image.sortOrder,
		}));
}

function getClosingLabel(status: AuctionLotStatus, closesAt?: string | null) {
	if (status === "SOLD" || status === "CLOSED" || status === "CANCELLED") {
		return "Encerrado";
	}

	return closesAt ? formatDateTime(closesAt) : "Data não informada";
}

function mapLot(lot: ApiAuctionLot, auctionSlug?: string): AuctionLot {
	const images = mapImages(lot.images);

	return {
		id: lot.id,
		slug: lot.slug,
		number: lot.number,
		title: lot.title,
		auctionSlug: auctionSlug ?? lot.auctionSlug ?? "",
		category: lot.category,
		status: lot.status,
		image: images[0]?.url ?? PLACEHOLDER_IMAGE,
		images,
		closesAt: lot.closesAt,
		closesAtLabel: getClosingLabel(lot.status, lot.closesAt),
		payment: lot.paymentDescription?.trim() || null,
		deliveryDescription: lot.deliveryDescription?.trim() || null,
		details: mapDetails(lot.details),
		documentText: lot.documentText?.trim() || null,
		youtubeUrl: lot.youtubeUrl?.trim() || null,
		genealogyUrl: lot.genealogyUrl
			? resolveAsset(lot.genealogyUrl, "/uploads/auctions/lots/")
			: null,
	};
}

function mapAuction(auction: ApiAuction): Auction {
	const lots = (auction.lots ?? []).map((lot) => mapLot(lot, auction.slug));
	const coverImage = [auction.coverImageUrl, auction.coverImage].find(
		(value) =>
			value &&
			(resolveAsset(value, "/uploads/auctions/covers/") !== PLACEHOLDER_IMAGE ||
				value.startsWith("/uploads/") ||
				/^https?:\/\//i.test(value)),
	);

	return {
		id: auction.id,
		slug: auction.slug,
		title: auction.title,
		mode: auction.mode,
		description: auction.description,
		startsAt: auction.startsAt,
		endsAt: auction.endsAt,
		date: formatDate(auction.startsAt),
		time: formatTime(auction.startsAt),
		lotCount: auction.lotCount,
		status: auction.status,
		image: resolveAsset(
			coverImage || lots[0]?.image,
			"/uploads/auctions/covers/",
		),
		lots,
	};
}

export async function getAuctions(): Promise<Auction[]> {
	const response = await fetchApi<ApiAuction[]>("/auctions/public");
	return response?.map(mapAuction) ?? [];
}

export async function getAuctionBySlug(
	slug: string,
): Promise<Auction | undefined> {
	const response = await fetchApi<ApiAuction>(
		`/auctions/public/${encodeURIComponent(slug)}`,
	);

	return response ? mapAuction(response) : undefined;
}

export async function getAuctionLotBySlug(
	auctionSlug: string,
	lotSlug: string,
): Promise<AuctionLot | undefined> {
	const response = await fetchApi<ApiAuctionLot>(
		`/auctions/public/${encodeURIComponent(auctionSlug)}/lots/${encodeURIComponent(lotSlug)}`,
	);

	return response ? mapLot(response, auctionSlug) : undefined;
}
