# Arquitectura

Sobremesa utiliza un monorepositorio pnpm y una instancia autoritativa en memoria. No necesita `.env`, base de datos ni servicios adicionales para desarrollo o pruebas.

## Responsabilidades

| Capa               | Responsabilidad                                                                          | No debe contener                                                  |
| ------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `sobremesa-logic`  | Motores, acciones, proyecciones privadas, catálogo, opciones, mensajes y contrato de red | React, sockets activos, secretos de sesión o dependencias de Node |
| `sobremesa-server` | Autenticación, permisos, salas, reservas, límites, timers y transporte                   | Componentes React o decisiones del navegador sobre reglas         |
| `sobremesa-client` | Presentación, interacción, traducción y preferencias                                     | Autoridad sobre dados, manos, dinero o validación definitiva      |

Los estados de los motores son internos. Solo `getSanitizedState(state, playerId)` cruza la red. No se debe emitir un estado completo aunque un juego concreto parezca público: puede incorporar secretos después.

## Organización proporcionada

La estructura mínima de un juego es su motor, su tablero y sus pruebas dentro de cada capa. Sus tipos, componentes y operaciones de uso exclusivo pueden permanecer junto a su consumidor. Se separan responsabilidades sustanciales, reutilizadas o con pruebas y dependencias independientes, sin imponer un máximo de líneas ni una estructura idéntica a todos los juegos. Por ejemplo, el cálculo de alquileres se comparte entre motor e inspector, la animación controla su propio ciclo de vida y las ilustraciones pequeñas del catálogo conviven en un único módulo. [ADD_GAME.md](ADD_GAME.md) describe cómo ampliar esa estructura cuando haga falta.

## Registros estáticos y exhaustivos

`GameType` es la unión cerrada de identificadores estables. `GAME_DEFINITIONS` exige metadatos por identificador y que la clave coincida con `id`; `GAME_CATALOG` define el orden del catálogo en la interfaz. `GAME_SETTINGS` exige una declaración por juego, aunque sea `[]`. Ciudad Fortuna conserva su configuración económica especializada. Cambio de Color declara sus cartas iniciales en el mismo catálogo de ajustes que el resto.

`src/games/engines.ts` del servidor registra fábricas de motores con políticas tipadas mediante `defineGame`. Cada sala recibe una instancia nueva, con opciones independientes. Las políticas definen actor, fin del presupuesto de turno, necesidad de confirmación humana, acción conservadora para resoluciones automáticas, continuación de acciones parciales, vencimiento de subastas y elección del bot. El reloj, su cancelación y el máximo de cien acciones automáticas permanecen en `RoomManager`. La resolución del plazo está separada de su programación. Las acciones manuales, el inicio, el reinicio, el abandono, la configuración y la recuperación del estado, así como los callbacks de reloj, reserva de desconexión y bot, comparten el cierre seguro ante excepciones: se registra el juego y la operación, sin volcar errores que puedan contener información privada, y se cierra únicamente la sala afectada, cancelando sus tareas y avisando a sus miembros. No se reintenta un motor que podría haber mutado parcialmente su estado.

`GameBoard.tsx` registra las treinta vistas mediante `satisfies Record<GameType, …>` y `React.lazy`. React y los recursos gráficos permanecen en el cliente. No se descubren plugins en ejecución. Los adaptadores de tablero mantienen las conversiones de la unión pública a su estado concreto. En el servidor, `games/runtime.ts` agrupa las políticas, contratos y ejecución de cada partida; `createMatch` encapsula el motor, su estado y las políticas en una clausura genérica: `RoomManager` solo puede iniciar, actuar, resolver plazos, consultar resultados y pedir una proyección por destinatario. No puede cruzar estados y acciones de juegos distintos. La única conversión de acción desconocida está junto a `validateAction`; únicamente su validación positiva permite aplicar la acción. `RoomRules` conserva tipos de las opciones económicas y de cartas y valores escalares para el resto. El lint prohíbe `any` explícito en producción; las excepciones se limitan a fixtures históricos de pruebas.

Las pruebas de registro comprueban los treinta juegos, opciones declaradas, motores independientes, acciones malformadas, turnos y abandonos. Añadir un identificador sin catálogo, opciones, fábrica o tablero falla al compilar.

## Sesiones y respuestas pendientes

El servidor deriva la identidad de un secreto de 256 bits; un `playerId` aportado por el navegador no autoriza nada. El secreto permanece en la pestaña y los estados públicos nunca lo contienen. La sustitución autenticada expulsa el socket anterior. Las reservas y el plazo del turno sobreviven a la reconexión, no al reinicio del proceso.

`requestOnConnection` cancela un ACK pendiente al desconectar, caducar o fallar el envío, elimina listeners y descarta respuestas tardías. No reenvía acciones económicas automáticamente. La recuperación comprueba además que la sala guardada siga siendo la que solicitó. Un timeout no demuestra que el servidor no ejecutara una acción: el estado sincronizado es la referencia.

`events/protocol.ts` define una versión de protocolo independiente de la versión del paquete. Un cambio incompatible debe incrementar esa constante y sus pruebas. La versión 19 incorpora confirmaciones de presencia y notificaciones traducibles; la 18 introdujo `matchId` y cambio de juego conservando el grupo. La versión 17 añade el orden autoritativo, la penalización acumulada y la secuencia de eventos de Cambio de Color. La versión 16 incorporó los treinta juegos y las modalidades presenciales de Impostor. Un cliente anterior recibe una solicitud explícita de recarga. Un cliente moderno recibe `PROTOCOL_MISMATCH` y ofrece una recarga voluntaria conservando la sesión. Un navegador anterior a la negociación recibe un mensaje de recarga mediante su evento conocido `game:error`, sin registrar handlers de partida. No hay recargas automáticas ni reintentos de acciones.

El límite `AppErrorBoundary` distingue fallos de módulos dinámicos y ofrece recargar explícitamente; no borra sesiones ni crea bucles de recarga. La precarga JavaScript de Vite está desactivada para permitir la recuperación de módulos fallidos en WebKit, donde modulepreload puede retener una respuesta 404 a través de recargas. Se conservan los imports nativos diferidos y CSS asíncrono; se acepta una posible ronda de red adicional para dependencias de un tablero frente a esa recuperación bloqueada. Referencias: [incidencia del motor WebKit](https://bugs.webkit.org/show_bug.cgi?id=270357) y [opción de build de Vite](https://vite.dev/config/build-options.html#build-modulepreload). El HTML usa `no-cache`, los assets con hash `immutable` y Socket.IO `no-store`.

## Seguridad y operación

Orígenes HTTP exactos, sin comodines, validan el handshake y generan la CSP, incluidas sus variantes WebSocket. La cabecera `Host` no interviene. `CF-Connecting-IP` solo se acepta desde IPs TCP configuradas explícitamente; `X-Forwarded-For` no autoriza confianza.

Se mantienen los límites de tamaño de mensajes, ráfagas, intentos por IP, conexiones, creación de salas y caducidad. La reserva de contadores de sesión ocurre antes de aceptar el namespace, para conservar el límite durante handshakes concurrentes.

## Crecimiento

Antes de ampliar el servicio, mide el uso de CPU, memoria y latencia con cargas y hardware representativos. Los límites configurados no acreditan capacidad. La primera ampliación razonable es una instancia mayor y métricas sin identificadores privados.

Persistir partidas exige versionar estados, escribir snapshots y decidir cómo recuperar relojes y reservas. Varias instancias requieren propietario único por sala, asignación estable y serialización de acciones; un adaptador de Socket.IO no comparte motores. Mantener HTML revalidable y caché larga para recursos con hash permite escalar recursos estáticos sin cambiar reglas ni introducir infraestructura distribuida prematuramente.

## Ciclo de vida de una sala

Una sesión ocupa una sola sala. El anfitrión configura opciones, administra bots, inicia la partida y prepara la revancha. La revancha requiere una partida terminada y rota el asiento inicial. Una desconexión reserva el puesto durante el plazo de `DISCONNECT_GRACE_PERIOD_MS`; al caducar, el motor resuelve el abandono. Si sale el anfitrión, el papel pasa a otro humano, dando prioridad a los conectados. Cada reserva tiene su propio plazo. Una sala sin humanos se elimina; los bots y los plazos automáticos no renuevan la actividad humana.

Las preferencias de apodo, idioma y favoritos pertenecen a `localStorage`; la sesión pertenece a la pestaña. `BroadcastChannel` detecta pestañas que comparten sesión mediante una huella temporal del secreto. La huella no se persiste ni se envía al servidor. Una invitación distinta puede iniciar una sesión nueva para no restaurar una sala ajena al enlace.

## Reglas y fuentes de datos

[GAME_RULES.md](GAME_RULES.md) describe las variantes y restricciones de los motores. El catálogo y las opciones compartidas son la fuente de las reglas que ve el jugador. Las políticas de `games/engines.ts` definen el presupuesto del turno y la resolución automática de decisiones intermedias; [ADD_GAME.md](ADD_GAME.md) explica cómo registrar un motor y su tablero.

Los diccionarios locales de Palabras cruzadas, las soluciones de Preguntas y el banco de conceptos de Dibuja se cargan exclusivamente en el servidor e inyectan en sus motores. Los atriles, mazos, soluciones y conceptos pendientes se eliminan de la proyección por destinatario. Dibuja declara `supportsBots: false`: cliente y servidor impiden añadirlos. Sus trazos tienen límites de tamaño, cantidad y frecuencia adicionales a los límites generales de Socket.IO.

Impostor presencial conserva el mismo motor y registro que online. El gestor transmite la identidad del anfitrión al inicio y al resolver un abandono, para mantener la moderación autorizada también tras rotar asientos o migrar el anfitrión. El modo de un dispositivo utiliza ese motor en memoria local, sin salas ni conexiones simuladas, con pantallas neutrales entre papeles y sin persistencia de secretos.

## Grupo y cambio de juego

La sala representa al grupo: conserva código, identidades, conexiones y anfitrión entre partidas. En espera o al terminar, el anfitrión puede elegir otro juego. `RoomManager.changeGame` sustituye la instancia y el estado del motor, cancela relojes y bots anteriores y recupera las reglas y el reloj recordados para ese juego. La primera elección utiliza los valores predeterminados. Los participantes se conservan aunque superen el límite del nuevo juego; el inicio queda bloqueado hasta ajustar las plazas. Los juegos que requieren humanos rechazan bots al empezar.

La versión 18 del protocolo incorpora `matchId` a la sala y a cada proyección pública, junto con `gameType`. Cambiar de juego, iniciar o preparar otra partida renueva ese identificador. Las operaciones de configuración, participantes y juego lo deben aportar; el servidor deriva sala e identidad del socket autenticado y rechaza identificadores antiguos. El cliente descarta estados de otro motor o partida. La reconexión recupera la elección actual y solamente la proyección del destinatario.

Retirar a una persona exige anfitrión y confirmación en la interfaz. En juego solo se admite si sigue desconectada al procesar la petición. La operación cancela su reserva y aplica el abandono del motor. Se notifica al socket retirado y se elimina su pertenencia; una reconexión antigua no restaura la plaza. El retorno al grupo desde los resultados es una vista local; elegir otro juego cambia la sala para todos. Salir continúa transfiriendo el anfitrión a otra persona y elimina la sala cuando no quedan humanos.

## Presencia y presupuestos de turno

`requiresPresence` distingue una decisión humana pendiente de un vencimiento propio de reglas. Es verdadero por defecto. Subastas, preguntas cronometradas y su revisión, dibujo/revisión, reclamaciones de Mahjong y reanudación de revisión de Go conservan sus resoluciones. Cambio de Color mantiene su política explícita de cobrar la penalización o pasar después de robar. Los bots conservan su política automática.

Al vencer un presupuesto humano conectado, el gestor publica una confirmación opaca con plazo de 15 segundos. `room:confirm_presence` deriva la identidad del socket autenticado y exige el `matchId`, nonce vigente y actor actuales. Confirmar concede una única prórroga de 30 segundos; una acción parcial no la renueva. Una acción válida resuelve el aviso, pero solo completar el presupuesto permite otro turno completo. Salir o no responder aplica `forfeit`, transfiere anfitrión y continúa o termina según el motor; los demás reciben un aviso traducible. No se usan foco, visibilidad ni datos de seguimiento.

El reloj y la confirmación comparten la cancelación en cambios de turno, fin, reinicio, cambio de juego y destrucción. Una persona desconectada conserva la reserva finita de reconexión: no recibe preguntas ni decisiones estratégicas de un bot. Si su presupuesto vence desconectada, espera a recuperar la conexión o a que venza la reserva. Reconectar antes del vencimiento conserva el plazo; después se rearma un presupuesto manteniendo que la prórroga ya fue utilizada. Los estados privados siguen pasando por `getSanitizedState`.
