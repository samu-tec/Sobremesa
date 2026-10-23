import { getGame, formatMoney, t, settingValue } from '../i18n';
import { type RoomInfo, type GameType, GAME_SETTINGS } from 'sobremesa-logic';
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
          {(GAME_SETTINGS[room.gameType] || []).map((setting) => {
            const value = room.customRules?.[setting.key] ?? setting.defaultValue;
            return (
              <p key={setting.key}>
                {t(setting.label)}: <strong>{settingValue(setting, value)}</strong>
              </p>
            );
          })}
          {room.gameType === 'monopoly' && (
            <>
              <p>
                {t('Dinero inicial')}: {formatMoney(room.customRules?.startingCash ?? 1500)} ·{' '}
                {t('Salario al pasar por Salida')}: {formatMoney(room.customRules?.salaryGO ?? 200)}{' '}
                · {t('Límite de rondas')}:{' '}
                {room.customRules?.maxRounds == null
                  ? t('Sin límite')
                  : room.customRules?.maxRounds}
              </p>
              {[
                ['auctionEnabled', 'Subastar propiedades rechazadas'],
                ['freeParkingPool', 'Acumular impuestos en el descanso'],
                ['doubleGoSalary', 'Cobrar el doble al caer en Salida'],
                ['doubleGoSalaryOnPass', 'Cobrar el doble al pasar por Salida'],
                ['snakeEyesBonus', 'Recibir 500 € al sacar dobles de uno'],
                ['rentInJail', 'Cobrar alquiler estando en la cárcel'],
                ['evenBuilding', 'Construcción equilibrada'],
              ].map(([key, label]) => (
                <p key={key}>
                  {t(label)}: {t(room.customRules?.[key] ? 'Sí' : 'No')}
                </p>
              ))}
              <p>
                {t('Multa para salir de la cárcel')}:{' '}
                {formatMoney(room.customRules?.jailFine ?? 50)} ·{' '}
                {t('Intentos para salir con dobles')}: {room.customRules?.maxJailTurns}
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
              'Si vence un turno humano ordinario, recibirás una confirmación privada de 20 segundos. Si no respondes, el bot jugará con la estrategia normal. También se activa al desconectarte. Tras 3 minutos de ausencia, el anfitrión puede mantener tu plaza como bot o retirarte; si no decide durante el minuto siguiente, se aplica la política correspondiente. Los plazos propios de las reglas se mantienen.',
            )}
          </p>
          {room.gameType === 'monopoly' && (
            <p>{t('Las subastas duran 15 segundos. Cada nueva puja reinicia el contador.')}</p>
          )}
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
