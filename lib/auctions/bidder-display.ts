import type { EngineAuctionSnapshot, EngineLot } from "@/lib/auctions/engine-types";

type BidderDisplayLot = Pick<
	EngineLot,
	"currentBidderName" | "currentBidderAlias" | "currentPriceCents"
>;

export function getReadableBidderName(value?: string | null): string | null {
	const normalized = value?.trim();
	return normalized && !/^Participante(?: [A-F0-9]{6})?$/.test(normalized)
		? normalized
		: null;
}

/**
 * Resolves the public label for the participant leading a lot.
 *
 * The Engine may intentionally omit a private display name from public
 * snapshots, while still returning the stable per-auction alias. A confirmed
 * amount without either identity must not be rendered as if no bid existed.
 */
export function getBidderDisplayName(lot: BidderDisplayLot): string | null {
	const name = lot.currentBidderName?.trim();
	if (name) return getReadableBidderName(name);

	const alias = getReadableBidderName(lot.currentBidderAlias);
	if (alias) return alias;

	return lot.currentPriceCents !== null ? "Participante identificado" : null;
}

/**
 * Realtime public snapshots intentionally omit private names. Keep a name
 * already received from the accepted-bid response for that same effective
 * bid, but discard it as soon as the Engine advances the lot sequence.
 */
export function mergeKnownBidderNames(
	previous: EngineAuctionSnapshot | null,
	next: EngineAuctionSnapshot,
): EngineAuctionSnapshot {
	if (!previous) return next;

	return {
		...next,
		lots: next.lots.map((nextLot) => {
			const previousLot = previous.lots.find((lot) => lot.id === nextLot.id);
			const nextName = nextLot.currentBidderName?.trim();
			const previousName = previousLot?.currentBidderName?.trim();

			if (!previousLot || nextName || !previousName || previousLot.lotSequence !== nextLot.lotSequence) {
				return nextLot;
			}

			return { ...nextLot, currentBidderName: previousName };
		}),
	};
}
