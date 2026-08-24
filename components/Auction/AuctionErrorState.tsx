"use client";

interface AuctionErrorStateProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export function AuctionErrorState({ error, reset }: AuctionErrorStateProps) {
	return (
		<div className="container mx-auto max-w-3xl px-4 py-16 text-center">
			<h1 className="text-2xl font-bold">
				Não foi possível carregar os leilões
			</h1>
			<p className="mt-3 text-muted-foreground">
				Verifique sua conexão e tente novamente. Os dados vêm da API pública.
			</p>
			{process.env.NODE_ENV === "development" && error.message ? (
				<p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
			) : null}
			<button
				type="button"
				onClick={reset}
				className="mt-6 inline-flex min-h-11 items-center rounded-md bg-secondary px-5 font-semibold text-secondary-foreground hover:bg-secondary/90"
			>
				Tentar novamente
			</button>
		</div>
	);
}
