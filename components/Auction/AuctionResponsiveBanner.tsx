export function AuctionResponsiveBanner({ desktopUrl, mobileUrl, title }: {
  desktopUrl?: string | null;
  mobileUrl?: string | null;
  title: string;
}) {
  const fallback = desktopUrl || mobileUrl;
  if (!fallback) return null;
  return <picture className="mb-5 block overflow-hidden rounded-xl bg-muted" data-auction-banner>
    {mobileUrl ? <source media="(max-width: 639px)" srcSet={mobileUrl} /> : null}
    {/* Art direction preserves the whole artwork and downloads only the selected source. */}
    <img src={fallback} alt={`Banner do leilão ${title}`} className="h-auto w-full" fetchPriority="high" decoding="async" />
  </picture>;
}
