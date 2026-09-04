import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(join(root, path), "utf8");

test("lot detail reuses the genealogy URL without preloading or regenerating the PDF", async () => {
	const [
		experience,
		card,
		detail,
		information,
		viewer,
		catalog,
		pageLoading,
		loadingState,
		fullCatalogButton,
	] = await Promise.all([
		read("components/Auction/AuctionLiveExperience.tsx"),
		read("components/Auction/AuctionLotCard.tsx"),
		read("components/Auction/AuctionLotDetail.tsx"),
		read("components/Auction/AuctionLotInformationSections.tsx"),
		read("components/Auction/AuctionGenealogyViewer.tsx"),
		read("lib/auctions/catalog.ts"),
		read("app/leiloes/[auctionSlug]/lotes/[lotSlug]/loading.tsx"),
		read("components/Auction/AuctionLoadingState.tsx"),
		read("components/Auction/AuctionFullGenealogyButton.tsx"),
	]);

	assert.doesNotMatch(experience, /AuctionGenealogyViewer/);
	assert.doesNotMatch(card, /Genealogia disponível/);
	assert.match(detail, /AuctionLotInformationSections/);
	assert.match(information, /Ver genealogia do lote/);
	assert.doesNotMatch(information, /Genealogia completa/);
	assert.match(information, /Genealogia indisponível/);
	assert.match(information, /ainda não possui PDF de genealogia cadastrado/);
	assert.match(information, /lot\.genealogyUrl/);
	assert.match(information, /href=\{lot\.genealogyUrl\}/);
	assert.match(information, /target="_blank"/);
	assert.match(information, /rel="noopener noreferrer"/);
	assert.match(information, /aria-label=\{`Abrir PDF da genealogia do lote/);
	assert.match(information, /min-h-14 w-full/);
	assert.doesNotMatch(information, /\bfetch\s*\(/);
	assert.doesNotMatch(information, /<(?:embed|iframe|object)\b/i);
	assert.doesNotMatch(information, /genealogy-catalog/);
	assert.match(viewer, /href=\{currentLot\.genealogyUrl\}/);
	assert.match(viewer, /target="_blank"/);
	assert.match(catalog, /resolveAsset\(lot\.genealogyUrl, "\/uploads\/auctions\/lots\/"\)/);
	assert.match(pageLoading, /AuctionLoadingState variant="detail"/);
	assert.match(loadingState, /Carregando os detalhes do lote e a disponibilidade do PDF de genealogia/);
	assert.match(experience, /AuctionFullGenealogyButton/);
	assert.match(fullCatalogButton, /window\.open\("about:blank", "_blank"\)/);
	assert.match(fullCatalogButton, /newTab\.opener = null/);
	assert.match(fullCatalogButton, /application\/pdf/);
	assert.match(fullCatalogButton, /role="alert"/);
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

test("registration keeps WhatsApp consent optional and revocable", async () => {
	const [dialog, consentControl, board, bidPanel, actions] = await Promise.all([
		read("components/Auction/AuctionRegistrationDialog.tsx"),
		read("components/Auction/AuctionWhatsAppConsentControl.tsx"),
		read("components/Auction/AuctionRuntimeBoard.tsx"),
		read("components/Auction/AuctionLotBidPanel.tsx"),
		read("hooks/actions/auctionEngineActions.ts"),
	]);

	assert.match(dialog, /useState\(false\)/);
	assert.match(dialog, /Você pode participar normalmente sem receber mensagens/);
	assert.match(dialog, /Cadastre um telefone válido/);
	assert.match(consentControl, /Notificações pelo WhatsApp/);
	assert.match(consentControl, /setAuctionWhatsAppConsentAction/);
	assert.match(board, /AuctionRegistrationDialog/);
	assert.match(bidPanel, /AuctionRegistrationDialog/);
	assert.match(actions, /registration\/whatsapp-consent/);
});
