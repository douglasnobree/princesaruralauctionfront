import { getEngineQuickBidOptions } from "./engine-formatters";
import type { EngineAuctionSnapshot, EngineLot } from "./engine-types";

export type FloorBidValueDraft = {
  lotExternalId: string;
  nextBidCents: string;
  incrementCents: string;
  value: string;
};

export function getFloorBidAmount(lot: EngineLot | undefined, draft: FloorBidValueDraft | null) {
  if (!lot) return "";
  return draft?.lotExternalId === lot.externalId &&
    draft.nextBidCents === lot.nextBidCents &&
    draft.incrementCents === (lot.currentIncrementCents ?? lot.incrementCents) &&
    getEngineQuickBidOptions(lot).some((option) => option.value === draft.value)
    ? draft.value
    : lot.nextBidCents;
}

/** A delayed read or command response must not roll back a confirmed lot version. */
export function mergeOperationSnapshot(current: EngineAuctionSnapshot | null, incoming: EngineAuctionSnapshot): EngineAuctionSnapshot {
  if (!current || current.auction.id !== incoming.auction.id) return incoming;
  const auction = BigInt(current.auction.version) >= BigInt(incoming.auction.version) ? current.auction : incoming.auction;
  const stream = current.stream && (!incoming.stream || (
    current.stream.id === incoming.stream.id && BigInt(current.stream.version) >= BigInt(incoming.stream.version)
  )) ? current.stream : incoming.stream;
  const lots = incoming.lots.map((lot) => {
    const previous = current.lots.find((item) => item.id === lot.id);
    return previous && BigInt(previous.version) >= BigInt(lot.version) ? previous : lot;
  });
  if (auction === current.auction && stream === current.stream && lots.length === current.lots.length && lots.every((lot, index) => lot === current.lots[index])) return current;
  return { ...incoming, auction, stream, lots };
}
