import { t, useLocale } from '../i18n';
import { PreferencesButton } from './Preferences';
import { ArrowLeft } from 'lucide-react';
const copy = {
  es: [
    {
      heading: 'Privacidad y uso',
      paragraphs: [
        'Puedes jugar sin crear una cuenta. El dinero de las partidas es ficticio: aquí no hay apuestas ni premios económicos. El servicio es gratuito y no incluye pagos. La aplicación no lleva publicidad ni analítica de terceros, no genera registros de acceso y no guarda un historial de las partidas terminadas.',
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
        'El autoplay conserva temporalmente en RAM quién ha dejado vencer su turno o se ha desconectado, y sus plazos de revisión. No registra foco, pestañas ni un historial de actividad. Al vencer un turno ordinario, solo el jugador activo recibe una confirmación privada de 20 segundos; puede continuar una vez y la partida volverá al autoplay si no realiza una acción. Una persona conectada puede pulsar «Volver a jugar» desde su sesión vigente, incluso fuera de turno. El anfitrión puede revisar una ausencia tras tres minutos. Si se trata de inactividad por turno, la retirada automática se aplica al terminar el minuto de revisión; si es una desconexión, también respeta el plazo de recuperación configurado.',
        'El plazo de recuperación se puede configurar y es de cinco minutos por defecto. En la sala de espera, la plaza se conserva durante ese plazo. Durante una partida, la posibilidad de volver depende de que la plaza siga en la sala: el anfitrión puede retirar de inmediato a quien siga desconectado, y una retirada definitiva impide recuperar la plaza con la sesión anterior. Una sala se elimina cuando se va la última persona o tras seis horas sin actividad humana.',
        'Para limitar conexiones, la IP se mantiene mientras la conexión está activa y hasta que vence su ventana de control. Los contadores de creación de salas caducan al terminar su ventana —un minuto por defecto— y se purgan en un barrido periódico, como máximo en el siguiente barrido de un minuto. La web funciona en un servidor propio, expuesto mediante Cloudflare Tunnel. Sobremesa no genera registros de acceso. Cloudflare puede tratar datos técnicos conforme a la configuración del servicio y sus condiciones.',
      ],
    },
    {
      heading: 'Qué queda en tu navegador',
      paragraphs: [
        'El apodo, la confirmación del perfil, el idioma, los favoritos y tus preferencias de sonido (activación y volumen) se guardan en el navegador hasta que los borres. Para que puedas volver a una partida, sessionStorage conserva en esa pestaña un secreto de sesión, su identificador y el código de sala. El secreto se envía al servidor para reconocer la sesión, pero no se muestra a los demás jugadores. Las notas de Misterio también se guardan solo en sessionStorage, asociadas a tu jugador, sala y partida; no se envían al servidor y se descartan al cambiar de partida o salir.',
        'Algunos navegadores copian datos de sesión al duplicar una pestaña. Sobremesa comprueba entre pestañas del mismo navegador si comparten sesión y te avisa antes de sustituir una conexión. Esa comprobación intercambia temporalmente una huella derivada del secreto entre pestañas; no se guarda ni se envía al servidor. Si abres una invitación distinta y no hay otra pestaña activa, se inicia una sesión nueva para que puedas entrar con ese enlace.',
        'El botón de esta página borra el apodo y las preferencias guardadas en este navegador. Si borras los datos de sesión mientras juegas, no podremos recuperar ese sitio.',
      ],
    },
    {
      heading: 'Quién puede ver la partida',
      paragraphs: [
        'Quienes tienen el código de la sala pueden ver tu apodo y el estado público de la partida. Las cartas privadas solo se envían a su dueño. No compartas el código con personas que no quieras invitar.',
        'La web se aloja en un servidor propio y utiliza Cloudflare Tunnel para conectarlo a Internet. Cloudflare también puede tratar datos técnicos para conectar y proteger el servicio. La red de Cloudflare es global, así que algunos datos podrían tratarse fuera del Espacio Económico Europeo bajo las garantías que describe en sus condiciones. Sus registros y plazos dependen de la configuración y del servicio; abajo tienes sus avisos de privacidad y tratamiento de datos. Sobremesa no vende tus datos.',
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
      heading: 'Código y recursos',
      paragraphs: [
        'El código propio de Sobremesa tiene derechos reservados. Modificarlo, reutilizarlo o redistribuirlo requiere autorización previa por escrito, salvo los derechos de la plataforma y los usos legalmente permitidos. Las dependencias de terceros conservan sus propias licencias. Jugar en esta web no concede derechos adicionales sobre el código o sus recursos.',
      ],
    },
    {
      heading: 'Unas normas para jugar',
      paragraphs: [
        'Trata bien a las demás personas y no pongas información sensible en tu apodo. Sobremesa está hecha para jugar y compartir un rato. Ofrece variantes de juegos de mesa y no está afiliada a las marcas de otros juegos.',
      ],
    },
  ],
  en: [
    {
      heading: 'Privacy and use',
      paragraphs: [
        'You can play without creating an account. Game money is fictional, with no wagers or cash prizes. The service is free and includes no payments. The app has no advertising or third-party analytics, does not generate access logs and does not keep a history of completed games.',
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
        'Autoplay temporarily keeps in RAM who let a turn expire or disconnected, along with review deadlines. It does not track focus, tabs or an activity history. When an ordinary turn expires, only the active player receives a private 20-second prompt and may continue once. A connected person can press “Resume playing” from their current session, even when it is not their turn. The host can review an absence after three minutes. For turn inactivity, automatic removal follows the one-minute review; for a disconnection, it also respects the configured recovery period.',
        'The recovery period is configurable and defaults to five minutes. In the waiting room, a seat is kept for that period. During a game, the chance to return depends on whether the seat is still in the room: the host can immediately remove someone who remains disconnected, and permanent removal means the previous session cannot recover that seat. A room is deleted when the last person leaves or after six hours without human activity.',
        'For connection limits, an IP entry remains while the connection is active and until its control window expires. Room-creation counters expire at the end of their window — one minute by default — and are cleared in a periodic sweep, no later than the next one-minute sweep. The website runs on a self-hosted server exposed through Cloudflare Tunnel. Sobremesa does not generate access logs. Cloudflare may process technical data according to service settings and terms.',
      ],
    },
    {
      heading: 'What stays in your browser',
      paragraphs: [
        'Your nickname, profile confirmation, language, favourites and sound preferences (enabled state and volume) stay in your browser until you delete them. To let you return to a game, sessionStorage keeps a session secret, its identifier and the room code in that tab. The secret is sent to the server to recognise your session, but is never shown to other players. Mystery notes are also saved only in sessionStorage, associated with your player, room and match; they are not sent to the server and are discarded when you leave or start another match.',
        'Some browsers copy session data when you duplicate a tab. Sobremesa checks whether tabs in the same browser share a session and warns you before replacing a connection. That check briefly exchanges a fingerprint derived from the secret between tabs; it is not saved or sent to the server. If you open a different invitation and no other active tab is found, a new guest session starts so you can use that link.',
        'The button on this page clears your nickname and saved preferences from this browser. If you clear session data while playing, we cannot restore your seat.',
      ],
    },
    {
      heading: 'Who can see the game',
      paragraphs: [
        'People with the room code can see your nickname and the public game state. Private cards are sent only to their owner. Do not share the code with anyone you do not want to invite.',
        'The website runs on a self-hosted server connected to the Internet through Cloudflare Tunnel. Cloudflare may also process technical data to connect and protect the service. Cloudflare operates a global network, so some data may be processed outside the European Economic Area under the safeguards described in its terms. Its logs and retention depend on configuration and service terms; links to its privacy and data-processing terms are below. Sobremesa does not sell your data.',
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
      heading: 'Code and assets',
      paragraphs: [
        'Sobremesa’s own code is published with all rights reserved. Modification, reuse or redistribution requires prior written permission, subject to platform rights and uses permitted by law. Third-party dependencies retain their own licences. Playing on this website grants no additional rights to the code or its assets.',
      ],
    },
    {
      heading: 'A few ground rules',
      paragraphs: [
        'Treat other players kindly and keep sensitive information out of your nickname. Sobremesa is made for sharing a game and some time together. It offers board game variants and is not affiliated with other game brands.',
      ],
    },
  ],
};
export function Privacy() {
  const { locale } = useLocale();
  const clear = () => {
    for (const key of ['name', 'profileConfirmed', 'locale', 'favorites', 'sound']) {
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
        <div className="header-actions">
          <PreferencesButton />
        </div>
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
        <p>
          <a href="/license.txt" target="_blank" rel="noopener noreferrer">
            {locale === 'es' ? 'Condiciones del código fuente' : 'Source code terms'}
          </a>
        </p>
        <p>
          <a href="/third-party-notices.txt" target="_blank" rel="noopener noreferrer">
            {locale === 'es'
              ? 'Licencias del software de terceros'
              : 'Third-party software licenses'}
          </a>
        </p>
      </main>
    </div>
  );
}
