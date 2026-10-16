import { t, gameText, formatMoney } from '../i18n';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  BOARD_TILES,
  PROPERTY_GROUPS,
  type BoardTile,
  type MonopolyAction,
  type MonopolyPublicState,
  type PropertyGroup,
} from 'sobremesa-logic';
import {
  ArrowRight,
  Building2,
  Check,
  Coins,
  Dices,
  Handshake,
  History,
  Home,
  Landmark,
  LockKeyhole,
  TrainFront,
  TreePine,
  Zap,
  CircleHelp,
  Gavel,
  Wallet,
  ShieldAlert,
  Info,
  ChevronRight,
  ZoomIn,
  Cat,
  Rocket,
  Leaf,
  Crown,
  Sailboat,
  Gem,
} from 'lucide-react';
import { DiceFace, type BoardProps } from '../ui/GameLayout';
import { Modal } from '../ui/Modal';
const GROUP_COLORS: Record<PropertyGroup, string> = {
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
const PLAYER_COLORS = ['#ad452b', '#315e9c', '#37713b', '#80519b', '#92690e', '#167572'];
const PIECES = [Cat, Rocket, Leaf, Crown, Sailboat, Gem];
function Piece({ index, active = false }: { index: number; active?: boolean }) {
  const Icon = PIECES[index % PIECES.length];
  return (
    <span
      className={`player-piece ${active ? 'piece-active' : ''}`}
      style={{ '--piece-color': PLAYER_COLORS[index % 6] } as CSSProperties}
    >
      <Icon size={18} strokeWidth={2.5} />
    </span>
  );
}
const money = formatMoney;
function position(index: number) {
  if (index <= 10) return { gridRow: 1, gridColumn: index + 1 };
  if (index <= 20) return { gridRow: index - 9, gridColumn: 11 };
  if (index <= 30) return { gridRow: 11, gridColumn: 31 - index };
  return { gridRow: 41 - index, gridColumn: 1 };
}
const TileIcon = ({ tile }: { tile: BoardTile }) =>
  tile.type === 'station' ? (
    <TrainFront />
  ) : tile.type === 'utility' ? (
    <Zap />
  ) : tile.type === 'go' ? (
    <ArrowRight />
  ) : tile.type === 'jail' || tile.type === 'go_to_jail' ? (
    <LockKeyhole />
  ) : tile.type === 'free_parking' ? (
    <TreePine />
  ) : tile.type === 'tax' ? (
    <Landmark />
  ) : tile.type === 'chance' || tile.type === 'community_chest' ? (
    <CircleHelp />
  ) : null;
export function MonopolyBoard({
  state,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<MonopolyPublicState, MonopolyAction>) {
  const [compact, setCompact] = useState(() => matchMedia('(max-width: 900px)').matches);
  useEffect(() => {
    const query = matchMedia('(max-width: 900px)');
    const change = () => setCompact(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  const [tab, setTab] = useState<'properties' | 'trade' | 'history'>('properties'),
    [inspected, setInspected] = useState<BoardTile | null>(null),
    [bankruptcy, setBankruptcy] = useState(false),
    [managementOpen, setManagementOpen] = useState(false),
    [zoomed, setZoomed] = useState(false);
  const [target, setTarget] = useState(''),
    [offeredCash, setOfferedCash] = useState(0),
    [requestedCash, setRequestedCash] = useState(0),
    [offered, setOffered] = useState<number[]>([]),
    [requested, setRequested] = useState<number[]>([]),
    [bid, setBid] = useState(10);
  const [rolling, setRolling] = useState(false);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const me = state.players.find((p) => p.id === myPlayerId),
    current = state.players.find((p) => p.id === state.currentTurnPlayerId),
    myTurn = state.currentTurnPlayerId === myPlayerId && !state.winner && !me?.isBankrupt && !busy;
  const own = (id: string) => BOARD_TILES.filter((t) => state.properties[t.index]?.ownerId === id),
    properties = own(myPlayerId),
    partner = state.players.find((p) => p.id === target);
  const debt = myTurn && (me?.cash ?? 0) < 0,
    tile = state.pendingTileAction ? BOARD_TILES[state.pendingTileAction.tileIndex] : null,
    auction = state.auction;
  const incoming = state.activeTrade?.toPlayerId === myPlayerId ? state.activeTrade : null;
  const canTrade =
    !state.winner && !state.auction && !state.activeTrade && !me?.isBankrupt && !busy;
  useEffect(
    () => setBid((state.auction?.currentBid ?? 0) + 10),
    [state.auction?.currentBid, state.auction?.tileIndex],
  );
  useEffect(() => () => clearTimeout(rollTimer.current), []);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setManagementOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const toggle = (idx: number, offer: boolean) => {
    const values = offer ? offered : requested;
    const next = values.includes(idx) ? values.filter((i) => i !== idx) : [...values, idx];
    if (offer) setOffered(next);
    else setRequested(next);
  };
  const trade = () => {
    if (!target) return;
    onAction({
      type: 'PROPOSE_TRADE',
      trade: {
        fromPlayerId: myPlayerId,
        toPlayerId: target,
        offeredCash,
        requestedCash,
        offeredPropertyIndices: offered,
        requestedPropertyIndices: requested,
      },
    });
    setOffered([]);
    setRequested([]);
    setOfferedCash(0);
    setRequestedCash(0);
  };
  const tradeable = (tile: BoardTile) =>
    state.properties[tile.index]?.houses === 0 &&
    (!tile.group || !PROPERTY_GROUPS[tile.group].some((i) => state.properties[i]?.houses > 0));
  const actions = (
    <section className="panel city-action-panel" aria-live="polite">
      <div className="city-action-info">
        <span className="city-action-icon">
          {auction ? <Gavel size={22} /> : debt ? <ShieldAlert size={22} /> : <Dices size={22} />}
        </span>
        <div>
          <strong>
            {me?.isBankrupt
              ? t('Sigues en la mesa como espectador')
              : auction
                ? t('La propiedad sale a subasta')
                : debt
                  ? t('Toca equilibrar las cuentas')
                  : myTurn
                    ? state.turnPhase === 'tile_action'
                      ? t('Una nueva oportunidad')
                      : state.turnPhase === 'end_turn'
                        ? t('Tu siguiente movimiento')
                        : t('La suerte está en tus manos')
                    : t('{0} está jugando', { '0': current?.name || t('Tu rival') })}
          </strong>
          <p>
            {auction
              ? auction.highestBidderId
                ? t('{0} · Puja de {1}: {2}', {
                    '0': t(BOARD_TILES[auction.tileIndex].name),
                    '1': state.players.find((p) => p.id === auction.highestBidderId)?.name || '',
                    '2': money(auction.currentBid),
                  })
                : t('{0} · Sin ofertas; mínimo {1}', {
                    '0': t(BOARD_TILES[auction.tileIndex].name),
                    '1': money(10),
                  })
              : debt
                ? t('Te faltan {0}. Vende edificios o hipoteca propiedades.', {
                    '0': money(Math.abs(me?.cash ?? 0)),
                  })
                : myTurn
                  ? state.turnPhase === 'tile_action' && tile
                    ? t('{0} puede ser tuya por {1}.', {
                        '0': t(tile.name),
                        '1': money(tile.price ?? 0),
                      })
                    : state.turnPhase === 'end_turn'
                      ? t('Gestiona tus propiedades o da paso al siguiente jugador.')
                      : me?.inJail
                        ? t('Estás en la cárcel: paga, usa una carta o intenta sacar dobles.')
                        : state.isDouble
                          ? t('¡Dobles! Te toca tirar de nuevo.')
                          : t('Tira dos dados para recorrer la ciudad.')
                  : t('Puedes revisar tus propiedades y preparar un intercambio.')}
          </p>
        </div>
      </div>
      <div className="city-action-buttons">
        {!auction && !debt && myTurn && state.turnPhase === 'roll' && (
          <>
            {me?.inJail && (
              <>
                <button
                  className="button secondary small"
                  disabled={(me?.cash ?? 0) < state.customRules.jailFine}
                  onClick={() => onAction({ type: 'PAY_JAIL_FINE' })}
                >
                  {t('Pagar')} {money(state.customRules.jailFine)}
                </button>
                {!!me.getOutOfJailFreeCards && (
                  <button
                    className="button secondary small"
                    onClick={() => onAction({ type: 'USE_JAIL_CARD' })}
                  >
                    {t('Usar carta')}{' '}
                  </button>
                )}
              </>
            )}
            <button
              className="button primary"
              disabled={rolling}
              onClick={() => {
                setRolling(true);
                clearTimeout(rollTimer.current);
                rollTimer.current = setTimeout(() => setRolling(false), 900);
                onAction({ type: 'ROLL_DICE' });
              }}
            >
              <Dices size={19} /> {t('Tirar dados')}{' '}
            </button>
          </>
        )}
        {!auction && !debt && myTurn && state.turnPhase === 'tile_action' && tile && (
          <>
            <button
              className="button primary"
              disabled={(me?.cash ?? 0) < (tile.price ?? 0)}
              onClick={() => onAction({ type: 'BUY_PROPERTY' })}
            >
              <Home size={18} /> {t('Comprar ·')} {money(tile.price ?? 0)}
            </button>
            <button
              className="button secondary"
              onClick={() => onAction({ type: 'PASS_PROPERTY' })}
            >
              {state.customRules.auctionEnabled ? t('Subastar') : t('No comprar')}
            </button>
          </>
        )}
        {!auction && !debt && myTurn && state.turnPhase === 'end_turn' && (
          <button className="button primary" onClick={() => onAction({ type: 'END_TURN' })}>
            {t('Terminar turno')} <ArrowRight size={18} />
          </button>
        )}
        {debt && (
          <>
            <button
              className="button secondary"
              onClick={() => {
                setTab('properties');
                setManagementOpen(true);
              }}
            >
              {t('Gestionar bienes')}{' '}
            </button>
            <button className="text-button danger-text" onClick={() => setBankruptcy(true)}>
              {t('Bancarrota')}{' '}
            </button>
          </>
        )}
        {auction &&
          (!me?.isBankrupt &&
          !auction.passedPlayerIds.includes(myPlayerId) &&
          auction.highestBidderId !== myPlayerId ? (
            <form
              className="auction-form"
              onSubmit={(e) => {
                e.preventDefault();
                onAction({ type: 'BID', amount: bid });
              }}
            >
              <label className="sr-only" htmlFor="auction-bid">
                {t('Tu puja en euros')}{' '}
              </label>
              <input
                className="field"
                id="auction-bid"
                type="number"
                step={1}
                min={auction.currentBid + 10}
                max={me?.cash ?? 0}
                value={bid}
                onChange={(e) => setBid(Number(e.target.value))}
              />
              <button
                className="button primary"
                disabled={
                  busy ||
                  !Number.isSafeInteger(bid) ||
                  bid < auction.currentBid + 10 ||
                  bid > (me?.cash ?? 0)
                }
              >
                {t('Pujar')}{' '}
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => onAction({ type: 'PASS_AUCTION' })}
              >
                {t('Pasar')}{' '}
              </button>
            </form>
          ) : auction.highestBidderId === myPlayerId ? (
            <span className="muted">
              {t('Vas ganando la subasta. Si te superan, podrás volver a pujar.')}
            </span>
          ) : auction.passedPlayerIds.includes(myPlayerId) ? (
            <span className="muted">{t('Te has retirado de esta subasta.')}</span>
          ) : null)}
      </div>
    </section>
  );
  const management = (
    <>
      <section className="panel city-players">
        <div className="section-row">
          <h2>{t('Los vecinos')}</h2>
          <span className="pill">
            {state.players.filter((p) => !p.isBankrupt).length} {t('en juego')}{' '}
          </span>
        </div>
        {state.players.map((p, i) => (
          <div
            className={`city-player ${p.id === state.currentTurnPlayerId ? 'active' : ''} ${p.isBankrupt ? 'bankrupt-player' : ''}`}
            key={p.id}
          >
            <Piece index={i} active={p.id === state.currentTurnPlayerId} />
            <div>
              <strong>
                {p.name}
                {p.id === myPlayerId ? t(' (tú)') : ''}
              </strong>
              <small>
                {p.isBankrupt
                  ? t('En bancarrota')
                  : p.inJail
                    ? t('En la cárcel')
                    : t(own(p.id).length === 1 ? '{0} propiedad' : '{0} propiedades', {
                        '0': own(p.id).length,
                      })}
              </small>
            </div>
            <strong>{money(p.cash)}</strong>
          </div>
        ))}
      </section>
      <section className="panel city-management" id="city-management">
        <div className="section-row">
          <h2>{t('Tu estrategia')}</h2>
          <Wallet size={20} />
        </div>
        <div className="management-tabs" aria-label={t('Gestión de Ciudad Fortuna')}>
          {(
            [
              ['properties', Home, t('Propiedades')],
              ['trade', Handshake, t('Tratos')],
              ['history', History, t('Actividad')],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              className={tab === id ? 'active' : ''}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              <Icon size={15} />
              {t(label)}
            </button>
          ))}
        </div>
        {tab === 'properties' && (
          <div className="portfolio">
            <div className="section-row">
              <span className="muted">{t('Mi cartera')}</span>
              <strong>
                {properties.length} {t('propiedades')}
              </strong>
            </div>
            {!properties.length && (
              <div className="portfolio-empty">
                <Building2 size={32} />
                <h3>{t('Tu ciudad empieza aquí')}</h3>
                <p>{t('Compra tu primera propiedad y pon el dinero a trabajar.')}</p>
              </div>
            )}
            {properties.map((tile) => {
              const prop = state.properties[tile.index],
                siblings = tile.group ? PROPERTY_GROUPS[tile.group] : [tile.index];
              const complete =
                tile.type === 'property' &&
                siblings.every(
                  (i) =>
                    state.properties[i]?.ownerId === myPlayerId &&
                    !state.properties[i]?.isMortgaged,
                );
              const build =
                myTurn &&
                !auction &&
                complete &&
                prop.houses < 5 &&
                (!state.customRules.evenBuilding ||
                  prop.houses === Math.min(...siblings.map((i) => state.properties[i].houses))) &&
                (me?.cash ?? 0) >= (tile.houseCost ?? Infinity);
              const sell =
                myTurn &&
                !auction &&
                prop.houses > 0 &&
                (!state.customRules.evenBuilding ||
                  prop.houses === Math.max(...siblings.map((i) => state.properties[i].houses)));
              const mortgage =
                myTurn &&
                !auction &&
                !prop.isMortgaged &&
                !siblings.some((i) => state.properties[i].houses > 0);
              const recover = Math.round((tile.mortgageValue ?? 0) * 1.1);
              return (
                <div className="property-item" key={tile.index}>
                  <div>
                    <i style={{ background: GROUP_COLORS[tile.group!] }} />
                    <div>
                      <strong>{t(tile.name)}</strong>
                      <small>
                        {prop.isMortgaged
                          ? t('Hipotecada')
                          : prop.houses === 5
                            ? t('Hotel')
                            : prop.houses
                              ? t(prop.houses === 1 ? '{0} casa' : '{0} casas', {
                                  '0': prop.houses,
                                })
                              : complete
                                ? t('Grupo completo')
                                : t('Sin edificios')}
                      </small>
                    </div>
                    <button
                      className="icon-button"
                      onClick={() => setInspected(tile)}
                      aria-label={t('Ver {0}', { '0': t(tile.name) })}
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                  <div className="property-actions">
                    {tile.houseCost && prop.houses < 5 && (
                      <button
                        disabled={!build}
                        onClick={() => onAction({ type: 'BUILD_HOUSE', tileIndex: tile.index })}
                      >
                        {t('Construir ·')} {tile.houseCost} €
                      </button>
                    )}
                    {prop.houses > 0 && (
                      <button
                        disabled={!sell}
                        onClick={() => onAction({ type: 'SELL_HOUSE', tileIndex: tile.index })}
                      >
                        {t('Vender edificio')}{' '}
                      </button>
                    )}
                    <button
                      disabled={
                        prop.isMortgaged
                          ? !myTurn || !!auction || (me?.cash ?? 0) < recover
                          : !mortgage
                      }
                      onClick={() =>
                        onAction({
                          type: prop.isMortgaged ? 'UNMORTGAGE_PROPERTY' : 'MORTGAGE_PROPERTY',
                          tileIndex: tile.index,
                        })
                      }
                    >
                      {prop.isMortgaged
                        ? t('Recuperar · {0} €', { '0': recover })
                        : t('Hipotecar · {0} €', { '0': tile.mortgageValue })}
                    </button>
                  </div>
                </div>
              );
            })}
            {!myTurn && properties.length > 0 && (
              <p className="form-hint">{t('Puedes construir, vender e hipotecar en tu turno.')}</p>
            )}
          </div>
        )}
        {tab === 'history' && (
          <div className="city-log">
            {state.logs.map((log, i) => (
              <p key={i}>{gameText(log)}</p>
            ))}
          </div>
        )}
        {tab === 'trade' && (
          <div className="trade-form">
            <p className="form-hint">
              {t(
                'Intercambia efectivo y propiedades sin edificios. Los tratos requieren la aprobación del otro jugador.',
              )}{' '}
            </p>
            {state.activeTrade && (
              <div className="notice">
                <span>{t('Hay una propuesta pendiente.')}</span>
                {[state.activeTrade.fromPlayerId, state.activeTrade.toPlayerId].includes(
                  myPlayerId,
                ) && (
                  <button
                    className="text-button"
                    onClick={() => onAction({ type: 'CANCEL_TRADE' })}
                  >
                    {t('Cancelar propuesta')}{' '}
                  </button>
                )}
              </div>
            )}
            <label className="field-label" htmlFor="trade-partner">
              {t('Negociar con')}{' '}
            </label>
            <select
              className="field"
              id="trade-partner"
              value={target}
              disabled={!canTrade}
              onChange={(e) => {
                setTarget(e.target.value);
                setRequested([]);
                setRequestedCash(0);
              }}
            >
              <option value="">{t('Elige a un jugador')}</option>
              {state.players
                .filter((p) => p.id !== myPlayerId && !p.isBankrupt)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            {partner && (
              <>
                <div className="trade-columns">
                  <div>
                    <label className="field-label" htmlFor="offered-cash">
                      {t('Ofreces (€)')}{' '}
                    </label>
                    <input
                      className="field"
                      id="offered-cash"
                      type="number"
                      min={0}
                      max={me?.cash ?? 0}
                      step={1}
                      disabled={!canTrade}
                      value={offeredCash}
                      onChange={(e) =>
                        setOfferedCash(Math.max(0, Math.floor(Number(e.target.value))))
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="requested-cash">
                      {t('Pides (€)')}{' '}
                    </label>
                    <input
                      className="field"
                      id="requested-cash"
                      type="number"
                      min={0}
                      max={partner.cash}
                      step={1}
                      disabled={!canTrade}
                      value={requestedCash}
                      onChange={(e) =>
                        setRequestedCash(Math.max(0, Math.floor(Number(e.target.value))))
                      }
                    />
                  </div>
                </div>
                <div className="trade-columns">
                  <fieldset disabled={!canTrade}>
                    <legend>{t('Tus propiedades')}</legend>
                    {properties.filter(tradeable).map((t) => (
                      <label className="trade-checkbox" key={t.index}>
                        <input
                          type="checkbox"
                          checked={offered.includes(t.index)}
                          onChange={() => toggle(t.index, true)}
                        />
                        {t.name}
                      </label>
                    ))}
                    {!properties.filter(tradeable).length && (
                      <small className="muted">{t('No hay disponibles.')}</small>
                    )}
                  </fieldset>
                  <fieldset disabled={!canTrade}>
                    <legend>{t('Sus propiedades')}</legend>
                    {own(partner.id)
                      .filter(tradeable)
                      .map((t) => (
                        <label className="trade-checkbox" key={t.index}>
                          <input
                            type="checkbox"
                            checked={requested.includes(t.index)}
                            onChange={() => toggle(t.index, false)}
                          />
                          {t.name}
                        </label>
                      ))}
                    {!own(partner.id).filter(tradeable).length && (
                      <small className="muted">{t('No hay disponibles.')}</small>
                    )}
                  </fieldset>
                </div>
                <button
                  className="button primary full"
                  disabled={
                    !canTrade ||
                    (!offeredCash && !requestedCash && !offered.length && !requested.length) ||
                    offeredCash > (me?.cash ?? 0) ||
                    requestedCash > partner.cash
                  }
                  onClick={trade}
                >
                  <Handshake size={17} /> {t('Proponer trato')}{' '}
                </button>
              </>
            )}
          </div>
        )}
      </section>
    </>
  );
  return (
    <div className="city-layout">
      <div className="city-main">
        <section className={`panel city-board-panel ${zoomed ? 'board-zoomed' : ''}`}>
          <div className="city-board-scroll">
            <div className="city-board" role="group" aria-label={t('Tablero de Ciudad Fortuna')}>
              <div className="city-center">
                <span className="city-center-eyebrow">
                  {state.customRules.maxRounds == null
                    ? `${t('RONDA')} ${state.round} · ${t('Sin límite')}`
                    : `${t('RONDA')} ${state.round} ${t('DE')} ${state.customRules.maxRounds}`}
                </span>
                <div className="city-event-banner" aria-live="polite">
                  <span>{t('LO ÚLTIMO EN LA CIUDAD')}</span>
                  <p>{gameText(state.logs[0])}</p>
                </div>
                <Building2 className="city-center-building" size={38} />
                <h2>
                  {t('CIUDAD')} <br />
                  <span>{t('FORTUNA')}</span>
                </h2>
                <div className="city-mobile-players">
                  {state.players.map((p, i) => (
                    <button
                      key={p.id}
                      className={p.id === state.currentTurnPlayerId ? 'active' : ''}
                      onClick={() => setInspected(BOARD_TILES[p.position])}
                      aria-label={t('Ver la posición de {0}', { '0': p.name })}
                    >
                      <Piece index={i} />
                      <span>
                        <strong>{p.name}</strong>
                        <small>
                          {p.isBankrupt ? t('En bancarrota') : `${money(p.cash)} · #${p.position}`}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
                <div className={`city-dice ${rolling ? 'dice-rolling' : ''}`}>
                  <DiceFace value={state.lastDice[0]} />
                  <DiceFace value={state.lastDice[1]} />
                </div>
                <p>
                  {state.hasRolled
                    ? t('{0} puntos{1}', {
                        '0': state.lastDiceSum,
                        '1': state.isDouble ? ' · Dobles' : '',
                      })
                    : t('Cada tirada, una oportunidad.')}
                </p>
                {state.customRules.freeParkingPool && (
                  <span className="city-pot">
                    <Coins size={14} /> {t('Bote:')} {money(state.freeParkingPool)}
                  </span>
                )}
                {!compact && actions}
                <span className="city-center-flower">✳</span>
              </div>
              {BOARD_TILES.map((tile) => {
                const prop = state.properties[tile.index],
                  ownerIndex = state.players.findIndex((p) => p.id === prop?.ownerId);
                return (
                  <button
                    className={`city-tile ${tile.index % 10 === 0 ? 'corner-tile' : ''} ${prop?.isMortgaged ? 'mortgaged-tile' : ''} ${current?.position === tile.index ? 'current-tile' : ''}`}
                    key={tile.index}
                    style={
                      {
                        ...position(tile.index),
                        ...(ownerIndex >= 0
                          ? {
                              '--owner-color': PLAYER_COLORS[ownerIndex % 6],
                              background: `${PLAYER_COLORS[ownerIndex % 6]}20`,
                              boxShadow: `inset 0 0 0 2px ${PLAYER_COLORS[ownerIndex % 6]}`,
                            }
                          : {}),
                      } as CSSProperties
                    }
                    onClick={() => setInspected(tile)}
                    aria-label={t('{0}{1}. Ver detalles.', {
                      '0': t(tile.name),
                      '1': prop?.ownerId
                        ? t(', propiedad de {0}', { '0': state.players[ownerIndex]?.name })
                        : '',
                    })}
                  >
                    {tile.group && (
                      <span
                        className="tile-stripe"
                        style={{ background: GROUP_COLORS[tile.group] }}
                      />
                    )}
                    <TileIcon tile={tile} />
                    <span className="tile-name">{t(tile.name)}</span>
                    <span className="tile-number">{tile.index}</span>
                    {tile.price && <small className="tile-price">{tile.price} €</small>}
                    {prop?.houses > 0 && (
                      <span className="tile-houses">
                        {prop.houses === 5 ? '★' : `${'⌂'.repeat(prop.houses)}`}
                      </span>
                    )}
                    {ownerIndex >= 0 && (
                      <span
                        className="tile-owner"
                        style={{ background: PLAYER_COLORS[ownerIndex % 6] }}
                        title={state.players[ownerIndex].name}
                      />
                    )}
                    {prop?.isMortgaged && (
                      <span className="tile-mortgaged" title={t('Hipotecada')}>
                        <LockKeyhole size={10} />
                      </span>
                    )}
                    <span className="tile-tokens">
                      {state.players.map((p, i) =>
                        p.position === tile.index && !p.isBankrupt ? (
                          <span key={p.id} title={p.name} aria-label={p.name}>
                            <Piece index={i} active={p.id === state.currentTurnPlayerId} />
                          </span>
                        ) : null,
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="board-caption">
            <Info size={14} />{' '}
            {t(
              'Pulsa cualquier casilla para ver su precio y alquiler. Las fichas indican dónde está cada jugador.',
            )}{' '}
          </p>
        </section>
      </div>
      {compact && (
        <div className="city-mobile-dock">
          <div className="city-tools">
            <button
              className="button secondary city-zoom-toggle"
              aria-pressed={zoomed}
              onClick={() => setZoomed(!zoomed)}
            >
              <ZoomIn size={16} />
              {t(zoomed ? 'Ver tablero completo' : 'Ampliar tablero')}
            </button>
            <button
              className="button secondary city-manage-toggle"
              onClick={() => setManagementOpen(true)}
            >
              <Wallet size={16} /> {t('Jugadores y propiedades')}
            </button>
          </div>
          {actions}
        </div>
      )}
      {compact ? (
        managementOpen && (
          <Modal title={t('Jugadores y propiedades')} onClose={() => setManagementOpen(false)} wide>
            <div className="city-sidebar mobile-city-sidebar">{management}</div>
          </Modal>
        )
      ) : (
        <aside className="city-sidebar">{management}</aside>
      )}

      {inspected && (
        <Modal title={t(inspected.name)} onClose={() => setInspected(null)}>
          <div
            className="property-details-band"
            style={{ background: inspected.group ? GROUP_COLORS[inspected.group] : '#83a48e' }}
          />
          <div className="property-details-stats">
            <div>
              <small>{t('Precio')}</small>
              <strong>{inspected.price ? money(inspected.price) : '—'}</strong>
            </div>
            <div>
              <small>{t('Propietario')}</small>
              <strong>
                {state.players.find((p) => p.id === state.properties[inspected.index]?.ownerId)
                  ?.name || t('Banco')}
              </strong>
            </div>
          </div>
          {state.properties[inspected.index]?.isMortgaged && (
            <div className="notice">{t('Hipotecada: no cobra alquiler.')}</div>
          )}
          {inspected.type === 'property' && (
            <>
              <h3>{t('Alquileres')}</h3>
              {[
                t('Sin construir'),
                t('1 casa'),
                t('2 casas'),
                t('3 casas'),
                t('4 casas'),
                t('Hotel'),
              ].map((label, i) => (
                <div className="rent-row" key={t(label)}>
                  <span>{t(label)}</span>
                  <strong>{money(inspected.rent?.[i] ?? 0)}</strong>
                </div>
              ))}
              <p className="form-hint">
                {t('El alquiler sin edificios se duplica al completar el grupo.')}{' '}
              </p>
            </>
          )}
          {inspected.type === 'station' &&
            inspected.rent?.map((v, i) => (
              <div className="rent-row" key={i}>
                <span>
                  {i + 1} {t('estaciones')}
                </span>
                <strong>{money(v)}</strong>
              </div>
            ))}
          {inspected.type === 'utility' && (
            <p>
              {t(
                'Alquiler: cuatro veces la suma de dados, o diez veces si su dueño tiene los dos servicios.',
              )}{' '}
            </p>
          )}
          {inspected.houseCost && (
            <div className="rent-row">
              <span>{t('Construir una casa')}</span>
              <strong>{money(inspected.houseCost)}</strong>
            </div>
          )}
          {inspected.mortgageValue && (
            <div className="rent-row">
              <span>{t('Valor de hipoteca')}</span>
              <strong>{money(inspected.mortgageValue)}</strong>
            </div>
          )}
          {inspected.taxAmount && (
            <p>
              {t('Impuesto de')} {money(inspected.taxAmount)}.
            </p>
          )}
          {inspected.type === 'go' && (
            <p>
              {t('Cobras')} {money(state.customRules.salaryGO)} {t('al pasar por aquí.')}
            </p>
          )}
          {inspected.type === 'free_parking' && (
            <p>
              {state.customRules.freeParkingPool
                ? t('El bote actual es de {0}.', { '0': money(state.freeParkingPool) })
                : t('Un momento de descanso. No hay pagos.')}
            </p>
          )}
          {['chance', 'community_chest'].includes(inspected.type) && (
            <p>
              {t(
                'Recibes una carta del mazo correspondiente. Su efecto se aplica automáticamente.',
              )}
            </p>
          )}
          {inspected.type === 'jail' && (
            <p>
              {t(
                'Si vienes de visita, no ocurre nada. Si estás detenido, consulta las opciones de tu turno para salir.',
              )}{' '}
            </p>
          )}
          {inspected.type === 'go_to_jail' && (
            <p>{t('Vas directamente a la cárcel, sin cobrar el salario de Salida.')}</p>
          )}
          <button className="button secondary full" onClick={() => setInspected(null)}>
            {t('Volver al tablero')}{' '}
          </button>
        </Modal>
      )}
      {incoming && (
        <Modal
          title={t('Una propuesta sobre la mesa')}
          onClose={() => onAction({ type: 'RESPOND_TRADE', tradeId: incoming.id, accept: false })}
        >
          <p>
            <strong>{state.players.find((p) => p.id === incoming.fromPlayerId)?.name}</strong>{' '}
            {t('quiere negociar contigo.')}{' '}
          </p>
          <div className="trade-offer">
            <div>
              <span className="eyebrow">{t('RECIBES')}</span>
              <strong>{money(incoming.offeredCash)}</strong>
              {incoming.offeredPropertyIndices.map((i) => (
                <p key={i}>
                  {t(BOARD_TILES[i].name)}
                  {state.properties[i]?.isMortgaged ? t(' (hipotecada)') : ''}
                </p>
              ))}
            </div>
            <div>
              <span className="eyebrow">{t('ENTREGAS')}</span>
              <strong>{money(incoming.requestedCash)}</strong>
              {incoming.requestedPropertyIndices.map((i) => (
                <p key={i}>
                  {t(BOARD_TILES[i].name)}
                  {state.properties[i]?.isMortgaged ? t(' (hipotecada)') : ''}
                </p>
              ))}
            </div>
          </div>
          <div className="choice-buttons">
            <button
              className="button primary full"
              disabled={busy}
              onClick={() =>
                onAction({ type: 'RESPOND_TRADE', tradeId: incoming.id, accept: true })
              }
            >
              <Check size={17} /> {t('Aceptar trato')}{' '}
            </button>
            <button
              className="button secondary full"
              disabled={busy}
              onClick={() =>
                onAction({ type: 'RESPOND_TRADE', tradeId: incoming.id, accept: false })
              }
            >
              {t('Rechazar')}{' '}
            </button>
          </div>
        </Modal>
      )}
      {bankruptcy && (
        <Modal title={t('¿Declarar bancarrota?')} onClose={() => setBankruptcy(false)}>
          <p>
            {t(
              'Quedarás eliminado y tus propiedades volverán al banco. Puedes intentar vender edificios o hipotecar antes de decidir.',
            )}{' '}
          </p>
          <div className="choice-buttons">
            <button className="button primary full" onClick={() => setBankruptcy(false)}>
              {t('Seguir gestionando')}{' '}
            </button>
            <button
              className="button danger full"
              onClick={() => {
                onAction({ type: 'DECLARE_BANKRUPTCY' });
                setBankruptcy(false);
              }}
            >
              {t('Confirmar bancarrota')}{' '}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
