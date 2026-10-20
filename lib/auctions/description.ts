/** Older auctions may repeat the entire regulation in the description field. */
export function getAuctionIntroDescription(
  description?: string | null,
  regulation?: string | null,
): string | null {
  const text = description?.trim();
  if (!text) return null;
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  if (regulation?.trim() && normalize(text) === normalize(regulation)) return null;
  return text;
}
