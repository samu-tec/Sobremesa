import { t, gameText, formatMoney } from '../i18n';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  BOARD_TILES,
  getCiudadFortunaRent,
  PROPERTY_GROUPS,
  type BoardTile,
  type PropertyGroup,
  type CiudadFortunaAction,
  type CiudadFortunaPublicState,
} from 'sobremesa-logic';
import {
  Cat,
  Rocket,
  Leaf,
  Crown,
  Sailboat,
  Gem,
  CircleHelp,
  Landmark,
  LockKeyhole,
  TrainFront,
  TreePine,
  Users,
  Zap,
  ArrowRight,
  Building2,
  Check,
  Coins,
  Dices,
  Handshake,
  History,
  Home,
  Gavel,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { BoardFrame, DiceFace, type BoardProps } from '../ui/GameLayout';
import { Modal } from '../ui/Modal';
import '../styles/ciudad-fortuna.css';

const money = formatMoney;
export function CiudadFortunaBoard({
  room,
  state,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<CiudadFortunaPublicState, CiudadFortunaAction>) {
  const [tab, setTab] = useState<'properties' | 'trade' | 'history'>('properties'),
    [inspected, setInspected] = useState<BoardTile | null>(null),
    [bankruptcy, setBankruptcy] = useState(false),
    [managementOpen, setManagementOpen] = useState(false);
  const [target, setTarget] = useState(''),
    [offeredCash, setOfferedCash] = useState(0),
    [requestedCash, setRequestedCash] = useState(0),
    [offered, setOffered] = useState<number[]>([]),
    [requested, setRequested] = useState<number[]>([]),
    [bid, setBid] = useState(10);
  const { rolling, moving, positionOf } = useCiudadFortunaMotion(state);
  const me = state.players.find((p) => p.id === myPlayerId),
    current = state.players.find((p) => p.id === state.currentTurnPlayerId),
    myTurn =
      state.currentTurnPlayerId === myPlayerId &&
      !state.winner &&
      !state.isDraw &&
      !me?.isBankrupt &&
      !busy;
  const own = (id: string) => BOARD_TILES.filter((t) => state.properties[t.index]?.ownerId === id),
    properties = own(myPlayerId),
    partner = state.players.find((p) => p.id === target);
  const debt = myTurn && (me?.cash ?? 0) < 0,
    tile = state.pendingTileAction ? BOARD_TILES[state.pendingTileAction.tileIndex] : null,
    auction = state.auction;
  const incoming = state.activeTrade?.toPlayerId === myPlayerId ? state.activeTrade : null;
  const canTrade =
    !state.winner &&
    !state.isDraw &&
    !state.auction &&
    !state.activeTrade &&
    !me?.isBankrupt &&
    !busy;
  useEffect(
    () => setBid((state.auction?.currentBid ?? 0) + 10),
    [state.auction?.currentBid, state.auction?.tileIndex],
  );
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
  const openManagement = (nextTab: 'properties' | 'trade' | 'history') => {
    setTab(nextTab);
    setManagementOpen(true);
  };
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
              disabled={moving}
              onClick={() => onAction({ type: 'ROLL_DICE' })}
            >
              <Dices size={19} /> {t('Tirar dados')}{' '}
            </button>
          </>
        )}
        {!auction && !debt && myTurn && state.turnPhase === 'tile_action' && tile && (
          <>
            <button
              className="button primary"
              disabled={moving || (me?.cash ?? 0) < (tile.price ?? 0)}
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
          <button
            className="button primary"
            disabled={moving}
            onClick={() => onAction({ type: 'END_TURN' })}
          >
            {t('Terminar turno')} <ArrowRight size={18} />
          </button>
        )}
        {debt && (
          <>
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
    <section className="panel city-management">
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
                  state.properties[i]?.ownerId === myPlayerId && !state.properties[i]?.isMortgaged,
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
                <button className="text-button" onClick={() => onAction({ type: 'CANCEL_TRADE' })}>
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
                    max={Math.max(0, me?.cash ?? 0)}
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
                    max={Math.max(0, partner.cash)}
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
                  offeredCash > Math.max(0, me?.cash ?? 0) ||
                  requestedCash > Math.max(0, partner.cash)
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
  );
  return (
    <BoardFrame
      room={room}
      myPlayerId={myPlayerId}
      turn={state.currentTurnPlayerId}
      values={Object.fromEntries(
        state.players.map((p) => [
          p.id,
          p.isBankrupt
            ? t('En bancarrota')
            : `${money(p.cash)} · #${p.position}${p.inJail ? ` · ${t('En la cárcel')}` : ''}`,
        ]),
      )}
      playerIcons={Object.fromEntries(
        state.players.map((p, i) => [p.id, <PlayerPiece key={p.id} index={i} />]),
      )}
      actions={
        <>
          <nav className="city-fixed-tools" aria-label={t('Gestión de Ciudad Fortuna')}>
            {(
              [
                ['properties', Home, t('Propiedades')],
                ['trade', Handshake, t('Tratos')],
                ['history', History, t('Actividad')],
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                className="city-fixed-tool"
                aria-haspopup="dialog"
                onClick={() => openManagement(id)}
              >
                <Icon size={17} />
                <span>{t(label)}</span>
              </button>
            ))}
          </nav>
          <div
            key={state.lastMovement?.id ?? 0}
            className={`city-dice ${rolling ? 'dice-rolling' : ''}`}
          >
            <DiceFace value={state.lastDice[0]} />
            <DiceFace value={state.lastDice[1]} />
          </div>
          <p>
            {state.hasRolled
              ? t('{0} puntos{1}', {
                  '0': state.lastDiceSum,
                  '1': state.isDouble ? t(' · Dobles') : '',
                })
              : t('Cada tirada, una oportunidad.')}
          </p>

          {actions}
        </>
      }
    >
      <div className="city-main">
        <section className="city-board-panel">
          <div className="city-board-scroll">
            <BoardSurface
              state={state}
              positionOf={positionOf}
              moving={moving}
              onInspect={setInspected}
            >
              <span className="city-center-eyebrow">
                {state.customRules.maxRounds == null
                  ? `${t('RONDA')} ${state.round} · ${t('Sin límite')}`
                  : `${t('RONDA')} ${state.round} ${t('DE')} ${state.customRules.maxRounds}`}
              </span>
              <section className="city-event-banner" aria-label={t('Movimientos recientes')}>
                <span>{t('Movimientos recientes')}</span>
                <ul className="city-recent-moves" aria-live="polite">
                  {state.logs.slice(0, 3).length ? (
                    state.logs
                      .slice(0, 3)
                      .map((log, index) => <li key={`${index}-${log.key}`}>{gameText(log)}</li>)
                  ) : (
                    <li>{t('Aún no hay movimientos.')}</li>
                  )}
                </ul>
              </section>
              {state.customRules.freeParkingPool && (
                <span className="city-pot">
                  <Coins size={14} /> {t('Bote:')} {money(state.freeParkingPool)}
                </span>
              )}
            </BoardSurface>
          </div>
        </section>
      </div>
      {managementOpen && (
        <Modal
          title={t(tab === 'properties' ? 'Propiedades' : tab === 'trade' ? 'Tratos' : 'Actividad')}
          onClose={() => setManagementOpen(false)}
          wide
        >
          {management}
        </Modal>
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
          {state.properties[inspected.index]?.ownerId && (
            <div className="notice property-current-rent">
              <span>{t('Alquiler actual')}</span>
              <strong>{money(getCiudadFortunaRent(state, inspected.index))}</strong>
              {inspected.type === 'utility' && (
                <small>{t('Con la última tirada; varía con los dados.')}</small>
              )}
            </div>
          )}
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
    </BoardFrame>
  );
}

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
function BoardSurface({
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
            data-stack-size={occupants.length}
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
        {state.players.map((player, seat) => {
          if (player.isBankrupt) return null;
          const position = positionOf(player);
          const occupants = state.players.filter(
            (candidate) => !candidate.isBankrupt && positionOf(candidate) === position,
          );
          return (
            <span
              key={player.id}
              className="city-token"
              data-player={player.id}
              data-position={position}
              data-stack-size={occupants.length}
              style={piecePosition(
                position,
                occupants.findIndex((candidate) => candidate.id === player.id),
                occupants.length,
              )}
            >
              <PlayerPiece index={seat} active={player.id === state.currentTurnPlayerId} />
            </span>
          );
        })}
      </div>
    </div>
  );
}

const PLAYER_COLORS = ['#ad452b', '#315e9c', '#37713b', '#80519b', '#92690e', '#167572'];
const PIECES = [Cat, Rocket, Leaf, Crown, Sailboat, Gem];
function PlayerPiece({ index, active = false }: { index: number; active?: boolean }) {
  const Icon = PIECES[index % PIECES.length];
  return (
    <span
      className={`player-piece ${active ? 'piece-active' : ''}`}
      style={{ '--piece-color': PLAYER_COLORS[index % PLAYER_COLORS.length] } as CSSProperties}
    >
      <Icon size={18} strokeWidth={2.5} aria-hidden="true" />
    </span>
  );
}

// The CSS grid uses 2-unit corners and nine 1-unit streets per edge.
const CORNER = 2;
const SIZE = CORNER * 2 + 9;
function tilePosition(index: number) {
  if (index <= 10) return { gridRow: 1, gridColumn: index + 1 };
  if (index <= 20) return { gridRow: index - 9, gridColumn: 11 };
  if (index <= 30) return { gridRow: 11, gridColumn: 31 - index };
  return { gridRow: 41 - index, gridColumn: 1 };
}
function tileEdge(index: number) {
  if (index <= 10) return 'top';
  if (index < 20) return 'right';
  if (index <= 30) return 'bottom';
  return 'left';
}
function axis(cell: number) {
  return cell === 1 ? 0 : CORNER + cell - 2;
}
/** Tokens stay centered alone, split left and right in pairs, and fan out for larger groups. */
function piecePosition(index: number, occupant: number, count: number) {
  const { gridRow, gridColumn } = tilePosition(index);
  const x = axis(gridColumn),
    y = axis(gridRow);
  const corner = index % 10 === 0;
  const width = gridColumn === 1 || gridColumn === 11 ? CORNER : 1;
  const height = gridRow === 1 || gridRow === 11 ? CORNER : 1;
  const edge = tileEdge(index);
  let px = x + width / 2,
    py = y + height / 2;
  if (!corner && edge === 'top') py = y + height - 0.28;
  else if (!corner && edge === 'bottom') py = y + 0.28;
  else if (!corner && edge === 'right') px = x + 0.28;
  else if (!corner && edge === 'left') px = x + width - 0.28;

  if (count === 2) {
    px += occupant === 0 ? -0.14 : 0.14;
  } else if (count > 2) {
    const alongSide = !corner && (edge === 'left' || edge === 'right');
    const columns = alongSide ? 1 : Math.min(3, count);
    const rows = Math.ceil(count / columns);
    const column = occupant % columns;
    const row = Math.floor(occupant / columns);
    if (corner) {
      const towardBottom = index === 20 || index === 30;
      px = x + width / 2 + (occupant - (count - 1) / 2) * 0.27;
      py = y + (towardBottom ? height - 0.1 : 0.1);
    } else if (alongSide) {
      px = x + (edge === 'right' ? 0.06 : width - 0.06);
      py = y + 0.08 + (row / (rows - 1)) * 0.84;
    } else {
      px += (column - (columns - 1) / 2) * 0.32;
      py = y + (edge === 'top' ? height - 0.09 : 0.09);
      py += (row - (rows - 1) / 2) * 0.24;
    }
  }
  return { left: `${(px / SIZE) * 100}%`, top: `${(py / SIZE) * 100}%` };
}

function useCiudadFortunaMotion(state: CiudadFortunaPublicState) {
  const latest = useRef(state);
  latest.current = state;
  const seen = useRef(state.lastMovement?.id ?? 0);
  const [motion, setMotion] = useState<{
    playerId: string;
    position: number;
    rolling: boolean;
    direct: boolean;
  } | null>(null);
  const movementId = state.lastMovement?.id ?? 0;
  const finished = !!state.winner || state.isDraw;

  useEffect(() => {
    const movement = latest.current.lastMovement;
    // Mount/reconnect displays the authoritative position without replaying old rolls.
    if (!movement || movement.id === seen.current || finished) {
      if (finished) setMotion(null);
      return;
    }
    seen.current = movement.id;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    if (query.matches || document.hidden) {
      setMotion(null);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    let step = 0;
    const stop = () => {
      stopped = true;
      clearTimeout(timer);
      setMotion(null);
    };
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    const onPreference = () => {
      if (query.matches) stop();
    };
    const advance = () => {
      if (stopped) return;
      const waypoint = movement.path[step++];
      if (!waypoint) {
        setMotion(null);
        return;
      }
      setMotion({
        playerId: movement.playerId,
        position: waypoint.position,
        rolling: false,
        direct: waypoint.direct,
      });
      timer = setTimeout(
        advance,
        waypoint.direct ? 260 : Math.max(45, Math.min(120, 1400 / movement.path.length)),
      );
    };
    setMotion({
      playerId: movement.playerId,
      position: movement.from,
      rolling: true,
      direct: false,
    });
    timer = setTimeout(advance, 420);
    document.addEventListener('visibilitychange', onVisibility);
    query.addEventListener('change', onPreference);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      query.removeEventListener('change', onPreference);
    };
  }, [movementId, finished]);
  return {
    motion,
    rolling: motion?.rolling ?? false,
    moving: !!motion,
    positionOf: (player: CiudadFortunaPublicState['players'][number]) =>
      motion?.playerId === player.id ? motion.position : player.position,
  };
}
