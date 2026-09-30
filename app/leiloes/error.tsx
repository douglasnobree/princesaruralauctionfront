"use client";

import { AuctionErrorState } from "@/components/Auction/AuctionErrorState";
import { AuctionSellerCta } from "@/components/AuctionEnquiry/AuctionSellerCta";

export default function AuctionErrorBoundary({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return <><AuctionErrorState error={error} reset={reset} /><div className="px-4 pb-12 sm:px-6"><AuctionSellerCta /></div></>;
}
