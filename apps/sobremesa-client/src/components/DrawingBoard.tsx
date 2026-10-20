import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  DRAW_COLORS,
  type DrawStroke,
  type DrawingAction,
  type DrawingPublicState,
} from 'sobremesa-logic';
import { t, gameText, useLocale } from '../i18n';
import { BoardFrame, type BoardProps } from '../ui/GameLayout';
import '../styles/drawing.css';
export function DrawingBoard({
  room,
  state: s,
  myPlayerId,
  onAction,
  busy,
}: BoardProps<DrawingPublicState, DrawingAction>) {
  const { locale } = useLocale(),
    canvas = useRef<HTMLCanvasElement>(null),
    path = useRef<[number, number][]>([]),
    lastSent = useRef(0),
    [draft, setDraft] = useState<DrawStroke | null>(null),
    [color, setColor] = useState(0),
    [width, setWidth] = useState(5),
    [text, setText] = useState(''),
    [guessAt, setGuessAt] = useState(0),
    [tick, setTick] = useState(0),
    [shape, setShape] = useState('line'),
    [coords, setCoords] = useState([200, 200, 700, 700]),
    drawer = s.currentTurnPlayerId === myPlayerId,
    canDraw = drawer && s.phase === 'draw' && !s.winner && !s.isDraw && !busy,
    canGuess =
      !drawer &&
      s.phase === 'draw' &&
      !s.guessed.includes(myPlayerId) &&
      (s.attempts[myPlayerId] ?? 0) < 12 &&
      !busy,
    name = (id: string) => room.players.find((p) => p.id === id)?.name ?? id;
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 500);
    for (const stroke of [...s.strokes, ...(draft ? [draft] : [])]) {
      if (!stroke.points.length) continue;
      ctx.strokeStyle = DRAW_COLORS[stroke.color];
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = stroke.width * 0.8;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const points = stroke.points.map(([x, y]) => [x * 0.8, y * 0.5]);
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.stroke();
      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(points[0][0], points[0][1], ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [s.strokes, draft]);
  useEffect(() => {
    path.current = [];
    setDraft(null);
    setText('');
  }, [s.turnIndex, s.phase]);
  const point = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
      const r = e.currentTarget.getBoundingClientRect();
      return [
        Math.round(Math.max(0, Math.min(1000, ((e.clientX - r.left) / r.width) * 1000))),
        Math.round(Math.max(0, Math.min(1000, ((e.clientY - r.top) / r.height) * 1000))),
      ];
    },
    send = (stroke: DrawStroke) => {
      if (!canDraw || Date.now() - lastSent.current < 300) return;
      lastSent.current = Date.now();
      onAction({ type: 'STROKE', stroke });
    },
    finish = () => {
      if (path.current.length) send({ points: path.current, color, width });
      path.current = [];
      setDraft(null);
    },
    coordinateStroke = (): DrawStroke => {
      const [x1, y1, x2, y2] = coords;
      let points: [number, number][];
      if (shape === 'rectangle')
        points = [
          [x1, y1],
          [x2, y1],
          [x2, y2],
          [x1, y2],
          [x1, y1],
        ];
      else if (shape === 'ellipse')
        points = Array.from({ length: 33 }, (_, i) => {
          const angle = (i / 32) * Math.PI * 2;
          return [
            Math.round((x1 + x2) / 2 + (Math.abs(x2 - x1) / 2) * Math.cos(angle)),
            Math.round((y1 + y2) / 2 + (Math.abs(y2 - y1) / 2) * Math.sin(angle)),
          ];
        });
      else
        points = [
          [x1, y1],
          [x2, y2],
        ];
      return { points, color, width };
    };
  void tick;
  return (
    <BoardFrame
      room={room}
      myPlayerId={myPlayerId}
      turn={s.currentTurnPlayerId}
      values={Object.fromEntries(s.players.map((p) => [p.id, t('{0} puntos', { '0': p.score })]))}
    >
      <p className="board-instruction" role="status">
        {gameText(s.message)}
      </p>
      <p>
        {t('Dibujo {0} de {1} · dibuja {2}', {
          '0': s.turnIndex + 1,
          '1': s.order.length,
          '2': name(s.currentTurnPlayerId),
        })}
      </p>
      {s.phase === 'choose' && (
        <section>
          <h2>{drawer ? t('Elige tu concepto secreto') : t('El dibujante está eligiendo.')}</h2>
          <div className="board-actions">
            {s.choices.map((word, i) => (
              <button
                className="button primary"
                key={i}
                disabled={busy}
                onClick={() => onAction({ type: 'CHOOSE', index: i })}
              >
                {word[locale]}
              </button>
            ))}
          </div>
        </section>
      )}
      {s.word && (
        <p className="drawing-secret">
          {s.phase === 'draw'
            ? t('Solo tú ves la palabra: {0}', { '0': s.word[locale] })
            : t('La palabra era: {0}', { '0': s.word[locale] })}
        </p>
      )}
      {!drawer && s.phase === 'draw' && s.wordLength && (
        <p>{t('Concepto de {0} caracteres en tu idioma.', { '0': s.wordLength[locale] })}</p>
      )}
      {canGuess && (
        <form
          className="drawing-guess"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim() && Date.now() - guessAt >= 1100) {
              onAction({ type: 'GUESS', text: text.trim() });
              setGuessAt(Date.now());
              setText('');
            }
          }}
        >
          <label>
            {t('Tu respuesta')}
            <input
              maxLength={50}
              value={text}
              autoComplete="off"
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <button className="button primary" disabled={!text.trim() || Date.now() - guessAt < 1100}>
            {t('Adivinar')}
          </button>
        </form>
      )}
      {s.guessed.includes(myPlayerId) && s.phase === 'draw' && (
        <p role="status">{t('¡Has acertado! Espera al resto sin revelar la palabra.')}</p>
      )}
      {drawer && s.phase === 'draw' && (
        <>
          <div className="drawing-tools">
            <label>
              {t('Color del trazo')}
              <select value={color} onChange={(e) => setColor(Number(e.target.value))}>
                {[
                  t('Negro'),
                  t('Rojo'),
                  t('Azul'),
                  t('Verde'),
                  t('Amarillo'),
                  t('Violeta'),
                  t('Naranja'),
                  t('Goma blanca'),
                ].map((label, i) => (
                  <option key={i} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('Grosor')}
              <input
                type="range"
                min={1}
                max={20}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
              />
            </label>
            <button
              className="button secondary"
              disabled={!canDraw || !s.strokes.length || Date.now() - lastSent.current < 300}
              onClick={() => {
                lastSent.current = Date.now();
                onAction({ type: 'CLEAR' });
              }}
            >
              {t('Limpiar lienzo')}
            </button>
          </div>
          <p>
            {t(
              'Levanta el puntero para compartir el trazo. Máximo ciento veinte trazos por dibujo.',
            )}
          </p>
        </>
      )}
      <canvas
        ref={canvas}
        width={800}
        height={500}
        className={`drawing-canvas ${canDraw ? 'active' : ''}`}
        role="img"
        aria-label={t('Lienzo compartido del dibujo actual')}
        onPointerDown={(e) => {
          if (!canDraw || s.strokes.length >= 120 || Date.now() - lastSent.current < 300) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          path.current = [point(e)];
          setDraft({ points: [...path.current], color, width });
        }}
        onPointerMove={(e) => {
          if (!path.current.length || !canDraw) return;
          path.current.push(point(e));
          if (path.current.length > 48)
            path.current = path.current.filter(
              (_p, i) => i % 2 === 0 || i === path.current.length - 1,
            );
          setDraft({ points: [...path.current], color, width });
        }}
        onPointerUp={finish}
        onPointerCancel={() => {
          path.current = [];
          setDraft(null);
        }}
      >
        {t('Usa las herramientas de coordenadas como alternativa a dibujar con gestos.')}
      </canvas>
      {drawer && s.phase === 'draw' && (
        <details>
          <summary>{t('Dibujar mediante coordenadas y teclado')}</summary>
          <form
            className="drawing-coordinates"
            onSubmit={(e) => {
              e.preventDefault();
              if (coords.every((n) => Number.isInteger(n) && n >= 0 && n <= 1000))
                send(coordinateStroke());
            }}
          >
            <label>
              {t('Forma')}
              <select value={shape} onChange={(e) => setShape(e.target.value)}>
                <option value="line">{t('Línea')}</option>
                <option value="rectangle">{t('Rectángulo')}</option>
                <option value="ellipse">{t('Elipse')}</option>
              </select>
            </label>
            {['X1', 'Y1', 'X2', 'Y2'].map((label, i) => (
              <label key={label}>
                {label}
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={coords[i]}
                  onChange={(e) =>
                    setCoords(coords.map((n, j) => (i === j ? Number(e.target.value) : n)))
                  }
                />
              </label>
            ))}
            <button
              className="button secondary"
              disabled={!canDraw || s.strokes.length >= 120 || Date.now() - lastSent.current < 300}
            >
              {t('Añadir forma')}
            </button>
          </form>
          <p>
            {t('Coordenadas de cero a mil. La goma blanca permite corregir partes del dibujo.')}
          </p>
        </details>
      )}
      <section className="drawing-guesses" aria-label={t('Respuestas de esta ronda')}>
        <ul>
          {s.guesses.map((guess, i) => (
            <li key={i}>
              <strong>{name(guess.playerId)}:</strong> {guess.correct ? t('¡Acierto!') : guess.text}
            </li>
          ))}
        </ul>
      </section>
      {drawer && s.phase === 'review' && (
        <button
          className="button primary"
          disabled={busy}
          onClick={() => onAction({ type: 'NEXT' })}
        >
          {t('Siguiente dibujo')}
        </button>
      )}
    </BoardFrame>
  );
}
