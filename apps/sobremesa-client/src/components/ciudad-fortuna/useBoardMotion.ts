import { useEffect, useRef, useState } from 'react';
import type { CiudadFortunaPublicState } from 'sobremesa-logic';

export function useBoardMotion(state: CiudadFortunaPublicState) {
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
