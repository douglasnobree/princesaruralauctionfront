import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(join(root, path), "utf8");

test("genealogy is removed from the public listing and kept in the lot detail", async () => {
	const [experience, card, detail, information] = await Promise.all([
		read("components/Auction/AuctionLiveExperience.tsx"),
		read("components/Auction/AuctionLotCard.tsx"),
		read("components/Auction/AuctionLotDetail.tsx"),
		read("components/Auction/AuctionLotInformationSections.tsx"),
	]);

	assert.doesNotMatch(experience, /AuctionGenealogyViewer/);
	assert.doesNotMatch(card, /Genealogia disponível/);
	assert.match(detail, /AuctionLotInformationSections/);
	assert.match(information, /Genealogia completa/);
	assert.match(information, /lot\.genealogyUrl/);
	assert.match(information, /target="_blank"/);
});

test("lot detail exposes commercial sections and WhatsApp contact", async () => {
	const [information, catalog, types] = await Promise.all([
		read("components/Auction/AuctionLotInformationSections.tsx"),
		read("lib/auctions/catalog.ts"),
		read("lib/auctions/types.ts"),
	]);

	for (const label of [
		"Regulamento",
		"Forma de pagamento",
		"Frete e entrega",
		"Dúvidas?",
		"Entrar em contato",
	]) {
		assert.match(information, new RegExp(label.replace("?", "\\?")));
	}
	assert.match(information, /https:\/\/wa\.me\//);
	assert.match(information, /lot\.payment \|\|/);
	assert.match(information, /lot\.deliveryDescription \|\|/);
	for (const field of ["regulationText", "paymentText", "deliveryText"]) {
		assert.match(catalog, new RegExp(field));
		assert.match(types, new RegExp(field));
	}
});

test("lot video and photos share an interactive primary media gallery", async () => {
	const [detail, gallery] = await Promise.all([
		read("components/Auction/AuctionLotDetail.tsx"),
		read("components/Auction/AuctionLotMediaGallery.tsx"),
	]);

	assert.match(detail, /AuctionLotMediaGallery/);
	assert.doesNotMatch(detail, /getYoutubeEmbedUrl/);
	assert.match(gallery, /youtubeVideoId[\s\S]*\? \{ type: "video" \}/);
	assert.match(gallery, /aria-pressed/);
	assert.match(gallery, /Exibir o vídeo do lote/);
	assert.match(gallery, /Exibir foto/);
	assert.match(gallery, /setSelectedMedia/);
});

test("legacy marketplace lot images resolve through the marketplace origin", async () => {
	const [catalog, nextConfig] = await Promise.all([
		read("lib/auctions/catalog.ts"),
		read("next.config.ts"),
	]);

	assert.match(catalog, /getMarketplaceUrl/);
	assert.match(catalog, /pathOrUrl\.startsWith\("\/BestSellers\/"\)/);
	assert.match(catalog, /pathOrUrl\.startsWith\("\/FeaturedProducts\/"\)/);
	assert.match(nextConfig, /hostname: "princesarural\.com\.br"/);
});
