import { LanguageSelector, t, useLocale } from '../i18n';
import { ArrowLeft } from 'lucide-react';
const copy = {
  es: [
    [
      'Privacidad y uso',
      'Sobremesa es una web de juegos de mesa. No necesitas crear una cuenta. Puedes usar un apodo y el dinero de las partidas es ficticio. No hay apuestas, pagos, publicidad ni analítica de terceros en esta versión.',
    ],
    [
      'Responsable y contacto',
      'Samuel Ciocan · España. Para consultas de privacidad o comunicar problemas: contacto@samuelciocan.com.',
    ],
    [
      'Qué datos se utilizan',
      'Tu apodo y un identificador aleatorio permiten asignarte un sitio, mostrar las jugadas a los participantes de la sala y recuperar la conexión. El servidor mantiene las salas y partidas en memoria; no hay una base de datos de perfiles. Tu dirección IP se trata temporalmente para gestionar conexiones y limitar abusos. No pedimos correo, fecha de nacimiento ni nombre real para jugar.',
    ],
    [
      'Para qué y durante cuánto tiempo',
      'La base para prestar la partida es la ejecución del servicio de juego que solicitas (art. 6.1.b RGPD). Para prevenir abusos, la base es el interés legítimo en proteger el servicio (art. 6.1.f RGPD). La reserva de reconexión dura tres minutos por defecto, configurable por el administrador. Las salas se eliminan cuando se marcha el último participante humano o tras 30 minutos sin actividad humana. Los contadores técnicos de conexión se limpian periódicamente cuando dejan de ser necesarios. Un reinicio del servidor elimina las partidas. No se realizan perfiles publicitarios ni decisiones con efectos jurídicos.',
    ],
    [
      'Almacenamiento en tu navegador',
      'Guardamos el nombre, la confirmación del perfil, el idioma y tus favoritos en localStorage. sessionStorage guarda el secreto de tu sesión, tu identificador y el código de sala para la reconexión en esa pestaña. Las preferencias duran hasta que las borres; los datos de sesión dependen del cierre o restauración de la pestaña por tu navegador. Solo se usa almacenamiento funcional. Puedes borrar las preferencias con el botón de esta página o desde la configuración del navegador. Borrar una sesión durante una partida impide recuperarla.',
    ],
    [
      'Quién puede verlos',
      'Los participantes con el código de tu sala ven tu apodo y el estado público del juego; las cartas privadas solo se envían a su dueño. No compartas el código con desconocidos. El secreto de reconexión nunca se muestra en la sala. El alojamiento y, al acceder por el dominio público, Cloudflare pueden tratar datos técnicos necesarios para servir la web. No se venden datos. Cloudflare opera una red global; su política y acuerdo de tratamiento enlazados describen sus transferencias internacionales y garantías.',
    ],
    [
      'Tus derechos',
      'Puedes solicitar acceso, rectificación, supresión, limitación, portabilidad u oposición cuando correspondan escribiendo a contacto@samuelciocan.com. Para localizar una partida indica su código y tu apodo; no envíes el secreto de sesión. También puedes presentar una reclamación ante la Agencia Española de Protección de Datos en aepd.es.',
    ],
    [
      'Uso y juegos',
      'Respeta a las demás personas y evita apodos ofensivos o datos sensibles. Las partidas se ofrecen para entretenimiento, sin premios económicos. Sobremesa tiene diseño y recursos propios; no está afiliada a los titulares de otros juegos o marcas. Los nombres usados como términos de búsqueda solo ayudan a encontrar variantes. Las reglas de esta web, incluidas las opciones de la sala, describen cómo funciona cada juego.',
    ],
  ],
  en: [
    [
      'Privacy and use',
      'Sobremesa is a board game website. You don’t need an account. You can use a nickname and all game money is fictional. This version has no wagers, payments, advertising or third-party analytics.',
    ],
    [
      'Controller and contact',
      'Samuel Ciocan · Spain. For privacy enquiries or to report problems: contacto@samuelciocan.com.',
    ],
    [
      'Data we use',
      'Your nickname and a random identifier assign your seat, show moves to room participants and let you reconnect. The server holds rooms and games in memory; there is no profile database. Your IP address is temporarily processed to manage connections and limit abuse. We don’t ask for an email address, date of birth or real name to play.',
    ],
    [
      'Purpose and retention',
      'Providing the game you request is based on performance of the requested service (GDPR Article 6(1)(b)). Abuse prevention relies on our legitimate interest in protecting the service (Article 6(1)(f)). Reconnection reservations last three minutes by default, configurable by the administrator. Rooms are deleted when the last human leaves or after 30 minutes without human activity. Technical connection counters are periodically cleared once no longer needed. Restarting the server removes games. There is no advertising profiling or decision-making with legal effects.',
    ],
    [
      'Browser storage',
      'Your name, profile confirmation, language and favourites are saved in localStorage. sessionStorage holds your private session secret, player identifier and room code to reconnect within that tab. Preferences remain until you delete them; session data depends on how your browser closes or restores tabs. Only functional storage is used. Clear preferences with the button on this page or in your browser settings. Clearing a session during a game prevents recovery.',
    ],
    [
      'Who can see the data',
      'Participants with your room code see your nickname and the public game state; private cards are sent only to their owner. Don’t share your code with strangers. Your reconnection secret is never shown in the room. The hosting provider and, when using the public domain, Cloudflare may process technical data needed to serve the site. Data is not sold. Cloudflare operates a global network; its linked privacy policy and data processing terms describe international transfers and safeguards.',
    ],
    [
      'Your rights',
      'Where applicable, you may request access, rectification, erasure, restriction, portability or object by emailing contacto@samuelciocan.com. To identify a game, include its room code and your nickname; never send the session secret. You may also complain to the Spanish Data Protection Agency at aepd.es.',
    ],
    [
      'Use and games',
      'Respect other players and avoid offensive nicknames or sensitive information. Games are for entertainment without cash prizes. Sobremesa uses its own design and assets and is not affiliated with other game or trademark owners. Search terms simply help you find variants. This site’s rules, including room settings, describe how each game works.',
    ],
  ],
};
export function Privacy() {
  const { locale } = useLocale();
  const clear = () => {
    for (const key of ['name', 'profileConfirmed', 'locale', 'favorites']) {
      try {
        localStorage.removeItem(`sobremesa.${key}`);
      } catch {
        /* Storage may be disabled. */
      }
    }
    location.href = '/';
  };
  return (
    <div className="room-page">
      <header className="game-header">
        <a className="back-link" href="/">
          <ArrowLeft size={18} />
          {t('Volver a los juegos')}
        </a>
        <LanguageSelector />
      </header>
      <main className="privacy-content">
        {copy[locale].map(([heading, text], index) => (
          <section key={index}>
            {index === 0 ? <h1>{heading}</h1> : <h2>{heading}</h2>}
            <p>{text}</p>
          </section>
        ))}
        <p>
          <a href="mailto:contacto@samuelciocan.com">contacto@samuelciocan.com</a> ·{' '}
          <a href="https://www.aepd.es/" target="_blank" rel="noopener noreferrer">
            AEPD
          </a>{' '}
          ·{' '}
          <a
            href="https://www.cloudflare.com/privacypolicy/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Cloudflare
          </a>
        </p>
        <p>
          <a
            href="https://www.cloudflare.com/cloudflare-customer-dpa/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {locale === 'es'
              ? 'Acuerdo de tratamiento de Cloudflare'
              : 'Cloudflare data processing terms'}
          </a>
        </p>
        <button className="button secondary" onClick={clear}>
          {locale === 'es'
            ? 'Borrar mis preferencias de este navegador'
            : 'Clear my browser preferences'}
        </button>
      </main>
    </div>
  );
}
