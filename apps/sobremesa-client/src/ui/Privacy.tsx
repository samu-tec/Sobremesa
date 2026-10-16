import { LanguageSelector, t, useLocale } from '../i18n';
import { ArrowLeft } from 'lucide-react';
const copy = {
  es: [
    {
      heading: 'Privacidad y uso',
      paragraphs: [
        'Puedes jugar sin crear una cuenta. El dinero de las partidas es ficticio: aquí no hay apuestas ni premios económicos. La aplicación no lleva publicidad ni analítica de terceros y no guarda un historial de las partidas terminadas.',
      ],
    },
    {
      heading: 'Quién responde y cómo contactar',
      paragraphs: [
        'El responsable del tratamiento es Samuel Ciocan, en España. Para preguntar por tus datos o ejercer tus derechos, escribe a contacto@samuelciocan.com.',
      ],
    },
    {
      heading: 'Qué datos hacen falta para jugar',
      paragraphs: [
        'Usamos el apodo que eliges, un identificador opaco derivado de un secreto aleatorio de sesión y la información necesaria para mantener la sala y la partida. No hace falta dar el nombre real, el correo ni la fecha de nacimiento.',
        'La dirección IP se procesa temporalmente en memoria para limitar conexiones y creación abusiva de salas. No se usa para crear perfiles.',
        'Tratamos los datos de la partida para prestarte el servicio que has solicitado (art. 6.1.b del RGPD). Para limitar abusos nos basamos en nuestro interés legítimo de proteger el servicio (art. 6.1.f).',
      ],
    },
    {
      heading: 'Qué guarda el servidor y durante cuánto tiempo',
      paragraphs: [
        'La aplicación no tiene cuentas, base de datos de perfiles ni historial de partidas. El estado de las salas y los datos de juego se mantienen en la memoria RAM mientras hacen falta; la aplicación no los escribe en sus propios archivos. Reiniciar el servidor borra ese estado temporal.',
        'Una sala se elimina cuando se va la última persona o tras seis horas sin actividad humana. Si se corta tu conexión, reservamos tu sitio durante cinco minutos por defecto; quien administra el servidor puede cambiar ese plazo.',
        'Para limitar conexiones, la IP se mantiene mientras la conexión está activa y hasta que vence su ventana de control. Los contadores de creación de salas caducan al terminar su ventana —un minuto por defecto— y se purgan en un barrido periódico, como máximo en el siguiente barrido de un minuto. El alojamiento o Cloudflare pueden guardar registros técnicos por su cuenta; cuánto tiempo y qué datos depende de la configuración y de sus condiciones.',
      ],
    },
    {
      heading: 'Qué queda en tu navegador',
      paragraphs: [
        'El apodo, la confirmación del perfil, el idioma y los favoritos se guardan en el navegador hasta que los borres. Para que puedas volver a una partida, sessionStorage conserva en esa pestaña un secreto de sesión, su identificador y el código de sala. El secreto se envía al servidor para reconocer la sesión, pero no se muestra a los demás jugadores.',
        'Algunos navegadores copian datos de sesión al duplicar una pestaña. Sobremesa comprueba entre pestañas del mismo navegador si comparten sesión y te avisa antes de sustituir una conexión. Esa comprobación intercambia temporalmente una huella derivada del secreto entre pestañas; no se guarda ni se envía al servidor. Si abres una invitación distinta y no hay otra pestaña activa, se inicia una sesión nueva para que puedas entrar con ese enlace.',
        'El botón de esta página borra el apodo y las preferencias guardadas en este navegador. Si borras los datos de sesión mientras juegas, no podremos recuperar ese sitio.',
      ],
    },
    {
      heading: 'Quién puede ver la partida',
      paragraphs: [
        'Quienes tienen el código de la sala pueden ver tu apodo y el estado público de la partida. Las cartas privadas solo se envían a su dueño. No compartas el código con personas que no quieras invitar.',
        'El alojamiento y Cloudflare también pueden tratar datos técnicos para conectar y proteger el servicio. La red de Cloudflare es global, así que algunos datos podrían tratarse fuera del Espacio Económico Europeo bajo las garantías que describe en sus condiciones. Sus registros y plazos dependen de la configuración y del servicio; abajo tienes sus avisos de privacidad y tratamiento de datos. Sobremesa no vende tus datos.',
      ],
    },
    {
      heading: 'Tus derechos',
      paragraphs: [
        'Puedes solicitar acceso, rectificación, supresión, limitación u oposición cuando corresponda. La portabilidad se aplica en los casos previstos por la ley. Como los datos de una sala caducan y no hay cuentas ni historial permanente, puede que ya no quede información que localizar cuando recibamos tu solicitud.',
        'Para ayudarnos a encontrar una partida activa, indica tu apodo, el juego y una hora aproximada. No envíes el secreto de sesión ni el enlace o código de invitación. Responderemos dentro del plazo legal, normalmente un mes; si la ley permite ampliarlo, te lo comunicaremos. También puedes reclamar ante la Agencia Española de Protección de Datos.',
      ],
    },
    {
      heading: 'Unas normas para jugar',
      paragraphs: [
        'Trata bien a las demás personas y no pongas información sensible en tu apodo. Sobremesa está hecha para jugar y compartir un rato. Sus diseños y reglas son propios; no está afiliada a las marcas de otros juegos. Algunos términos de búsqueda solo sirven para que encuentres la variante de juego correspondiente.',
      ],
    },
  ],
  en: [
    {
      heading: 'Privacy and use',
      paragraphs: [
        'You can play without creating an account. Game money is fictional, with no wagers or cash prizes. The app has no advertising or third-party analytics, and it does not keep a history of completed games.',
      ],
    },
    {
      heading: 'Who is responsible and how to get in touch',
      paragraphs: [
        'The data controller is Samuel Ciocan, based in Spain. For questions about your data or to exercise your rights, email contacto@samuelciocan.com.',
      ],
    },
    {
      heading: 'What we need to run a game',
      paragraphs: [
        'We use the nickname you choose, an opaque identifier derived from a random session secret, and the information needed to run your room and game. You do not need to provide your real name, email address or date of birth.',
        'Your IP address is temporarily processed in memory to limit excessive connections and room creation. It is not used to build profiles.',
        'We process game data to provide the service you asked for (GDPR Article 6(1)(b)). Abuse limits rely on our legitimate interest in protecting the service (Article 6(1)(f)).',
      ],
    },
    {
      heading: 'Server storage and retention',
      paragraphs: [
        'The app has no accounts, profile database or game history. Room state and game data stay in RAM while they are needed; the app does not write them to its own files. Restarting the server clears this temporary state.',
        'A room is deleted when the last person leaves or after six hours without human activity. If your connection drops, your seat is held for five minutes by default; the server administrator can change that period.',
        'For connection limits, an IP entry remains while the connection is active and until its control window expires. Room-creation counters expire at the end of their window — one minute by default — and are cleared in a periodic sweep, no later than the next one-minute sweep. Your host or Cloudflare may keep separate technical logs; their contents and retention depend on service settings and terms.',
      ],
    },
    {
      heading: 'What stays in your browser',
      paragraphs: [
        'Your nickname, profile confirmation, language and favourites stay in your browser until you delete them. To let you return to a game, sessionStorage keeps a session secret, its identifier and the room code in that tab. The secret is sent to the server to recognise your session, but is never shown to other players.',
        'Some browsers copy session data when you duplicate a tab. Sobremesa checks whether tabs in the same browser share a session and warns you before replacing a connection. That check briefly exchanges a fingerprint derived from the secret between tabs; it is not saved or sent to the server. If you open a different invitation and no other active tab is found, a new guest session starts so you can use that link.',
        'The button on this page clears your nickname and saved preferences from this browser. If you clear session data while playing, we cannot restore your seat.',
      ],
    },
    {
      heading: 'Who can see the game',
      paragraphs: [
        'People with the room code can see your nickname and the public game state. Private cards are sent only to their owner. Do not share the code with anyone you do not want to invite.',
        'Your host and Cloudflare may also process technical data to connect and protect the service. Cloudflare operates a global network, so some data may be processed outside the European Economic Area under the safeguards described in its terms. Its logs and retention depend on configuration and service terms; links to its privacy and data-processing terms are below. Sobremesa does not sell your data.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        'You can request access, correction, erasure, restriction or object to processing where applicable. Data portability applies in the cases set out by law. Room data expires and there are no accounts or permanent history, so information may no longer be available when a request reaches us.',
        'To help us find an active game, include your nickname, the game and an approximate time. Do not send your session secret or invitation link/code. We will reply within the legal time limit, normally one month; if an extension is allowed, we will let you know. You can also complain to the Spanish Data Protection Agency.',
      ],
    },
    {
      heading: 'A few ground rules',
      paragraphs: [
        'Treat other players kindly and keep sensitive information out of your nickname. Sobremesa is made for sharing a game and some time together. Its designs and rules are original; it is not affiliated with other game brands. Some search terms simply help you find the corresponding game variant.',
      ],
    },
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
        {copy[locale].map(({ heading, paragraphs }, index) => (
          <section key={heading}>
            {index === 0 ? <h1>{heading}</h1> : <h2>{heading}</h2>}
            {paragraphs.map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex}>{paragraph}</p>
            ))}
          </section>
        ))}
        <p>
          <a href="mailto:contacto@samuelciocan.com">contacto@samuelciocan.com</a> ·{' '}
          <a
            href={
              locale === 'es'
                ? 'https://www.aepd.es/derechos-y-deberes/ejerce-tus-derechos'
                : 'https://www.aepd.es/en/rights-and-duties/know-your-rights'
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            {locale === 'es' ? 'AEPD: tus derechos' : 'AEPD: your rights'}
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
