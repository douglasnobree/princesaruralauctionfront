"use client";

import { useEffect, useState } from "react";

function formatRemaining(totalSeconds: number) {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return String(hours) + "h " + String(minutes).padStart(2, "0") + "m " + String(seconds).padStart(2, "0") + "s";
}

export function AuctionWindowCountdown({
	endsAt,
	serverTime,
	label,
}: {
	endsAt: string;
	serverTime?: string;
	label: string;
}) {
	const [remaining, setRemaining] = useState<number | null>(null);

	useEffect(() => {
		const end = new Date(endsAt).getTime();
		const server = serverTime ? new Date(serverTime).getTime() : NaN;
		if (!Number.isFinite(end)) {
			setRemaining(null);
			return;
		}
		const offset = Number.isFinite(server) ? server - Date.now() : 0;
		const update = () => {
			const seconds = Math.max(0, Math.ceil((end - (Date.now() + offset)) / 1000));
			setRemaining(seconds > 0 ? seconds : null);
		};
		update();
		const timer = window.setInterval(update, 1000);
		return () => window.clearInterval(timer);
	}, [endsAt, serverTime]);

	if (remaining === null) return null;
	return <p className="text-xs font-semibold tabular-nums text-secondary" aria-live="off">{label} {formatRemaining(remaining)}</p>;
}
