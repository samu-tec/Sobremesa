import { t } from '../i18n';
import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import type { RoomInfo } from '@games/game-logic';
export function TurnClock({ room }: { room: RoomInfo }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    // Measure elapsed time locally so an incorrect device clock cannot change the countdown.
    const received = performance.now();
    const initial = (room.turnDeadline ?? room.serverNow) - room.serverNow;
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((initial - (performance.now() - received)) / 1000)));
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [room.turnDeadline, room.serverNow]);
  if (room.status !== 'in_game' || !room.turnDeadline) return null;
  return (
    <span
      className={`turn-clock ${remaining <= 15 ? 'clock-urgent' : ''}`}
      role="timer"
      aria-label={t('Tiempo restante')}
    >
      <Timer size={16} />
      {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
    </span>
  );
}
