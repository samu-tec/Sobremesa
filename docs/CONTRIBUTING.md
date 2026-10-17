# Desarrollo

## Organización del código

`apps/sobremesa-client` contiene la aplicación React. `App.tsx` coordina el catálogo, la sala de espera y el tablero. Las pantallas están en `views/`, los tableros en `components/` y los componentes comunes en `ui/`. La conexión Socket.IO está en `services/socket.ts`.

`apps/sobremesa-server` contiene el servidor y las salas. `server.ts` configura HTTP y Socket.IO, `socketHandlers.ts` comprueba las peticiones y `RoomManager.ts` gestiona jugadores, permisos, reconexiones y bots. `config.ts` aplica los valores predeterminados y permite ajustes mediante variables de entorno; no carga archivos `.env`.

`packages/sobremesa-logic` contiene las reglas. Cada juego tiene su directorio en `src/games/`. El catálogo común está en `src/catalog.ts`, los eventos en `src/events/` y el contrato de los motores en `src/engine/IGameEngine.ts`.

Las decisiones de arquitectura y estilo se describen en [DECISIONS.md](DECISIONS.md).

## Añadir un juego

Define primero sus jugadores, objetivo, jugadas legales, final, empate, información oculta y comportamiento cuando alguien abandona.

1. Crea `packages/sobremesa-logic/src/games/<id>/engine.ts`. Separa los tipos y el bot en archivos propios cuando su tamaño lo justifique.
2. Implementa `IGameEngine<Estado, Acción, EstadoPúblico>`: inicialización, validación, aplicación de jugadas, estado por jugador, ganador, bot y abandono.
3. Añade el identificador a `GameType` en `types/index.ts` y exporta el motor y sus tipos desde `src/index.ts`.
4. Registra sus datos en `GAME_CATALOG`: nombre, categoría, jugadores, duración orientativa, descripción, reglas, consejo y alias de búsqueda.
5. Registra la factoría en `engineFactories` de `RoomManager.ts`. Los límites de jugadores salen del catálogo.
6. Añade un archivo de tablero individual en `apps/sobremesa-client/src/components/`, con el nombre elegido para el juego (por ejemplo, `TresEnRayaBoard.tsx`). Regístralo mediante una importación diferida en `GameBoard.tsx`. Cada juego debe tener su propio componente y archivo; los elementos comunes se reutilizan desde `ui/` y `hooks/`.
7. Añade su ilustración en `GameArtwork.tsx` y amplía las pruebas y la lista de juegos del README.

La búsqueda, los favoritos, las invitaciones y las reglas utilizan el catálogo. No necesitan una pantalla nueva para cada juego.

## Reglas y estado

Los motores no conocen React ni Socket.IO. Usan `currentTurnPlayerId`, `winner` e `isDraw` cuando corresponda. El gestor admite también `currentTurn` por compatibilidad con Tres en Raya.

Cada acción se valida en el servidor: jugador, turno, tipo, posición, enteros finitos, dinero disponible y resultado final. Los dados y las barajas se resuelven allí; un valor enviado desde el navegador no es una autorización.

`applyAction` devuelve un estado nuevo y conserva intactos los objetos del anterior. `getSanitizedState` construye una vista explícita por jugador, sin manos ajenas, orden del mazo ni secretos de sesión. Conviene evitar copiar todo el estado y quitar después algunos campos: un campo nuevo podría quedar expuesto por accidente.

El bot produce acciones que su validador acepta y limita el trabajo de cálculo de cada turno. Los temporizadores los gestiona el servidor. Si un juego abre una fase simultánea, como las subastas de Ciudad Fortuna, cada jugador elegible puede actuar durante la ventana y una puja reinicia el plazo; no se simula como una ronda de turnos individuales.

## Interfaz

Los tableros reciben `BoardProps<EstadoPúblico, Acción>` y envían intenciones con `onAction`. No abren otro socket ni calculan por su cuenta el estado de la partida.

`GameLayout` proporciona turno, reglas, salida y resultado. `PlayersPanel`, `GameTip`, `DiceFace`, `Modal` y `Rules` se comparten entre los juegos. Los estilos están en `styles.css`: reutiliza `.button`, `.field`, `.panel` y las variables de color antes de añadir variantes.

Los botones respetan el turno, `busy` y el resultado. Las acciones con iconos tienen un nombre accesible. La información importante utiliza texto o símbolos además del color. Los diálogos mantienen el foco y funcionan con teclado; la página admite zoom y movimiento reducido.

Comprueba el tablero desde 320 px y con nombres largos. Los filtros o una mano de cartas pueden desplazarse dentro de su contenedor; el documento completo no debería desbordarse horizontalmente.

## Comprobar un cambio

Prueba victorias, empates, límites, turnos, información privada y abandono. Simula partidas completas con bots: cada jugada debe ser válida, conservar el estado anterior y alcanzar un resultado.

Para cambios de interfaz, prueba el flujo que hayas modificado y los tamaños de móvil. Si cambian las reglas, actualiza también el texto del catálogo.

```sh
pnpm format
pnpm check
```

Prettier se configura en `package.json` y reutiliza `.gitignore`. No hace falta configurar el editor para ejecutar estos comandos. Las opciones de TypeScript, Vite y Playwright permanecen en sus archivos porque corresponden a herramientas y paquetes distintos.

Al cambiar arquitectura, reglas, seguridad o alojamiento, actualiza [DECISIONS.md](DECISIONS.md). Si cambias dependencias, ejecuta también `pnpm audit`.

## Idiomas e interacción

Usa `t` para textos de interfaz y el catálogo localizado desde `apps/sobremesa-client/src/i18n`. Añade las traducciones a `en.ts` y ejecuta `pnpm test:i18n`. Los motores envían mensajes `GameText` con `message`; marca solo términos del juego con `term`. No traduzcas apodos ni guardes textos ya traducidos dentro del estado. Usa interpolaciones para que cada idioma pueda cambiar el orden de las frases.

Un juego nuevo debe pasar por la sala de configuración, también con bots. Respeta el reloj compartido y añade su política de turno agotado a `RoomManager`; debe salir de cualquier decisión pendiente con acciones legales. Prueba por separado dos salas del mismo juego, una desconexión, cambio de idioma y una pantalla de 320 px. Los controles principales deben permanecer visibles y los selectores no deben ocultar la información necesaria para decidir.
