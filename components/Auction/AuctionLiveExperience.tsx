import {
  CalendarDays,
  Clock3,
  FlaskConical,
  History,
  Trophy,
} from 'lucide-react';
import Image from 'next/image';
import { AuctionResponsiveBanner } from './AuctionResponsiveBanner';
import { AuctionLotCard } from '@/components/Auction/AuctionLotCard';
import { AuctionFullGenealogyButton } from '@/components/Auction/AuctionFullGenealogyButton';
import { AuctionRuntimeBoard } from '@/components/Auction/AuctionRuntimeBoard';
import {
  hasConfiguredPreBid,
  isPreBidClosed,
  isPreBidOpen,
} from '@/lib/auctions/bid-window';
import { getReadableBidderName } from '@/lib/auctions/bidder-display';
import type { EngineAuctionSnapshot } from '@/lib/auctions/engine-types';
import type { AuctionLot } from '@/lib/auctions/types';

function statusLabel(
  status: string,
  mode?: 'SHOPPING' | 'LIVE' | 'TIMED',
  preBidOpen = false,
  preBidClosed = false,
) {
  if (mode === 'SHOPPING' && ['SCHEDULED', 'RUNNING', 'OPEN'].includes(status))
    return status === 'SCHEDULED' ? 'Em breve' : 'Mercado no ar';
  if (mode === 'SHOPPING' && ['FINISHED', 'CLOSED'].includes(status))
    return 'Encerrado';
  if (
    mode === 'TIMED' &&
    status === 'SCHEDULED' &&
    preBidOpen
  )
    return 'Pré-leilão';
  if (
    mode === 'TIMED' &&
    status === 'SCHEDULED' &&
    preBidClosed
  )
    return 'Em breve';
  if (
    mode === 'TIMED' &&
    status === 'SCHEDULED'
  )
    return 'Em breve';
  if (mode === 'LIVE' && status === 'SCHEDULED' && preBidClosed)
    return 'Em breve';
  if (mode === 'LIVE' && status === 'SCHEDULED' && preBidOpen)
    return 'Pré-leilão';
  if (mode === 'LIVE' && status === 'SCHEDULED') return 'Em breve';
  if (mode === 'LIVE' && ['RUNNING', 'OPEN'].includes(status)) return 'AO VIVO';
  if (
    mode === 'TIMED' &&
    ['RUNNING', 'OPEN'].includes(status)
  )
    return 'Shopping no ar';
  if (mode === 'SHOPPING' && ['OPEN', 'RUNNING'].includes(status))
    return 'Mercado no ar';
  return (
    (
      {
        RUNNING: 'Ao vivo',
        SCHEDULED: 'Agendado',
        PAUSED: 'Pausado',
        FINISHED: 'Encerrado',
        OPEN: 'Aberto',
        PRE_LAUNCH: 'Pré-leilão',
        COMING_SOON: 'Em breve',
        WAITING_OPENING: 'Aguardando abertura',
        CLOSED: 'Encerrado',
        CANCELLED: 'Cancelado',
        ENGINE_UNAVAILABLE: 'Aguardando publicação',
      } as Record<string, string>
    )[status] ?? status
  );
}

function formatCents(value: string | null | undefined, currency = 'BRL') {
  if (value == null) return '—';
  const padded = value.padStart(3, '0');
  const amount = `${padded.slice(0, -2)}.${padded.slice(-2)}`;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(
    Number(amount),
  );
}

type AuctionLiveExperienceProps = {
  externalAuctionId: string;
  initialSnapshot?: EngineAuctionSnapshot;
  title: string;
  description?: string | null;
  regulationText?: string | null;
  paymentText?: string | null;
  deliveryText?: string | null;
  image?: string;
  desktopBannerUrl?: string | null;
  mobileBannerUrl?: string | null;
  date?: string;
  time?: string;
  lotCount: number;
  status: string;
  mode?: 'SHOPPING' | 'LIVE' | 'TIMED';
  genealogyCatalogUrl?: string;
  catalogLots?: AuctionLot[];
  sandbox?: boolean;
};

export function AuctionLiveExperience({
  externalAuctionId,
  initialSnapshot,
  title,
  description,
  regulationText,
  paymentText,
  deliveryText,
  image = '/placeholder-image.svg',
  desktopBannerUrl,
  mobileBannerUrl,
  date,
  time,
  lotCount,
  status,
  mode: catalogMode,
  genealogyCatalogUrl,
  catalogLots = [],
  sandbox = false,
}: AuctionLiveExperienceProps) {
  const engineStatus = initialSnapshot?.auction.status;
  const displayedStatus = engineStatus ?? status ?? 'ENGINE_UNAVAILABLE';
  const mode = initialSnapshot?.auction.mode ?? catalogMode;
  const preBidOpen = initialSnapshot
    ? isPreBidOpen(initialSnapshot.auction)
    : false;
  const preBidClosed = initialSnapshot
    ? isPreBidClosed(initialSnapshot.auction)
    : false;
  const isLiveRunning = mode === 'LIVE' && displayedStatus === 'RUNNING';
  const isLotCatalog =
    mode !== 'LIVE' ||
    (catalogLots.length > 0 &&
      (!initialSnapshot
        ? status === 'PRE_LAUNCH'
        : hasConfiguredPreBid(initialSnapshot.auction) &&
          (preBidOpen || displayedStatus === 'SCHEDULED')));
  const visibleCatalogLots = catalogLots.filter((catalogLot) => {
    const engineLot = initialSnapshot?.lots.find(
      (lot) =>
        lot.externalId === catalogLot.id || lot.externalId === catalogLot.slug,
    );
    return engineLot
      ? ['OPEN', 'CLOSING', 'SOLD', 'UNSOLD', 'CLOSED'].includes(engineLot.status)
      : ['OPEN', 'SOLD', 'CLOSED'].includes(catalogLot.status);
  });
  const hasLiveLayout = mode === 'LIVE' && !isLotCatalog && Boolean(initialSnapshot);

  return (
    <div className={`w-full py-6 sm:py-8 ${hasLiveLayout ? 'bg-background' : 'bg-muted/35'}`}>
      <div className={`mx-auto w-full px-4 sm:px-6 ${hasLiveLayout ? 'max-w-[1440px] lg:px-7' : 'max-w-6xl'}`}>
        {hasLiveLayout ? (
          <header>
            <h1 className='text-xl font-bold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-2xl'>{title}</h1>
            {sandbox ? <p className='mt-2 text-sm text-muted-foreground'>Ambiente de teste</p> : null}
          </header>
        ) : <>
        <AuctionResponsiveBanner desktopUrl={desktopBannerUrl} mobileUrl={mobileBannerUrl} title={title} />
        <section className='grid w-full overflow-hidden rounded-xl border bg-card shadow-xs sm:grid-cols-[16rem_1fr]'>
          <div className={`relative aspect-[16/9] bg-muted sm:aspect-auto ${desktopBannerUrl || mobileBannerUrl ? 'hidden sm:block' : ''}`}>
            <Image
              src={image}
              alt={`Imagem do leilão ${title}`}
              fill
              className='object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10'
              sizes='(min-width: 640px) 288px, 100vw'
              priority
            />
          </div>
          <div className='flex flex-col justify-center p-5 sm:p-7'>
            <div className='flex flex-wrap items-center gap-2'>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isLiveRunning ? 'bg-emerald-50 text-emerald-700' : (mode === 'TIMED' || mode === 'SHOPPING') && ['SCHEDULED', 'RUNNING'].includes(displayedStatus) ? 'bg-sky-50 text-sky-700' : 'bg-muted text-muted-foreground'}`}>
                {sandbox ? <FlaskConical className='size-3.5' /> : null}
                {sandbox
                  ? `Ambiente de teste · ${statusLabel(displayedStatus, mode, preBidOpen, preBidClosed)}`
                  : statusLabel(displayedStatus, mode, preBidOpen, preBidClosed)}
              </span>
              <span className='rounded-full bg-muted px-2.5 py-1 text-xs font-semibold'>
                {lotCount} {lotCount === 1 ? 'lote' : 'lotes'}
              </span>
              {mode ? (
                <span className='rounded-full border px-2.5 py-1 text-xs font-semibold text-muted-foreground'>
                  {mode === 'LIVE' ? 'Ao vivo' : mode === 'SHOPPING' ? 'Mercado' : 'Shopping'}
                </span>
              ) : null}
            </div>
            <h1 className='mt-4 text-2xl font-bold tracking-tight sm:text-4xl'>
              {title}
            </h1>
            {description ? (
              <p className='mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground'>
                {description}
              </p>
            ) : null}
            <div className='mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground'>
              {date ? (
                <span className='inline-flex items-center gap-2'>
                  <CalendarDays className='size-4 text-secondary' />
                  {date}
                </span>
              ) : null}
              {time ? (
                <span className='inline-flex items-center gap-2'>
                  <Clock3 className='size-4 text-secondary' />
                  {time}
                </span>
              ) : null}
            </div>
            {catalogLots.length > 0 && genealogyCatalogUrl ? (
              <div className='mt-6 border-t pt-5'>
                <AuctionFullGenealogyButton catalogUrl={genealogyCatalogUrl} />
              </div>
            ) : null}
          </div>
        </section>
        </>}

        {isLotCatalog ? (
          <section className='mt-7' aria-labelledby='pre-bid-lots-title'>
            <div className='mb-4'>
              <h2
                id='pre-bid-lots-title'
                className='text-2xl font-bold tracking-tight'>
                Lotes do leilão
              </h2>
              <p className='mt-1 max-w-3xl text-sm leading-6 text-muted-foreground'>
                Consulte os lotes disponíveis, vendidos e não vendidos até o encerramento do leilão.
              </p>
            </div>
            {visibleCatalogLots.length > 0 ? (
              <div className='grid gap-3 min-[380px]:grid-cols-2 sm:gap-4 xl:grid-cols-3'>
                {visibleCatalogLots.map((catalogLot) => (
                  <AuctionLotCard
                    key={catalogLot.id}
                    lot={catalogLot}
                    engineLot={initialSnapshot?.lots.find(
                      (engineLot) =>
                        engineLot.externalId === catalogLot.id ||
                        engineLot.externalId === catalogLot.slug,
                    )}
                    currency={initialSnapshot?.auction.currency}
                    mode={mode}
                    preBidActive={preBidOpen}
                    preBidEndsAt={initialSnapshot?.auction.preBidEndsAt}
                    serverTime={initialSnapshot?.serverTime}
                  />
                ))}
              </div>
            ) : (
              <div className='rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground'>
                {preBidClosed
                  ? mode === 'LIVE'
                    ? 'A etapa de pré-leilão terminou. Aguarde o início do leilão ao vivo.'
                    : 'A etapa de pré-leilão terminou. Consulte os resultados dos lotes abaixo.'
                  : mode === 'SHOPPING'
                    ? 'Nenhum lote disponível para compra no momento.'
                    : 'Nenhum lote disponível para lances no momento.'}
              </div>
            )}
            {initialSnapshot ? (
              <ClosedLotsPreview
                lots={initialSnapshot.lots.filter((lot) => lot.status === 'CANCELLED')}
                currency={initialSnapshot.auction.currency}
              />
            ) : null}
          </section>
        ) : mode === 'LIVE' && initialSnapshot ? (
          <AuctionRuntimeBoard
            externalAuctionId={externalAuctionId}
            initialSnapshot={initialSnapshot}
            catalogLots={catalogLots}
            commercialTerms={{ regulationText, paymentText, deliveryText }}
            hideClosedAuction={!sandbox}
          />
        ) : (
          <div className='mt-7 rounded-2xl border bg-card p-6 text-sm text-muted-foreground'>
            A execução deste leilão ainda não está disponível no motor. O placar
            público será liberado somente quando a publicação no motor for
            concluída.
          </div>
        )}
        {hasLiveLayout ? (
          <details className='mt-8 border-t pt-3 [&_summary::-webkit-details-marker]:hidden'>
            <summary className='flex min-h-11 cursor-pointer items-center text-sm font-semibold outline-none focus-visible:outline-2 focus-visible:outline-primary'>Sobre o leilão</summary>
            <div className='space-y-4 pb-4 pt-3 text-sm leading-6 text-muted-foreground'>
              <AuctionResponsiveBanner desktopUrl={desktopBannerUrl} mobileUrl={mobileBannerUrl} title={title} />
              {description ? <p className='max-w-3xl whitespace-pre-wrap'>{description}</p> : null}
              <p className='flex flex-wrap gap-x-5 gap-y-2'>
                {date ? <span className='inline-flex items-center gap-2'><CalendarDays className='size-4' />{date}</span> : null}
                {time ? <span className='inline-flex items-center gap-2'><Clock3 className='size-4' />{time}</span> : null}
                <span>{lotCount} {lotCount === 1 ? 'lote' : 'lotes'}</span>
              </p>
              {catalogLots.length > 0 && genealogyCatalogUrl ? <AuctionFullGenealogyButton catalogUrl={genealogyCatalogUrl} /> : null}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function ClosedLotsPreview({
  lots,
  currency,
}: {
  lots: EngineAuctionSnapshot['lots'];
  currency: string;
}) {
  const closedLots = lots
    .filter((lot) => ['SOLD', 'UNSOLD', 'CANCELLED'].includes(lot.status))
    .sort((a, b) => b.lotNumber - a.lotNumber);
  if (closedLots.length === 0) return null;
  return (
    <section
      className='mt-10 border-t pt-8'
      aria-labelledby='closed-lots-title'>
      <div className='flex items-end justify-between gap-3'>
        <div>
          <p className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
            <History className='size-3.5' />
            Histórico oficial
          </p>
          <h2
            id='closed-lots-title'
            className='mt-1 text-2xl font-bold tracking-tight'>
            Lotes encerrados
          </h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            Resultado final, vencedor e valor registrado pelo motor.
          </p>
        </div>
        <span className='shrink-0 whitespace-nowrap rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground'>
          {closedLots.length} {closedLots.length === 1 ? 'lote' : 'lotes'}
        </span>
      </div>
      <div className='mt-4 grid gap-3 md:grid-cols-2'>
        {closedLots.map((lot) => {
          const sold = lot.status === 'SOLD';
          const winner =
            getReadableBidderName(lot.winnerName) ||
            getReadableBidderName(lot.currentBidderName) ||
            getReadableBidderName(lot.currentBidderAlias);
          return (
            <article key={lot.id} className='rounded-xl border bg-card p-4'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
                    Lote {String(lot.lotNumber).padStart(2, '0')}
                  </p>
                  <h3 className='mt-1 font-bold'>{lot.title}</h3>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sold ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                  {sold ? <Trophy className='size-3.5' /> : null}
                  {sold
                    ? 'Vendido'
                    : lot.status === 'CANCELLED'
                      ? 'Cancelado'
                      : 'Não vendido'}
                </span>
              </div>
              <div className='mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/45 p-3'>
                <div>
                  <p className='text-xs text-muted-foreground'>
                    {sold ? 'Valor final' : 'Resultado'}
                  </p>
                  <p className='mt-1 font-semibold tabular-nums'>
                    {sold
                      ? formatCents(
                          lot.winningAmountCents ?? lot.currentPriceCents,
                          currency,
                        )
                      : 'Sem venda'}
                  </p>
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>
                    {sold ? 'Vencedor' : 'Observação'}
                  </p>
                  <p
                    className='mt-1 truncate font-semibold'
                    title={winner ?? undefined}>
                    {sold
                      ? (winner ?? 'Participante identificado')
                      : 'Não houve vencedor'}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
