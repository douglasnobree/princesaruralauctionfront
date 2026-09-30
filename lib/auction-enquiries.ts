// Same team contact used on public lot details.
export const AUCTION_TEAM_WHATSAPP = "5588999555710";

export function getAuctionEnquiryUrl(message = "Olá! Quero realizar um leilão com a PR Leilões. Podemos conversar?") {
  return `https://wa.me/${AUCTION_TEAM_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

export const AUCTION_ASSET_TYPES = [
  "Bovinos e outros animais",
  "Máquinas agrícolas",
  "Veículos",
  "Imóveis e propriedades rurais",
  "Equipamentos",
  "Outros bens",
] as const;
