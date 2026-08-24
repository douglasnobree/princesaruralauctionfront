import Image from "next/image";

interface AuctionHeroBannerProps {
	image?: string;
	title?: string;
}

export function AuctionHeroBanner({ image, title }: AuctionHeroBannerProps) {
	return (
		<section className="relative mx-4 min-h-[220px] overflow-hidden rounded-2xl bg-secondary sm:min-h-0 sm:aspect-[1024/250]">
			{image ? (
				<Image
					src={image}
					alt={title ? `Imagem do leilão ${title}` : "Imagem de leilão"}
					fill
					priority
					className="object-cover"
					sizes="100vw"
				/>
			) : null}
			<div className="absolute inset-0 bg-secondary/35" />
			<div className="absolute inset-x-6 bottom-6 max-w-2xl text-white">
				<p className="text-sm font-semibold uppercase tracking-[0.18em]">
					Leilões Princesa Rural
				</p>
				{title ? (
					<h2 className="mt-2 text-xl font-bold sm:text-2xl">{title}</h2>
				) : null}
			</div>
		</section>
	);
}
