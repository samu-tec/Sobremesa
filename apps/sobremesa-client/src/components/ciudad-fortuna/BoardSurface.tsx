import type { CSSProperties, ReactNode } from 'react';
import {
  ArrowRight,
  Building2,
  CircleHelp,
  Home,
  Landmark,
  LockKeyhole,
  TrainFront,
  TreePine,
  Users,
  Zap,
} from 'lucide-react';
import {
  BOARD_TILES,
  type BoardTile,
  type CiudadFortunaPublicState,
  type PropertyGroup,
} from 'sobremesa-logic';
import { t, formatMoney } from '../../i18n';
import { PLAYER_COLORS, PlayerPiece } from './PlayerPiece';
import { tileEdge, tilePosition, piecePosition } from './boardGeometry';

export const GROUP_COLORS: Record<PropertyGroup, string> = {
  brown: '#ad7862',
  light_blue: '#77b9c6',
  pink: '#c17daa',
  orange: '#dfa363',
  red: '#d77875',
  yellow: '#d9bd5c',
  green: '#639d80',
  dark_blue: '#667fb8',
  station: '#778a88',
  utility: '#929084',
};
function TileIcon({ tile }: { tile: BoardTile }) {
  const Icon =
    tile.type === 'station'
      ? TrainFront
      : tile.type === 'utility'
        ? Zap
        : tile.type === 'go'
          ? ArrowRight
          : tile.type === 'jail' || tile.type === 'go_to_jail'
            ? LockKeyhole
            : tile.type === 'free_parking'
              ? TreePine
              : tile.type === 'tax'
                ? Landmark
                : tile.type === 'community_chest'
                  ? Users
                  : tile.type === 'chance'
                    ? CircleHelp
                    : null;
  return Icon && <Icon aria-hidden="true" />;
}
function tileLabel(tile: BoardTile) {
  if (tile.type === 'community_chest') return t('Comunidad');
  if (tile.type === 'tax') return tile.index === 4 ? t('Impuesto') : t('Tasa de Lujo');
  if (tile.type === 'station')
    return t(tile.name)
      .replace(/^Estación (?:del? )?/, '')
      .replace(/ Station$/, '');
  if (tile.type === 'utility') return tile.index === 12 ? t('Electricidad') : t('Agua');
  if (tile.type === 'go') return t('Salida');
  if (tile.type === 'jail') return t('Cárcel / visita');
  if (tile.type === 'free_parking') return t('Descanso');
  return t(tile.name);
}
export function BoardSurface({
  state,
  positionOf,
  moving,
  onInspect,
  children,
}: {
  state: CiudadFortunaPublicState;
  positionOf: (player: CiudadFortunaPublicState['players'][number]) => number;
  moving: boolean;
  onInspect: (tile: BoardTile) => void;
  children: ReactNode;
}) {
  const current = state.players.find((p) => p.id === state.currentTurnPlayerId);
  return (
    <div className="city-board" role="group" aria-label={t('Tablero de Ciudad Fortuna')}>
      <div className="city-center">{children}</div>
      {BOARD_TILES.map((tile) => {
        const prop = state.properties[tile.index];
        const ownerIndex = state.players.findIndex((p) => p.id === prop?.ownerId);
        const occupants = state.players.filter((p) => !p.isBankrupt && p.position === tile.index);
        const description = [
          t(tile.name),
          tile.price ? formatMoney(tile.price) : '',
          ownerIndex >= 0 ? t('Propiedad de {0}', { '0': state.players[ownerIndex].name }) : '',
          prop?.isMortgaged ? t('Hipotecada') : '',
          occupants.length ? t('Aquí: {0}', { '0': occupants.map((p) => p.name).join(', ') }) : '',
          t('Ver detalles'),
        ]
          .filter(Boolean)
          .join('. ');
        return (
          <button
            key={tile.index}
            className={`city-tile edge-${tileEdge(tile.index)} ${tile.index % 10 === 0 ? 'corner-tile' : ''} ${prop?.isMortgaged ? 'mortgaged-tile' : ''} ${current && positionOf(current) === tile.index ? 'current-tile' : ''}`}
            style={
              {
                ...tilePosition(tile.index),
                '--group-color': tile.group ? GROUP_COLORS[tile.group] : '#dce5d3',
                '--owner-color': ownerIndex >= 0 ? PLAYER_COLORS[ownerIndex] : 'transparent',
              } as CSSProperties
            }
            onClick={() => onInspect(tile)}
            aria-label={description}
            title={description}
          >
            <span className="tile-stripe" aria-hidden="true">
              {prop?.houses > 0 && (
                <span className="tile-houses">
                  {prop.houses === 5 ? (
                    <Building2 />
                  ) : (
                    Array.from({ length: prop.houses }, (_, i) => <Home key={i} />)
                  )}
                </span>
              )}
            </span>
            <span className="tile-body">
              <TileIcon tile={tile} />
              <span className="tile-name">{tileLabel(tile)}</span>
              {tile.price && <small className="tile-price">{formatMoney(tile.price)}</small>}
              {tile.taxAmount && (
                <small className="tile-price">−{formatMoney(tile.taxAmount)}</small>
              )}
              {prop?.isMortgaged && (
                <LockKeyhole className="tile-mortgaged" aria-label={t('Hipotecada')} />
              )}
            </span>
            <span className="tile-lane" aria-hidden="true" />
            {ownerIndex >= 0 && <span className="tile-owner" aria-hidden="true" />}
          </button>
        );
      })}
      <div className={`city-token-layer ${moving ? 'tokens-moving' : ''}`} aria-hidden="true">
        {state.players.map(
          (player, seat) =>
            !player.isBankrupt && (
              <span
                key={player.id}
                className="city-token"
                data-player={player.id}
                data-position={positionOf(player)}
                style={piecePosition(positionOf(player), seat)}
              >
                <PlayerPiece index={seat} active={player.id === state.currentTurnPlayerId} />
              </span>
            ),
        )}
      </div>
    </div>
  );
}
