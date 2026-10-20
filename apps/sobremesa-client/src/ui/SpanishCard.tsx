import { spanishCard } from 'sobremesa-logic';
import { t } from '../i18n';
import '../styles/spanish-cards.css';
export const spanishSuitName = (index: number) =>
  [t('Oros'), t('Copas'), t('Espadas'), t('Bastos')][index];
export function spanishCardLabel(id: number) {
  const { rank } = spanishCard(id),
    suit = spanishSuitName(Math.floor(id / 10));
  return rank === 1
    ? t('As de {0}', { '0': suit })
    : rank === 10
      ? t('Sota de {0}', { '0': suit })
      : rank === 11
        ? t('Caballo de {0}', { '0': suit })
        : rank === 12
          ? t('Rey de {0}', { '0': suit })
          : t('{0} de {1}', { '0': rank, '1': suit });
}
export function SpanishCardFace({
  card,
  motion = false,
}: {
  card: number | null;
  motion?: boolean;
}) {
  if (card === null)
    return (
      <span className="spanish-card back" role="img" aria-label={t('Carta boca abajo')}>
        <span aria-hidden="true">◆</span>
      </span>
    );
  const { rank } = spanishCard(card),
    suit = Math.floor(card / 10);
  return (
    <span
      className={`spanish-card suit-${suit}`}
      role="img"
      aria-label={spanishCardLabel(card)}
      data-motion-id={motion ? `spanish-${card}` : undefined}
    >
      <b aria-hidden="true">{rank}</b>
      <svg viewBox="0 0 40 48" aria-hidden="true">
        {suit === 0 ? (
          <>
            <circle cx="20" cy="24" r="14" />
            <circle cx="20" cy="24" r="9" fill="none" />
            <path
              d="M20 7v6m0 22v6M3 24h6m22 0h6M8 12l4 4m16 16 4 4M8 36l4-4m16-16 4-4"
              fill="none"
            />
          </>
        ) : suit === 1 ? (
          <>
            <path d="M8 10h24v8c0 8-5 13-12 13S8 26 8 18Zm12 21v9m-9 1h18" />
            <path d="M8 12H3v6c0 6 4 8 8 8m21-14h5v6c0 6-4 8-8 8" fill="none" />
          </>
        ) : suit === 2 ? (
          <>
            <path d="M29 3 18 31l-7-4L25 3Z" />
            <path d="m9 23 15 8m-10-3-5 12m-3-1 7 3" fill="none" />
          </>
        ) : (
          <>
            <path d="m14 42 3-31 6-7 4 8-7 32Z" />
            <path d="m17 15-9-4m15 12 10-7m-17 13-9-2m15 8 9-5" fill="none" />
          </>
        )}
      </svg>
      <small>
        {rank === 10
          ? t('Sota')
          : rank === 11
            ? t('Caballo')
            : rank === 12
              ? t('Rey')
              : spanishSuitName(suit)}
      </small>
    </span>
  );
}
