interface AuctionLoadingStateProps {
	variant?: "list" | "lots" | "detail";
}

export function AuctionLoadingState({
	variant = "list",
}: AuctionLoadingStateProps) {
	if (variant === "detail") {
		return (
			<div className="container mx-auto max-w-6xl animate-pulse px-4 py-8 lg:px-6">
				<div className="mb-5 h-5 w-2/3 rounded bg-muted" />
				<div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
					<div className="space-y-5">
						<div className="aspect-video rounded-lg bg-muted" />
						<div className="h-48 rounded-xl bg-muted" />
					</div>
					<div className="h-[28rem] rounded-xl bg-muted" />
				</div>
			</div>
		);
	}

	if (variant === "lots") {
		return (
			<div className="container mx-auto max-w-6xl animate-pulse px-4 py-8 lg:px-6">
				<div className="h-48 rounded-xl bg-muted" />
				<div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{[1, 2, 3].map((item) => (
						<div key={item} className="h-96 rounded-xl bg-muted" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-6xl animate-pulse px-4 py-10 lg:px-0">
			<div className="h-56 rounded-2xl bg-muted" />
			<div className="mt-10 h-9 w-72 rounded bg-muted" />
			<div className="mt-7 grid gap-6 md:grid-cols-2">
				{[1, 2].map((item) => (
					<div key={item} className="h-72 rounded-xl bg-muted" />
				))}
			</div>
		</div>
	);
}
