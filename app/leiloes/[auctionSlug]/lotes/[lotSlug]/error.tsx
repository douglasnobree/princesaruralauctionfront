"use client";

import { AuctionErrorState } from "@/components/Auction/AuctionErrorState";

export default function AuctionErrorBoundary({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return <AuctionErrorState error={error} reset={reset} />;
}
