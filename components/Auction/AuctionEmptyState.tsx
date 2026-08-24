import { Gavel } from "lucide-react";

interface AuctionEmptyStateProps {
	title: string;
	description: string;
}

export function AuctionEmptyState({
	title,
	description,
}: AuctionEmptyStateProps) {
	return (
		<div className="grid min-h-72 place-items-center rounded-xl border border-dashed bg-card p-8 text-center">
			<div className="max-w-sm">
				<span className="mx-auto grid size-11 place-items-center rounded-full bg-muted text-secondary">
					<Gavel className="size-5" />
				</span>
				<h2 className="mt-4 text-lg font-semibold">{title}</h2>
				<p className="mt-2 text-sm leading-6 text-muted-foreground">
					{description}
				</p>
			</div>
		</div>
	);
}
