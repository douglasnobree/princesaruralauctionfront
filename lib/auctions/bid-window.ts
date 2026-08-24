import type { EngineAuctionSnapshot } from '@/lib/auctions/engine-types';

type EngineAuction = EngineAuctionSnapshot['auction'];

export function hasConfiguredPreBid(auction: EngineAuction): boolean {
  return (
    auction.preBidEnabled &&
    Boolean(
      auction.preBidStartsAt ||
        auction.preBidEndsAt ||
        (auction.mode === 'LIVE' && auction.startsAt),
    )
  );
}

export function isPreBidOpen(
  auction: EngineAuction,
  nowMs = Date.now(),
): boolean {
  if (auction.status !== 'SCHEDULED' || !hasConfiguredPreBid(auction)) {
    return false;
  }

  if (
    auction.preBidStartsAt &&
    nowMs < new Date(auction.preBidStartsAt).getTime()
  ) {
    return false;
  }

  if (
    auction.preBidEndsAt &&
    nowMs >= new Date(auction.preBidEndsAt).getTime()
  ) {
    return false;
  }

  if (auction.mode === 'LIVE' && !auction.preBidStartsAt && !auction.preBidEndsAt) {
    return nowMs < new Date(auction.startsAt ?? 0).getTime();
  }

  return true;
}

export function isPreBidClosed(
  auction: EngineAuction,
  nowMs = Date.now(),
): boolean {
  if (!hasConfiguredPreBid(auction)) return false;
  const cutoff =
    auction.preBidEndsAt ??
    (auction.mode === 'LIVE' ? auction.startsAt : null);
  return Boolean(cutoff && nowMs >= new Date(cutoff).getTime());
}

export function auctionAcceptsBids(
  auction: EngineAuction,
  nowMs = Date.now(),
): boolean {
  if (auction.mode === 'LIVE') {
    return auction.status === 'RUNNING' || isPreBidOpen(auction, nowMs);
  }

  if (auction.status === 'RUNNING') {
    return !(
      auction.preBidEnabled &&
      auction.preBidEndsAt &&
      nowMs >= new Date(auction.preBidEndsAt).getTime()
    );
  }

  return isPreBidOpen(auction, nowMs);
}
