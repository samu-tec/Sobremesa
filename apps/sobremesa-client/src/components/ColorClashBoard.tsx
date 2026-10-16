import { getGame, t, gameText } from '../i18n';
import { useEffect, useState, useRef } from 'react';
import {
  isCardPlayable,
  type Card,
  type ColorClashAction,
  type ColorClashPublicState,
  type PlayableColor,
} from 'sobremesa-logic';
import { ArrowRight, Layers3, Repeat2, CircleSlash2 } from 'lucide-react';
import { PlayersPanel, GameTip, type BoardProps } from '../ui/GameLayout';
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
export function ColorClashBoard({
  room,
  state,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<ColorClashPublicState, ColorClashAction>) {
  const colourPanel = useRef<HTMLElement>(null);
  const handZone = useRef<HTMLDivElement>(null);
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
      if (e.key === 'Escape' && colourPanel.current && !document.querySelector('[role="dialog"]'))
        closeChooser();
    };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, []);
  useEffect(() => {
    if (wild) {
      colourPanel.current
        ?.querySelector<HTMLButtonElement>('.color-choices button')
        ?.focus({ preventScroll: true });
      handZone.current?.scrollIntoView({ block: 'end', behavior: 'instant' });
    }
  }, [wild]);
  const canPlay = state.currentTurnPlayerId === myPlayerId && !state.winner && !busy;
  const playable = (card: Card) =>
    isCardPlayable(card, state.activeColor, state.topDiscardCard) &&
    (!state.hasDrawnThisTurn || state.drawnCardId === card.id);
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
  const play = (card: Card) => {
    if (card.color === 'wild') setWild(card);
    else onAction({ type: 'PLAY_CARD', cardId: card.id });
  };
  return (
    <div className="table-layout">
      <section className="panel color-table">
        <div className="opponents-hands">
          {state.opponents.map((p) => (
            <div
              key={p.playerId}
              className={state.currentTurnPlayerId === p.playerId ? 'active' : ''}
            >
              <div className="mini-cards">
                {Array.from({ length: Math.min(p.cardCount, 7) }, (_, i) => (
                  <span
                    key={i}
                    style={{
                      transform: `translateX(${(i - (Math.min(p.cardCount, 7) - 1) / 2) * 10}px) rotate(${(i - 3) * 5}deg)`,
                    }}
                  >
                    ✳
                  </span>
                ))}
              </div>
              <strong>{room.players.find((v) => v.id === p.playerId)?.name}</strong>
              <small>
                {p.cardCount === 1
                  ? t('¡Última carta!')
                  : t(p.cardCount === 1 ? '{0} carta' : '{0} cartas', { '0': p.cardCount })}
              </small>
            </div>
          ))}
        </div>
        <div className="card-table-center">
          <div className="deck-area">
            <button
              className="draw-deck"
              aria-label={t('Robar una carta. Quedan {0}', { '0': state.drawPileCount })}
              disabled={!canPlay || state.hasDrawnThisTurn}
              onClick={() => onAction({ type: 'DRAW_CARD' })}
            >
              <Layers3 size={25} />
              <span>{t('ROBAR')}</span>
            </button>
            <small>
              {state.drawPileCount} {t('en el mazo')}
            </small>
          </div>
          <div className="discard-area">
            <CardFace card={state.topDiscardCard} />
            <span className={`active-color active-${state.activeColor}`}>
              ● {t(colorNames[state.activeColor])}
            </span>
          </div>
        </div>
        <div className="card-action-status" aria-live="polite">
          {gameText(state.lastActionDescription)}
        </div>
        <div className="hand-zone" ref={handZone}>
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
          <div className="your-hand-heading">
            <strong>
              {t('Tu mano')} <span>{state.myHand.length}</span>
            </strong>
            <small>{canPlay ? t('Elige una carta válida') : t('Esperando tu turno')}</small>
          </div>
          <div className="your-hand" tabIndex={0} role="group" aria-label={t('Tus cartas')}>
            {state.myHand.map((card) => (
              <button
                key={card.id}
                className={`hand-card ${canPlay && playable(card) ? 'playable' : ''}`}
                disabled={!canPlay || !playable(card) || !!wild}
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
              </button>
            ))}
          </div>
        </div>
        {canPlay && state.hasDrawnThisTurn && (
          <button
            className="button secondary pass-button"
            onClick={() => onAction({ type: 'PASS_TURN' })}
          >
            {t('Pasar turno')} <ArrowRight size={17} />
          </button>
        )}
        <p className="board-caption">
          {state.hasDrawnThisTurn
            ? t('Puedes jugar la carta recién robada o pasar.')
            : t('Combina el color o el valor de la carta central. Los comodines siempre sirven.')}
        </p>
      </section>
      <aside className="table-sidebar">
        <PlayersPanel
          room={room}
          myPlayerId={myPlayerId}
          currentTurn={state.currentTurnPlayerId}
          values={values}
        />
        <GameTip text={getGame('colorclash').tip} />
        <div className="game-mini-rules">
          <span className="eyebrow">{t('EL OBJETIVO')}</span>
          <p>{t('Quédate sin cartas antes que el resto. No se acumulan los +2 y +4.')}</p>
        </div>
      </aside>
    </div>
  );
}
