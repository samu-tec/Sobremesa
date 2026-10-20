import type { GamePublicState, RoomInfo } from 'sobremesa-logic';
import { t, useLocale, quantity, gameText } from '../i18n';
export function useGameResults(
  room: RoomInfo | null,
  state: unknown,
): { winnerIds?: string[]; resultNote?: string; resultRows?: { label: string; value: string }[] } {
  const { locale } = useLocale();
  if (!room || !state) return {};
  const s = state as GamePublicState,
    name = (id: string) => room.players.find((p) => p.id === id)?.name || t('otro jugador');
  if ('revealedImpostor' in s) {
    return {
      winnerIds: s.winnerIds,
      resultNote: [
        s.outcome === 'caught'
          ? t('Los inocentes descubrieron al impostor.')
          : s.outcome === 'guessed'
            ? t('El impostor adivinó la palabra.')
            : t('El impostor escapó.'),
        s.revealedWord ? t('Palabra secreta: {0}', { '0': s.revealedWord[locale] }) : '',
        s.revealedImpostor ? t('Impostor: {0}', { '0': name(s.revealedImpostor) }) : '',
        s.guess ? t('Respuesta del impostor: {0}', { '0': s.guess }) : '',
      ]
        .filter(Boolean)
        .join(' '),
      resultRows: s.physicalVoting
        ? Object.entries(s.physicalCounts ?? {}).map(([id, count]) => ({
            label: name(id),
            value: t('{0} votos', { '0': count }),
          }))
        : Object.entries(s.votes).map(([voter, target]) => ({
            label: name(voter),
            value: `→ ${name(target)}`,
          })),
    };
  }
  if ('winnerIds' in s)
    return {
      winnerIds: s.winnerIds,
      resultNote: gameText(s.message),
      resultRows: s.players.map((p) => ({
        label: name(p.id),
        value:
          room.gameType === 'poker'
            ? t('{0} fichas de póker', { '0': p.score })
            : quantity(p.score, 'puntos'),
      })),
    };
  if ('wallCount' in s)
    return {
      resultNote: gameText(s.message),
      resultRows: s.players.map((p) => ({ label: name(p.id), value: quantity(p.score, 'puntos') })),
    };
  if ('totals' in s)
    return {
      resultRows: s.players.map((p) => ({
        label: name(p.id),
        value: quantity(s.totals[p.id], 'puntos'),
      })),
    };
  if ('poolCount' in s)
    return {
      resultRows: s.players.map((p) => ({
        label: name(p.id),
        value: quantity(p.score, 'puntos'),
      })),
    };
  if ('roundWinner' in s)
    return {
      resultRows: s.players.map((p) => ({
        label: name(p.id),
        value: quantity(p.score, 'puntos'),
      })),
    };
  if ('pits' in s)
    return {
      resultRows: s.players.map((p, i) => ({
        label: name(p.id),
        value: quantity(s.pits[i * 7 + 6], 'semillas'),
      })),
    };
  if ('multiplier' in s)
    return {
      resultNote:
        s.multiplier === 3
          ? t('Victoria backgammon ×3')
          : s.multiplier === 2
            ? t('Victoria gammon ×2')
            : t('Victoria simple'),
      resultRows: s.players.map((p, i) => ({
        label: name(p.id),
        value: t('{0}/15 fuera · {1} barra', { '0': s.off[i], '1': s.bar[i] }),
      })),
    };
  return {};
}
