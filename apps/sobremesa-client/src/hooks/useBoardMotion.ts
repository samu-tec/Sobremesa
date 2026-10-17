import { useEffect, useLayoutEffect, useRef } from 'react';
type Box = { x: number; y: number; width: number; height: number };
export interface PieceTravel {
  from: string;
  to: string;
}
interface MotionOptions {
  travel?: PieceTravel[];
  flipCells?: string[];
  sow?: { from: number; path: number[] } | null;
  rollDice?: boolean;
  diceKey?: string | number;
  travelKey?: string | number;
}
/** Animate visual changes only. Rules and input stay available during the animation. */
export function useBoardMotion(revision: string | number, options: MotionOptions = {}) {
  const root = useRef<HTMLDivElement>(null),
    previous = useRef<{
      tokens: Map<string, Box>;
      cells: Map<string, Box>;
      diceKey?: string | number;
      travelKey?: string | number;
    } | null>(null),
    running = useRef(new Set<Animation>()),
    decorations = useRef(new Set<HTMLElement>());
  const cancel = () => {
    for (const animation of running.current) animation.cancel();
    running.current.clear();
    for (const node of decorations.current) node.remove();
    decorations.current.clear();
  };
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)'),
      stop = () => {
        if (query.matches || document.hidden) cancel();
      };
    query.addEventListener('change', stop);
    document.addEventListener('visibilitychange', stop);
    return () => {
      query.removeEventListener('change', stop);
      document.removeEventListener('visibilitychange', stop);
      cancel();
    };
  }, []);
  useLayoutEffect(() => {
    const host = root.current;
    if (!host) return;
    cancel();
    const origin = host.getBoundingClientRect(),
      box = (node: Element): Box => {
        const r = node.getBoundingClientRect();
        return { x: r.left - origin.left, y: r.top - origin.top, width: r.width, height: r.height };
      };
    const tokens = new Map<string, Box>(),
      cells = new Map<string, Box>();
    host
      .querySelectorAll<HTMLElement>('[data-motion-id]')
      .forEach((node) => tokens.set(node.dataset.motionId!, box(node)));
    host
      .querySelectorAll<HTMLElement>('[data-cell]')
      .forEach((node) => cells.set(node.dataset.cell!, box(node)));
    const before = previous.current;
    previous.current = { tokens, cells, diceKey: options.diceKey, travelKey: options.travelKey };
    if (
      !before ||
      document.hidden ||
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof host.animate !== 'function'
    )
      return;
    const animate = (node: Element, keyframes: Keyframe[], duration = 360, delay = 0) => {
      const animation = node.animate(keyframes, {
        duration,
        delay,
        easing: 'cubic-bezier(.2,.75,.25,1)',
        fill: 'backwards',
      });
      running.current.add(animation);
      animation.onfinish = () => running.current.delete(animation);
      return animation;
    };
    host.querySelectorAll<HTMLElement>('[data-motion-id]').forEach((node) => {
      const id = node.dataset.motionId!,
        now = tokens.get(id)!,
        old = before.tokens.get(id);
      if (old) {
        const x = old.x - now.x,
          y = old.y - now.y;
        if (Math.abs(x) > 2 || Math.abs(y) > 2)
          animate(
            node,
            [
              { transform: `translate(${x}px,${y}px)`, opacity: 0.82 },
              { transform: 'translate(0,0)', opacity: 1 },
            ],
            390,
          );
      } else
        animate(
          node,
          [
            { transform: 'translateY(-10px) scale(.8)', opacity: 0.25 },
            { transform: 'translateY(0) scale(1)', opacity: 1 },
          ],
          300,
        );
    });
    for (const move of (options.travelKey === undefined || before.travelKey !== options.travelKey
      ? options.travel
      : []) || []) {
      const target = Array.from(host.querySelectorAll<HTMLElement>('[data-cell]')).find(
          (node) => node.dataset.cell === move.to,
        ),
        from = before.cells.get(move.from),
        to = cells.get(move.to),
        piece = Array.from(target?.querySelectorAll('.motion-piece') || []).at(-1);
      if (piece && from && to)
        animate(
          piece,
          [
            { transform: `translate(${from.x - to.x}px,${from.y - to.y}px) scale(1.08)` },
            { transform: 'translate(0,0) scale(1)' },
          ],
          380,
        );
    }
    for (const id of options.flipCells || []) {
      const target = Array.from(host.querySelectorAll<HTMLElement>('[data-cell]'))
        .find((node) => node.dataset.cell === id)
        ?.querySelector('.motion-piece');
      if (target)
        animate(
          target,
          [
            { transform: 'rotateY(0)' },
            { transform: 'rotateY(90deg)', offset: 0.45 },
            { transform: 'rotateY(0)' },
          ],
          380,
        );
    }
    if (options.rollDice && (options.diceKey === undefined || before.diceKey !== options.diceKey))
      host
        .querySelectorAll('.dice-face:not([data-kept="true"])')
        .forEach((node, i) =>
          animate(
            node,
            [
              { transform: 'rotate(-14deg) translateY(-5px)' },
              { transform: 'rotate(15deg) translateY(-8px)', offset: 0.3 },
              { transform: 'rotate(-8deg)', offset: 0.7 },
              { transform: 'rotate(0) translateY(0)' },
            ],
            430,
            i * 25,
          ),
        );
    const sow = options.sow,
      source = sow && before.cells.get(String(sow.from));
    if (sow && source)
      for (let i = 0; i < Math.min(sow.path.length, 48); i++) {
        const target = cells.get(String(sow.path[i]));
        if (!target) continue;
        const seed = document.createElement('span');
        seed.className = 'sowing-seed';
        seed.setAttribute('aria-hidden', 'true');
        host.append(seed);
        decorations.current.add(seed);
        const animation = animate(
          seed,
          [
            {
              transform: `translate(${source.x + source.width / 2}px,${source.y + source.height / 2}px)`,
              opacity: 1,
            },
            {
              transform: `translate(${target.x + target.width / 2}px,${target.y + target.height / 2}px)`,
              opacity: 1,
            },
            {
              transform: `translate(${target.x + target.width / 2}px,${target.y + target.height / 2}px) scale(.5)`,
              opacity: 0,
            },
          ],
          260,
          i * 7,
        );
        animation.onfinish = () => {
          seed.remove();
          decorations.current.delete(seed);
          running.current.delete(animation);
        };
      }
  }, [revision]);
  return root;
}
