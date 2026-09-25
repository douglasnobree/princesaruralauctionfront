"use client";

import { useEffect, useState } from "react";

function formatRemaining(totalSeconds: number) {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function AuctionStartCountdown({ startsAt }: { startsAt?: string | null }) {
	const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

	useEffect(() => {
		const start = startsAt ? new Date(startsAt).getTime() : NaN;
		if (!Number.isFinite(start)) {
			setRemainingSeconds(null);
			return;
		}
		const update = () => {
			const remaining = Math.ceil((start - Date.now()) / 1000);
			setRemainingSeconds(remaining > 0 && remaining <= 3600 ? remaining : null);
		};
		update();
		const timer = window.setInterval(update, 1000);
		return () => window.clearInterval(timer);
	}, [startsAt]);

	if (remainingSeconds === null) return null;
	return (
		<p className="text-xs font-semibold tabular-nums text-secondary" aria-live="off">
			Começa em {formatRemaining(remainingSeconds)}
		</p>
	);
}
