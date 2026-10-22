import { useBoardMotion } from '../hooks/useBoardMotion';
import { t, gameText } from '../i18n';
import { useEffect, useState, useRef } from 'react';
import {
  isCardPlayable,
  nextColorPlayer,
  type Card,
  type CambioDeColorAction,
  type CambioDeColorEvent,
  type CambioDeColorPublicState,
  type PlayableColor,
} from 'sobremesa-logic';
import { ArrowRight, ArrowLeft, Check, Layers3, Repeat2, CircleSlash2 } from 'lucide-react';
import { PlayersPanel, type BoardProps } from '../ui/GameLayout';
import { playSound, type SoundCue } from '../services/sound';
import '../styles/cambio-de-color.css';
const colorNames: Record<string, string> = {
  red: 'Rojo',
  blue: 'Azul',
  green: 'Verde',
  yellow: 'Amarillo',
  wild: 'Comodín',
};
const valueNames: Record<string, string> = {
  skip: 'Salto',
  reverse: 'Cambio de sentido',
  draw2: '+2',
  wild: 'Color',
  wild_draw4: '+4',
};
export function CardFace({ card }: { card: Card }) {
  return (
    <span className={`playing-card card-${card.color}`}>
      <span className="card-corner">
        {card.value === 'reverse' ? (
          <Repeat2 size={12} />
        ) : card.value === 'skip' ? (
          <CircleSlash2 size={12} />
        ) : (
          t(valueNames[card.value] || card.value)
        )}
      </span>
      <span className="card-center">
        {card.value === 'reverse' ? (
          <Repeat2 size={32} />
        ) : card.value === 'skip' ? (
          <CircleSlash2 size={32} />
        ) : card.color === 'wild' && card.value === 'wild' ? (
          <span className="wild-symbol">
            <i />
            <i />
            <i />
            <i />
          </span>
        ) : (
          t(valueNames[card.value] || card.value)
        )}
      </span>
      <span className="card-color-name">{t(colorNames[card.color])}</span>
    </span>
  );
}
export function CambioDeColorBoard({
  room,
  state,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<CambioDeColorPublicState, CambioDeColorAction>) {
  const motionRef = useBoardMotion(
    JSON.stringify([state.myHand.map((c) => c.id), state.topDiscardCard.id]),
  );
  const colourPanel = useRef<HTMLElement>(null);
  const previousAction = useRef(state.actionNumber);
  useEffect(() => {
    if (previousAction.current === state.actionNumber) return;
    previousAction.current = state.actionNumber;
    const cue: Partial<Record<CambioDeColorEvent, SoundCue>> = {
      card: 'card',
      draw: 'draw',
      reverse: 'reverse',
      skip: 'skip',
      stack: 'stack',
    };
    if (cue[state.lastEvent]) playSound(cue[state.lastEvent]!);
  }, [state.actionNumber, state.lastEvent]);
  const selectedButton = useRef<HTMLButtonElement | null>(null);
  const [wild, setWild] = useState<Card | null>(null);
  const closeChooser = () => {
    setWild(null);
    requestAnimationFrame(() => selectedButton.current?.focus({ preventScroll: true }));
  };
  useEffect(() => {
    setWild(null);
  }, [state.currentTurnPlayerId, state.winner]);
  useEffect(() => {
    const cancel = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && colourPanel.current && !document.querySelector('[role="dialog"]')) {
        e.preventDefault();
        e.stopPropagation();
        closeChooser();
      }
    };
    document.addEventListener('keydown', cancel, true);
    return () => document.removeEventListener('keydown', cancel, true);
  }, []);
  useEffect(() => {
    if (wild) {
      colourPanel.current
        ?.querySelector<HTMLButtonElement>('.color-choices button')
        ?.focus({ preventScroll: true });
    }
  }, [wild]);
  const canPlay =
    state.currentTurnPlayerId === myPlayerId && !state.winner && !busy && !state.jumpInWindow;
  const canJumpIn = state.jumpInEnabled && state.jumpInWindow && !state.winner && !busy;
  const isJumpInCard = (card: Card) =>
    card.color === state.topDiscardCard.color && card.value === state.topDiscardCard.value;
  const playable = (card: Card) =>
    (!state.pendingDraw || state.stackDrawCards) &&
    isCardPlayable(card, state.activeColor, state.topDiscardCard, state.pendingDraw) &&
    (!state.hasDrawnThisTurn || state.drawnCardId === card.id);
  const canPlayCard = (card: Card) =>
    (canPlay && playable(card)) || (canJumpIn && isJumpInCard(card));
  const values: Record<string, string> = {
    [myPlayerId]: t(state.myHand.length === 1 ? '{0} carta' : '{0} cartas', {
      '0': state.myHand.length,
    }),
  };
  state.opponents.forEach(
    (p) =>
      (values[p.playerId] = t(p.cardCount === 1 ? '{0} carta' : '{0} cartas', {
        '0': p.cardCount,
      })),
  );
  const nextId = nextColorPlayer(state.playerOrder, state.currentTurnPlayerId, state.turnDirection);
  const nextName = room.players.find((p) => p.id === nextId)?.name || t('Tu rival');
  const direction = state.turnDirection === 1 ? t('Sentido horario') : t('Sentido antihorario');
  const play = (card: Card) => {
    if (card.color === 'wild') setWild(card);
    else onAction({ type: 'PLAY_CARD', cardId: card.id });
  };
  return (
    <div className="table-layout animated-table color-match" ref={motionRef}>
      <section className="panel color-table" data-action-number={state.actionNumber}>
        <div className={`card-table-center ${wild ? 'choosing-color' : ''}`}>
          <div className="deck-area">
            <button
              className={`draw-deck ${canPlay && !state.hasDrawnThisTurn && !wild ? `draw-available ${state.pendingDraw ? 'draw-penalty' : !state.myHand.some(playable) ? 'draw-required' : ''}` : ''}`}
              aria-label={
                state.pendingDraw
                  ? t('Robar {0} cartas y perder el turno', { '0': state.pendingDraw })
                  : t('Robar una carta. Quedan {0}', { '0': state.drawPileCount })
              }
              disabled={!canPlay || state.hasDrawnThisTurn || !!wild}
              onClick={() => onAction({ type: 'DRAW_CARD' })}
            >
              <Layers3 size={25} />
              <span>{state.pendingDraw ? `+${state.pendingDraw}` : t('ROBAR')}</span>
            </button>
            <small>
              {state.drawPileCount} {t('en el mazo')}
            </small>
          </div>
          <div className="discard-area">
            <span data-motion-id={`card-${state.topDiscardCard.id}`}>
              <CardFace card={state.topDiscardCard} />
            </span>
            <span className={`active-color active-${state.activeColor}`}>
              ● {t(colorNames[state.activeColor])}
            </span>
          </div>
          {wild && (
            <section
              ref={colourPanel}
              className="color-choice-panel"
              aria-label={t('Elegir color')}
            >
              <div className="section-row">
                <strong>{t('¿Con qué color seguimos?')}</strong>
                <button className="text-button" onClick={closeChooser}>
                  {t('Cancelar')}
                </button>
              </div>
              <p>{t('Elige el color que deberá jugar la siguiente persona.')}</p>
              <div className="color-choices">
                {(['red', 'blue', 'green', 'yellow'] as PlayableColor[]).map((color) => (
                  <button
                    className={`choose-${color}`}
                    key={color}
                    onClick={() => {
                      onAction({ type: 'PLAY_CARD', cardId: wild.id, chosenColor: color });
                      setWild(null);
                    }}
                  >
                    {t(colorNames[color])}{' '}
                    <small>{state.myHand.filter((c) => c.color === color).length}</small>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
        <div className={`color-penalty ${state.pendingDraw ? 'pending' : ''}`} role="status">
          {state.jumpInWindow ? (
            <span>{t('Puedes entrar con una carta idéntica en color y valor.')}</span>
          ) : state.pendingDraw ? (
            <>
              <strong>{t('+{0} pendientes', { '0': state.pendingDraw })}</strong>
              <span>{t('Responde con +2 o +4, o acepta el robo.')}</span>
            </>
          ) : (
            <span>{gameText(state.lastActionDescription)}</span>
          )}
        </div>
        <div className="hand-zone">
          <div className="your-hand-heading">
            <strong>
              {t('Tu mano')} <span>{state.myHand.length}</span>
            </strong>
            <small>
              {canJumpIn
                ? t('Juega una carta idéntica para interrumpir')
                : canPlay
                  ? state.pendingDraw
                    ? t('Solo +2 o +4')
                    : t('Elige una carta válida')
                  : t('Esperando tu turno')}
            </small>
          </div>
          <div className="your-hand" tabIndex={0} role="group" aria-label={t('Tus cartas')}>
            {state.myHand.map((card) => (
              <button
                key={card.id}
                data-motion-id={`card-${card.id}`}
                className={`hand-card ${canPlayCard(card) ? 'playable' : ''} ${canJumpIn && isJumpInCard(card) ? 'jump-in-available' : ''}`}
                disabled={!canPlayCard(card) || !!wild}
                onClick={(e) => {
                  selectedButton.current = e.currentTarget;
                  play(card);
                }}
                aria-label={t('Jugar {0} {1}', {
                  '0': t(colorNames[card.color]),
                  '1': t(valueNames[card.value] || card.value),
                })}
              >
                <CardFace card={card} />
                {canPlayCard(card) && (
                  <span className="card-play-marker" aria-hidden="true">
                    <Check size={13} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="color-turn-controls">
          {canPlay && state.hasDrawnThisTurn ? (
            <button
              className="button secondary pass-button"
              onClick={() => onAction({ type: 'PASS_TURN' })}
            >
              {t('Pasar turno')} <ArrowRight size={17} />
            </button>
          ) : (
            <p className="board-caption">
              {state.pendingDraw
                ? t('Acepta la penalización desde el mazo o continúa con +2 o +4.')
                : state.playerOrder.length === 2
                  ? t('Con dos jugadores, Cambio de Sentido permite jugar de nuevo.')
                  : t('Combina color o valor; los comodines permiten elegir color.')}
            </p>
          )}
        </div>
      </section>
      <aside className="table-sidebar">
        <PlayersPanel
          room={room}
          myPlayerId={myPlayerId}
          currentTurn={state.currentTurnPlayerId}
          values={values}
        />
        <div className="color-direction" aria-label={t('Orden de juego')}>
          <span key={state.turnDirection} className="color-direction-label">
            {state.turnDirection === 1 ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            {direction}
          </span>
          <span>{t('Siguiente: {0}', { '0': nextName })}</span>
        </div>
        <ol className="color-player-order" tabIndex={0} aria-label={t('Orden de juego')}>
          {state.playerOrder.map((id, index) => {
            const player = room.players.find((p) => p.id === id);
            const count =
              id === myPlayerId
                ? state.myHand.length
                : state.opponents.find((p) => p.playerId === id)?.cardCount || 0;
            return (
              <li
                key={id}
                className={`${state.currentTurnPlayerId === id ? 'active' : ''} ${nextId === id ? 'next' : ''}`}
                aria-current={state.currentTurnPlayerId === id ? 'step' : undefined}
              >
                <span className="color-seat-number">{index + 1}</span>
                <div>
                  <strong>
                    {player?.name}
                    {id === myPlayerId ? t(' (tú)') : ''}
                  </strong>
                  <small>
                    {count === 1 ? t('¡Última carta!') : t('{0} cartas', { '0': count })}
                    {player?.isBot ? ' · Bot' : ''}
                  </small>
                </div>
                {state.turnDirection === 1 ? (
                  <ArrowRight className="color-order-arrow" size={16} />
                ) : (
                  <ArrowLeft className="color-order-arrow" size={16} />
                )}
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}
