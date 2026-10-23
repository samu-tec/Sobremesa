# Desarrollo

Guía de mantenimiento para el titular y las personas que autorice. La documentación no concede permisos adicionales sobre el código; consulta [LICENSE](../LICENSE).

## Organización del código

`apps/sobremesa-client` contiene la aplicación React. `App.tsx` coordina el catálogo, la sala de espera y el tablero. Las pantallas están en `views/`, los tableros en `components/` y los componentes comunes en `ui/`. La conexión Socket.IO está en `services/socket.ts`.

`apps/sobremesa-server` contiene el servidor y las salas. `server.ts` configura HTTP y Socket.IO, `socketHandlers.ts` comprueba las peticiones y `RoomManager.ts` gestiona jugadores, permisos, reconexiones y bots. `config.ts` aplica los valores predeterminados y permite ajustes mediante variables de entorno; no carga archivos `.env`.

`packages/sobremesa-logic` contiene las reglas. Cada juego tiene su directorio en `src/games/`. El catálogo común está en `src/catalog.ts`, los eventos en `src/events/` y el contrato de los motores en `src/engine/IGameEngine.ts`.

Consulta [ARCHITECTURE.md](ARCHITECTURE.md) para los contratos y [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) para la interfaz. Las variantes están en [GAME_RULES.md](GAME_RULES.md).

## Añadir un juego

La guía completa está en [ADD_GAME.md](ADD_GAME.md): contratos, motor, catálogo y opciones exhaustivos, políticas, UI, textos, arte, bots y regresiones. La búsqueda, favoritos e invitaciones reutilizan el catálogo.

## Reglas y estado

Los motores no conocen React ni Socket.IO. Usan `currentTurnPlayerId`, `winner` e `isDraw` cuando corresponda. El gestor admite también `currentTurn` por compatibilidad con Tres en Raya.

Cada acción se valida en el servidor: jugador, turno, tipo, posición, enteros finitos, dinero disponible y resultado final. Los dados y las barajas se resuelven allí; un valor enviado desde el navegador no es una autorización.

`applyAction` devuelve un estado nuevo y conserva intactos los objetos del anterior. `getSanitizedState` construye una vista explícita por jugador, sin manos ajenas, orden del mazo ni secretos de sesión. Conviene evitar copiar todo el estado y quitar después algunos campos: un campo nuevo podría quedar expuesto por accidente.

El bot produce acciones que su validador acepta y limita el trabajo de cálculo de cada turno. Los temporizadores los gestiona el servidor. Si un juego abre una fase simultánea, como las subastas de Ciudad Fortuna, cada jugador elegible puede actuar durante la ventana y una puja reinicia el plazo; no se simula como una ronda de turnos individuales.

## Interfaz

Los tableros reciben `BoardProps<EstadoPúblico, Acción>` y envían intenciones con `onAction`. No abren otro socket ni calculan por su cuenta el estado de la partida.

`GameLayout` proporciona turno, reglas, salida y resultado. `PlayersPanel`, `DiceFace`, `Modal` y `Rules` se comparten entre los juegos. Los estilos se importan desde `styles.css` y se organizan en `styles/`; consulta [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md): reutiliza `.button`, `.field`, `.panel` y las variables de color antes de añadir variantes.

Los botones respetan el turno, `busy` y el resultado. Las acciones con iconos tienen un nombre accesible. La información importante utiliza texto o símbolos además del color. Los diálogos mantienen el foco y funcionan con teclado; la página admite zoom y movimiento reducido.

Comprueba el tablero desde 320 px y con nombres largos. Los filtros o una mano de cartas pueden desplazarse dentro de su contenedor; el documento completo no debería desbordarse horizontalmente.

## Comprobar un cambio

Selecciona las comprobaciones según el riesgo del cambio: reglas delicadas, sesiones, permisos, información privada y temporizadores. Reutiliza las regresiones existentes y añade una prueba focalizada si corriges un fallo importante. No hace falta repetir partidas completas ni todos los recorridos por una modificación de texto o CSS.

Formatea únicamente los archivos afectados. Al terminar una tarea importante, ejecuta `pnpm check`: incluye formato, lint, compilación y pruebas esenciales, sin navegador ni Docker. Para navegación o interacciones relevantes utiliza `pnpm test:e2e`; para cambios de construcción, arranque o ejecución empaquetada utiliza `pnpm test:docker`. Consulta [TESTING.md](TESTING.md) para los comandos focalizados y sus límites.

Prettier se configura en `package.json` y reutiliza `.gitignore`. Las opciones de TypeScript, Vite y Playwright permanecen en sus archivos porque corresponden a herramientas y paquetes distintos.

Al cambiar arquitectura, reglas, diseño o alojamiento, actualiza su guía de referencia correspondiente. Si cambias dependencias, ejecuta también `pnpm audit`.

## Idiomas e interacción

Usa `t` para textos de interfaz y el catálogo localizado desde `apps/sobremesa-client/src/i18n`. Añade las traducciones a `en.ts` y ejecuta `pnpm test:i18n`. Los motores envían mensajes `GameText` con `message`; marca solo términos del juego con `term`. No traduzcas apodos ni guardes textos ya traducidos dentro del estado. Usa interpolaciones para que cada idioma pueda cambiar el orden de las frases.

Un juego nuevo debe pasar por la sala de configuración, también con bots. Respeta el reloj compartido y registra su política de turno en `src/games/engines.ts` del servidor; debe salir de cualquier decisión pendiente con acciones legales. Prueba por separado dos salas del mismo juego, una desconexión, cambio de idioma y una pantalla de 320 px. Los controles principales deben permanecer visibles y los selectores no deben ocultar la información necesaria para decidir.
