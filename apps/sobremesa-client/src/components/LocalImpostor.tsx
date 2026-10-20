import { useEffect, useState } from 'react';
import {
  GAME_SETTINGS,
  ImpostorEngine,
  type ImpostorState,
  type ImpostorPublicState,
  type ImpostorAction,
} from 'sobremesa-logic';
import { t, useLocale, LanguageSelector } from '../i18n';
import { PhysicalImpostorControls } from './ImpostorBoard';
import { Modal } from '../ui/Modal';
import '../styles/impostor-physical.css';
const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
function RoleHandoff({
  view,
  name,
  onPass,
}: {
  view: ImpostorPublicState;
  name: string;
  onPass: () => void;
}) {
  const [reveal, setReveal] = useState(false),
    { locale } = useLocale();
  useEffect(() => {
    const hide = () => setReveal(false);
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', hide);
    window.addEventListener('blur', hide);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('blur', hide);
    };
  }, []);
  return (
    <section className="neutral-handoff">
      <h2>{t('Entrega el móvil a {0}', { '0': name })}</h2>
      {reveal ? (
        <>
          <div className="local-secret" role="status">
            <strong>{t(view.isImpostor ? 'Eres el impostor' : 'Eres inocente')}</strong>
            <p>
              {view.isImpostor
                ? t('No conoces la palabra. Escucha las pistas y disimula.')
                : view.word?.[locale]}
            </p>
            {view.category && (
              <p>
                {t('Categoría')}: {t(view.category)}
              </p>
            )}
          </div>
          <button
            className="button primary"
            onClick={() => {
              setReveal(false);
              onPass();
            }}
          >
            {t('Ocultar y pasar al siguiente')}
          </button>
        </>
      ) : (
        <>
          <p>{t('Pantalla neutral: comprueba que solo tú puedes verla.')}</p>
          <button className="button primary" onClick={() => setReveal(true)}>
            {t('Ver mi papel')}
          </button>
        </>
      )}
    </section>
  );
}
export function LocalImpostor({ onLeave }: { onLeave: () => void }) {
  const [engine] = useState(() => new ImpostorEngine(random)),
    [count, setCount] = useState(5),
    [names, setNames] = useState(() =>
      Array.from({ length: 10 }, (_, i) => t('Jugador {0}', { '0': i + 1 })),
    ),
    [options, setOptions] = useState<Record<string, number | boolean>>({
      clueRounds: 2,
      showCategory: true,
      wordCategory: 0,
    }),
    [match, setMatch] = useState<ImpostorState | null>(null),
    [handoff, setHandoff] = useState(0),
    [round, setRound] = useState(0),
    [confirmLeave, setConfirmLeave] = useState(false),
    cleaned = names.slice(0, count).map((n) =>
      n
        .normalize('NFC')
        .replace(/[\p{Cc}\p{Cf}]/gu, '')
        .trim()
        .slice(0, 24),
    ),
    valid =
      cleaned.every(Boolean) && new Set(cleaned.map((n) => n.toLocaleLowerCase())).size === count,
    settings = GAME_SETTINGS.impostor.filter((setting) =>
      ['clueRounds', 'showCategory', 'wordCategory'].includes(setting.key),
    ),
    begin = () => {
      if (!valid) return;
      engine.setRules({ ...options, impostorMode: 1, physicalVoting: 1 });
      setMatch(
        engine.initGame(
          cleaned.map((name, i) => ({ id: `local_${i}`, isBot: false, isHost: i === 0, name })),
        ),
      );
      setHandoff(0);
      setRound((r) => r + 1);
    },
    act = (action: ImpostorAction) => {
      if (match) setMatch(engine.applyAction(match, match.currentTurnPlayerId, action));
    };
  return (
    <main id="main" className="local-impostor">
      <nav>
        <button
          className="button secondary"
          onClick={() => (match ? setConfirmLeave(true) : onLeave())}
        >
          {t('Volver al catálogo')}
        </button>
        <LanguageSelector />
      </nav>
      <h1>{t('Impostor presencial · un móvil')}</h1>
      {!match ? (
        <>
          <p>
            {t(
              'Los papeles solo se conservan durante esta partida en el dispositivo. No se crea una sala ni participantes conectados.',
            )}
          </p>
          <label>
            {t('Número de participantes')}
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="local-names">
            {names.slice(0, count).map((name, i) => (
              <label key={i}>
                {t('Nombre de la persona {0}', { '0': i + 1 })}
                <input
                  value={name}
                  maxLength={24}
                  onChange={(e) => setNames(names.map((n, j) => (i === j ? e.target.value : n)))}
                />
              </label>
            ))}
          </div>
          <fieldset>
            <legend>{t('Configuración de la ronda')}</legend>
            {settings.map((setting) =>
              typeof setting.defaultValue === 'boolean' ? (
                <label key={setting.key}>
                  <span>{t(setting.label)}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(options[setting.key])}
                    onChange={(e) => setOptions({ ...options, [setting.key]: e.target.checked })}
                  />
                </label>
              ) : (
                <label key={setting.key}>
                  {t(setting.label)}
                  <select
                    value={Number(options[setting.key])}
                    onChange={(e) =>
                      setOptions({ ...options, [setting.key]: Number(e.target.value) })
                    }
                  >
                    {setting.values!.map((value, i) => (
                      <option value={value} key={value}>
                        {setting.labels ? t(setting.labels[i]) : value}
                      </option>
                    ))}
                  </select>
                </label>
              ),
            )}
          </fieldset>
          {!valid && <p role="status">{t('Usa nombres distintos y no dejes ninguno vacío.')}</p>}
          <button className="button primary" disabled={!valid} onClick={begin}>
            {t('Comenzar ronda presencial')}
          </button>
        </>
      ) : handoff < match.players.length ? (
        confirmLeave ? (
          <section className="neutral-handoff">
            <p>{t('Pantalla neutral: comprueba que solo tú puedes verla.')}</p>
          </section>
        ) : (
          <RoleHandoff
            key={`${round}:${handoff}`}
            name={match.players[handoff].name ?? ''}
            view={engine.getSanitizedState(match, match.players[handoff].id)}
            onPass={() => setHandoff((i) => i + 1)}
          />
        )
      ) : match.phase === 'result' ? (
        <section>
          <h2>
            {t(
              match.outcome === 'caught'
                ? 'Los inocentes descubrieron al impostor.'
                : match.outcome === 'guessed'
                  ? 'El impostor adivinó la palabra.'
                  : 'El impostor escapó.',
            )}
          </h2>
          <p>
            {t('Impostor: {0}', {
              '0': match.players.find((p) => p.id === match.impostorId)?.name ?? '',
            })}
          </p>
          <LocalWord word={match.secret} />
          {match.physicalCounts && (
            <ul>
              {match.players.map((p) => (
                <li key={p.id}>
                  {p.name}: {match.physicalCounts![p.id] ?? 0}
                </li>
              ))}
            </ul>
          )}
          <div className="board-actions">
            <button className="button primary" onClick={begin}>
              {t('Otra ronda')}
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setMatch(null);
                setHandoff(0);
              }}
            >
              {t('Cambiar participantes y opciones')}
            </button>
          </div>
        </section>
      ) : (
        <>
          <p>{t('Deja el móvil sobre la mesa. Las pistas y el debate se hacen en voz alta.')}</p>
          <PhysicalImpostorControls
            state={engine.getSanitizedState(match, match.currentTurnPlayerId)}
            myPlayerId={match.currentTurnPlayerId}
            onAction={act}
          />
        </>
      )}
      {confirmLeave && (
        <Modal title={t('Salir de la partida local')} onClose={() => setConfirmLeave(false)}>
          <p>{t('Los papeles y el estado de esta ronda se perderán.')}</p>
          <div className="board-actions">
            <button className="button secondary" onClick={() => setConfirmLeave(false)}>
              {t('Cancelar')}
            </button>
            <button
              className="button primary"
              onClick={() => {
                setMatch(null);
                onLeave();
              }}
            >
              {t('Salir de la partida local')}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
function LocalWord({ word }: { word: { es: string; en: string } }) {
  const { locale } = useLocale();
  return <p>{t('Palabra secreta: {0}', { '0': word[locale] })}</p>;
}
