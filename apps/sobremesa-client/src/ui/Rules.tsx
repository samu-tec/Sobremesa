import { getGame, formatMoney, t } from '../i18n';
import { type RoomInfo, type GameType } from 'sobremesa-logic';
import { Lightbulb } from 'lucide-react';
import { Modal } from './Modal';
export function Rules({
  gameType,
  onClose,
  room,
}: {
  gameType: GameType;
  onClose: () => void;
  room?: RoomInfo;
}) {
  const game = getGame(gameType);
  return (
    <Modal title={t('Cómo jugar · {0}', { '0': game.name })} onClose={onClose}>
      <p className="muted">
        {game.minPlayers}–{game.maxPlayers} {t('jugadores ·')} {game.duration}
      </p>
      {room && (
        <section className="rules-room-summary">
          <h3>{t('Opciones de esta partida')}</h3>
          <p>
            {t('Tiempo por turno')}: {room.turnSeconds} s
          </p>
          {room.gameType === 'colorclash' && (
            <p>
              {t('Cartas iniciales')}: {room.customRules?.startingCards ?? 7}
            </p>
          )}
          {room.gameType === 'monopoly' && (
            <>
              <p>
                {t('Dinero inicial')}: {formatMoney(room.customRules.startingCash)} ·{' '}
                {t('Salario al pasar por Salida')}: {formatMoney(room.customRules.salaryGO)} ·{' '}
                {t('Límite de rondas')}:{' '}
                {room.customRules.maxRounds == null ? t('Sin límite') : room.customRules.maxRounds}
              </p>
              {[
                ['auctionEnabled', 'Subastar propiedades rechazadas'],
                ['freeParkingPool', 'Acumular impuestos en el descanso'],
                ['doubleGoSalary', 'Cobrar el doble al caer en Salida'],
                ['rentInJail', 'Cobrar alquiler estando en la cárcel'],
                ['evenBuilding', 'Construcción equilibrada'],
              ].map(([key, label]) => (
                <p key={key}>
                  {t(label)}: {t(room.customRules[key] ? 'Sí' : 'No')}
                </p>
              ))}
              <p>
                {t('Multa para salir de la cárcel')}: {formatMoney(room.customRules.jailFine)} ·{' '}
                {t('Intentos para salir con dobles')}: {room.customRules.maxJailTurns}
              </p>
            </>
          )}
          <p>
            {t(
              'Las opciones de la sala prevalecen sobre los valores predeterminados de las reglas.',
            )}
          </p>
          <p>
            {t(
              'Al agotarse el tiempo de turno, se completa una jugada automática. Las subastas duran 15 segundos y cada nueva puja reinicia el contador.',
            )}
          </p>
        </section>
      )}
      <ol className="rules-list">
        {game.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ol>
      <div className="tip">
        <Lightbulb size={20} />
        <p>{game.tip}</p>
      </div>
      <button className="button primary full" onClick={onClose}>
        {t('¡Entendido, a jugar!')}{' '}
      </button>
    </Modal>
  );
}
