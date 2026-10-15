import { getGame, t, LanguageSelector } from '../i18n';
import { TurnClock } from './TurnClock';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { type RoomInfo } from '@games/game-logic';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Dice5,
  Trophy,
  RotateCcw,
  LogOut,
  Bot,
  Lightbulb,
} from 'lucide-react';
import { Modal } from './Modal';
import { Rules } from './Rules';
export interface BoardProps<S, A> {
  room: RoomInfo;
  state: S;
  myPlayerId: string;
  onAction: (action: A) => void;
  busy: boolean;
}
export function GameLayout({
  room,
  myPlayerId,
  currentTurn,
  isAuction = false,
  winner,
  isDraw,
  busy,
  onRestart,
  onLeave,
  onError,
  children,
}: {
  room: RoomInfo;
  myPlayerId: string;
  currentTurn: string;
  isAuction?: boolean;
  winner: string | null;
  isDraw?: boolean;
  busy: boolean;
  onRestart: () => void;
  onLeave: () => void;
  onError: (m: string) => void;
  children: ReactNode;
}) {
  const [rules, setRules] = useState(false),
    [confirmLeave, setConfirmLeave] = useState(false),
    [copied, setCopied] = useState(false),
    [turnNotice, setTurnNotice] = useState(false);
  const previousTurn = useRef<string | null>(null);
  const game = getGame(room.gameType),
    turn = room.players.find((p) => p.id === currentTurn),
    finished = !!winner || !!isDraw,
    yourTurn = currentTurn === myPlayerId && !finished && !isAuction;
  useEffect(() => {
    if (finished) {
      previousTurn.current = null;
      setTurnNotice(false);
      return;
    }
    if (isAuction) {
      previousTurn.current = currentTurn;
      setTurnNotice(false);
      return;
    }
    if (currentTurn !== myPlayerId) {
      previousTurn.current = currentTurn;
      setTurnNotice(false);
      return;
    }
    if (previousTurn.current === myPlayerId) return;
    previousTurn.current = myPlayerId;
    setTurnNotice(true);
    const timeout = window.setTimeout(() => setTurnNotice(false), 4500);
    return () => window.clearTimeout(timeout);
  }, [currentTurn, finished, isAuction, myPlayerId]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError(t('No se pudo copiar el código.'));
    }
  };
  return (
    <div className="room-page">
      <header className="game-header">
        <LanguageSelector />
        <button
          className="back-link"
          aria-label={t('Salir de la partida')}
          onClick={() => (finished ? onLeave() : setConfirmLeave(true))}
        >
          <ArrowLeft size={18} />
          <span>{t('Salir de la partida')}</span>
        </button>
        <a className="compact-brand" href="/">
          <Dice5 size={22} /> sobremesa.
        </a>
        <div className="header-actions">
          <button className="button small secondary" onClick={copy}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{room.code}</span>
          </button>
          <button className="button small secondary" onClick={() => setRules(true)}>
            <BookOpen size={16} />
            <span>{t('Reglas')}</span>
          </button>
        </div>
      </header>
      <main className={`game-content game-content-${room.gameType}`}>
        <div className="game-heading">
          <div>
            <span className="eyebrow">{t('LA PARTIDA ESTÁ EN LA MESA')}</span>
            <h1>
              {game.name}
              <span className="game-heading-dot">.</span>
            </h1>
          </div>
          <div className="turn-summary">
            <TurnClock room={room} />
            <div className={`turn-badge ${yourTurn ? 'your-turn' : ''}`} role="status">
              <span />
              <span className="turn-text">
                {finished
                  ? t('Partida terminada')
                  : isAuction
                    ? t('Subasta abierta')
                    : currentTurn === myPlayerId
                      ? t('Es tu turno')
                      : t('Turno de {0}', { '0': turn?.name || t('Tu rival') })}
              </span>
              {turn?.isBot && !finished && !isAuction && <Bot size={16} />}
            </div>
          </div>
        </div>
        {turnNotice && (
          <div className="turn-announcement" role="status" aria-live="assertive">
            <strong>{t('¡Te toca!')}</strong>
            <span>{t('Tus opciones están listas en el tablero.')}</span>
          </div>
        )}
        {room.players.some((p) => !p.connected) && (
          <div className="notice" role="status">
            {t('{0} está reconectando. Reservamos su sitio durante {1} segundos.', {
              '0': room.players
                .filter((p) => !p.connected)
                .map((p) => p.name)
                .join(', '),
              '1': Math.round(room.reconnectGraceMs / 1000),
            })}
          </div>
        )}
        {children}
      </main>
      {rules && <Rules room={room} gameType={room.gameType} onClose={() => setRules(false)} />}
      {confirmLeave && (
        <Modal title={t('¿Dejas tu sitio en la mesa?')} onClose={() => setConfirmLeave(false)}>
          <p>{t('Si sales ahora, abandonarás esta partida. Tus amigos podrán seguir jugando.')}</p>
          <div className="choice-buttons">
            <button className="button primary full" onClick={() => setConfirmLeave(false)}>
              {t('Seguir jugando')}{' '}
            </button>
            <button className="button danger full" onClick={onLeave}>
              <LogOut size={17} /> {t('Salir de la partida')}{' '}
            </button>
          </div>
        </Modal>
      )}
      {finished && (
        <Modal
          title={
            isDraw
              ? t('¡Una partida muy igualada!')
              : winner === myPlayerId
                ? t('¡La victoria es tuya!')
                : t('¡Tenemos un ganador!')
          }
          onClose={() => {}}
          dismissable={false}
        >
          <div className="result-content">
            <span className="result-trophy">
              <Trophy size={48} />
            </span>
            <p>
              {isDraw ? (
                t('Habéis empatado. Una buena excusa para volver a intentarlo.')
              ) : (
                <>
                  <strong>
                    {room.players.find((p) => p.id === winner)?.name || t('Tu rival')}
                  </strong>{' '}
                  {t('se lleva esta partida. ¿Echamos otra?')}{' '}
                </>
              )}
            </p>
            {room.hostId === myPlayerId ? (
              <button className="button primary full" disabled={busy} onClick={onRestart}>
                <RotateCcw size={17} /> {t('Preparar revancha')}{' '}
              </button>
            ) : (
              <p className="muted">{t('El anfitrión puede preparar la revancha.')}</p>
            )}
            <button className="button secondary full" disabled={busy} onClick={onLeave}>
              {t('Volver a los juegos')} <ArrowLeft size={17} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export function PlayersPanel({
  room,
  myPlayerId,
  currentTurn,
  values,
}: {
  room: RoomInfo;
  myPlayerId: string;
  currentTurn: string;
  values?: Record<string, string>;
}) {
  return (
    <section className="panel players-panel">
      <div className="section-row">
        <h2>{t('En la mesa')}</h2>
        <span className="muted">
          {room.players.length} {t('jugadores')}
        </span>
      </div>
      {room.players.map((p, index) => (
        <div className={`table-player ${currentTurn === p.id ? 'active' : ''}`} key={p.id}>
          <span className={`player-avatar color-${index % 6}`}>
            {p.isBot ? <Bot size={20} /> : p.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>
              {p.name}
              {p.id === myPlayerId ? t(' (tú)') : ''}
            </strong>
            <small>
              {!p.connected
                ? t('Reconectando…')
                : currentTurn === p.id
                  ? t('Jugando ahora')
                  : p.isBot
                    ? 'Bot'
                    : t('En la mesa')}
            </small>
          </div>
          {values?.[p.id] && <strong className="player-value">{values[p.id]}</strong>}
        </div>
      ))}
    </section>
  );
}
export function GameTip({ text }: { text: string }) {
  return (
    <div className="panel game-tip">
      <Lightbulb size={21} />
      <div>
        <h3>{t('Una pequeña pista')}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}
export function DiceFace({ value, large = false }: { value: number; large?: boolean }) {
  const positions: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <span
      className={`dice-face ${large ? 'large' : ''}`}
      role="img"
      aria-label={t('Dado: {0}', { '0': value })}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={positions[value]?.includes(i) ? 'pip' : ''} />
      ))}
    </span>
  );
}
