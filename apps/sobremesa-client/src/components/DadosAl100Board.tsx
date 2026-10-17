import { useBoardMotion } from '../hooks/useBoardMotion';
import { getGame, t, gameText } from '../i18n';
import type { DadosAl100State, DadosAl100Action } from 'sobremesa-logic';
import { DiceFace, GameTip, PlayersPanel, type BoardProps } from '../ui/GameLayout';
import { Dices, Download } from 'lucide-react';
export function DadosAl100Board({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<DadosAl100State, DadosAl100Action>) {
  const game = getGame(room.gameType);
  const turn = s.currentTurnPlayerId;
  const canPlay = turn === myPlayerId && !s.winner && !busy;
  const motionRef = useBoardMotion(s.rollCount, { rollDice: s.rollCount > 0 });
  const values = Object.fromEntries(s.players.map((p) => [p.id, `${p.score} / ${s.targetScore}`]));
  return (
    <div className="table-layout animated-table" ref={motionRef}>
      <section className={`panel play-area play-${room.gameType}`}>
        <>
          <span className="eyebrow">{t('¿TE ATREVES CON OTRA?')}</span>
          <div className="pig-dice">
            <DiceFace value={s.lastRoll || 1} large />
          </div>
          <div className="turn-total">
            <span>{t('Puntos de este turno')}</span>
            <strong>{s.turnTotal}</strong>
            <small>{t('Aún sin guardar')}</small>
          </div>
          <p className="board-instruction" aria-live="polite">
            {gameText(s.message)}
          </p>
          <div className="pig-actions">
            <button
              className="button primary"
              disabled={!canPlay}
              onClick={() => onAction({ type: 'ROLL' })}
            >
              <Dices size={19} /> {t('Tirar dado')}{' '}
            </button>
            <button
              className="button secondary"
              disabled={!canPlay || s.turnTotal === 0}
              onClick={() => onAction({ type: 'HOLD' })}
            >
              <Download size={18} /> {t('Guardar')} {s.turnTotal > 0 ? s.turnTotal : ''}
            </button>
          </div>
          <div className="score-tracks">
            {s.players.map((p, i) => (
              <div key={p.id}>
                <div>
                  <span>
                    <i className={`color-${i}`} />
                    {room.players.find((v) => v.id === p.id)?.name}
                  </span>
                  <strong>
                    {p.score}
                    <small> / {s.targetScore}</small>
                  </strong>
                </div>
                <progress
                  value={p.score}
                  max={s.targetScore}
                  aria-label={t('Puntos de {0}', {
                    '0': room.players.find((v) => v.id === p.id)?.name,
                  })}
                />
              </div>
            ))}
          </div>
        </>
      </section>
      <aside className="table-sidebar">
        <PlayersPanel room={room} myPlayerId={myPlayerId} currentTurn={turn} values={values} />
        <GameTip text={game.tip} />
        <div className="game-mini-rules">
          <span className="eyebrow">{t('EL OBJETIVO')}</span>
          <p>{t('Llega a {0} puntos antes que los demás.', { '0': s.targetScore })}</p>
        </div>
      </aside>
    </div>
  );
}
