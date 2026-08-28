"use client";

import { Play, Youtube } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { AuctionLot } from "@/lib/auctions/types";

type SelectedMedia =
	| { type: "video" }
	| { type: "image"; imageId: string };

function getYoutubeVideoId(value: string) {
	try {
		const url = new URL(value);
		const hostname = url.hostname.toLowerCase();

		if (hostname === "youtu.be") return url.pathname.slice(1) || null;
		if (hostname !== "youtube.com" && !hostname.endsWith(".youtube.com")) {
			return null;
		}
		if (url.pathname === "/watch") return url.searchParams.get("v");
		if (url.pathname.startsWith("/shorts/")) {
			return url.pathname.split("/")[2] || null;
		}
		if (url.pathname.startsWith("/embed/")) {
			return url.pathname.split("/")[2] || null;
		}
		return null;
	} catch {
		return null;
	}
}

export function AuctionLotMediaGallery({ lot }: { lot: AuctionLot }) {
	const youtubeVideoId = lot.youtubeUrl
		? getYoutubeVideoId(lot.youtubeUrl)
		: null;
	const images =
		lot.images.length > 0
			? lot.images
			: [
					{
						id: "primary-image",
						url: lot.image,
						altText: lot.title,
						sortOrder: 0,
					},
				];
	const [selectedMedia, setSelectedMedia] = useState<SelectedMedia>(
		youtubeVideoId
			? { type: "video" }
			: { type: "image", imageId: images[0].id },
	);
	const selectedImage =
		selectedMedia.type === "image"
			? images.find((image) => image.id === selectedMedia.imageId) ?? images[0]
			: images[0];
	const showPicker = Boolean(youtubeVideoId) || images.length > 1;

	return (
		<section aria-label={`Mídia do lote ${lot.title}`}>
			<div className="relative aspect-video overflow-hidden rounded-lg bg-black">
				{selectedMedia.type === "video" && youtubeVideoId ? (
					<iframe
						src={`https://www.youtube.com/embed/${youtubeVideoId}?rel=0`}
						title={`Vídeo do lote ${lot.title}`}
						className="size-full"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowFullScreen
					/>
				) : (
					<Image
						src={selectedImage.url}
						alt={selectedImage.altText || lot.title}
						fill
						className="object-contain"
						sizes="(min-width: 1024px) 65vw, 100vw"
						priority
					/>
				)}
			</div>

			{showPicker ? (
				<div
					className="mt-3 flex gap-3 overflow-x-auto pb-1"
					aria-label="Selecionar vídeo ou foto"
				>
					{youtubeVideoId ? (
						<button
							type="button"
							onClick={() => setSelectedMedia({ type: "video" })}
							aria-label="Exibir o vídeo do lote"
							aria-pressed={selectedMedia.type === "video"}
							className={`relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-black text-white outline-none transition-[border-color,box-shadow] focus-visible:ring-3 focus-visible:ring-ring ${
								selectedMedia.type === "video"
									? "border-secondary ring-2 ring-secondary/20"
									: "border-border"
							}`}
						>
							<span className="flex flex-col items-center gap-1 text-[10px] font-semibold uppercase tracking-wide">
								<span className="relative flex size-8 items-center justify-center rounded-full bg-white/15">
									<Play className="ml-0.5 size-4 fill-current" aria-hidden="true" />
								</span>
								Vídeo
							</span>
							<Youtube className="absolute right-1.5 top-1.5 size-3.5 text-red-500" aria-hidden="true" />
						</button>
					) : null}

					{images.map((image, index) => {
						const selected =
							selectedMedia.type === "image" &&
							selectedMedia.imageId === image.id;
						return (
							<button
								key={image.id}
								type="button"
								onClick={() =>
									setSelectedMedia({ type: "image", imageId: image.id })
								}
								aria-label={`Exibir foto ${index + 1} do lote`}
								aria-pressed={selected}
								className={`relative size-20 shrink-0 overflow-hidden rounded-md border bg-card outline-none transition-[border-color,box-shadow] focus-visible:ring-3 focus-visible:ring-ring ${
									selected
										? "border-secondary ring-2 ring-secondary/20"
										: "border-border"
								}`}
							>
								<Image
									src={image.url}
									alt={image.altText || `Foto ${index + 1} de ${lot.title}`}
									fill
									className="object-cover"
									sizes="80px"
								/>
							</button>
						);
					})}
				</div>
			) : null}
		</section>
	);
}
