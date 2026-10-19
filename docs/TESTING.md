# Probar Sobremesa

## Arrancar

Desde la raíz del proyecto:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abre **http://127.0.0.1:5173**. Cuando aparezca «Listo para jugar», la web está conectada al servidor. La terminal debe permanecer abierta. `Ctrl+C` detiene el desarrollo.

La configuración predeterminada utiliza el puerto 5173 para la web y el 3000 para el servidor. No necesitas `.env` para esta prueba. Si esos puertos están ocupados, cierra la otra aplicación que los esté usando antes de arrancar.

El puerto 3000 sirve la última compilación del cliente, por lo que puede mostrar una versión anterior aunque `pnpm dev` esté funcionando. Para ver los cambios al guardar, usa el puerto 5173. Si quieres comprobarlos en el 3000, ejecuta `pnpm build` y recarga la página.

## Comprobación manual

### Catálogo, idioma y perfil

- En la primera visita, elige un apodo o genera uno aleatorio. Comprueba el selector Español/English.
- Cambia tu nombre desde el perfil y recarga: debe conservarse.
- Busca `ciudad fortuna` y `cambio de color`: deben aparecer los juegos correspondientes. La búsqueda utiliza los nombres, descripciones y categorías del catálogo.
- Prueba categorías, una búsqueda sin resultados y el botón para limpiar la búsqueda.
- Marca un favorito y entra en «Mis favoritos». Debe seguir guardado tras recargar.

### Partida contra un bot

Abre un juego y elige jugar contra un bot, o pulsa el botón del robot de su ficha. Debes llegar a la sala de configuración. Ajusta el tiempo de turno y las reglas disponibles y pulsa «Empezar partida». Consulta sus reglas y realiza varias jugadas. Cambia de idioma durante la partida: deben mantenerse la sala, cartas, saldo y turno.

| Juego           | Qué comprobar                                                                                                                                                                                                                                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ciudad Fortuna  | Tirar dados, consultar casillas, comprar, pujar en una subasta abierta y revisar propiedades. Las ofertas válidas deben superar la puja actual en 10 € y reinician el plazo de 15 s; pasar retira al jugador y al agotarse el tiempo gana la puja más alta. Para cambiar dinero o rondas, crea una sala y ajusta sus opciones antes de empezar. |
| Cambio de Color | Jugar por color o valor, robar, elegir color con un comodín y ocultar la mano del rival.                                                                                                                                                                                                                                                        |
| Cuatro en Línea | Las fichas caen a la casilla libre más baja. Una columna llena deja de aceptar fichas.                                                                                                                                                                                                                                                          |
| Reversi         | Solo se puede jugar sobre los puntos permitidos y las fichas encerradas cambian de color.                                                                                                                                                                                                                                                       |
| Tres en Raya    | Alternar turnos, bloquear casillas ocupadas y mostrar victoria o empate al terminar.                                                                                                                                                                                                                                                            |
| Dados al 100    | Sumar puntos temporales, guardarlos y perder solo los del turno cuando sale un uno.                                                                                                                                                                                                                                                             |

Para los nueve juegos nuevos:

| Juego                  | Comprobaciones                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rummy de fichas        | Atril de catorce fichas, apertura de 30 puntos, grupos, escaleras, comodines, división y unión de combinaciones, borradores, deshacer, robo y puntuación |
| Ajedrez                | Selección y destinos, enroque, jaque, promoción con cuatro opciones, tablas, historial y rendición                                                       |
| Impostor               | Tres participantes mínimos, papel ocultable, dos vueltas de pistas, voto secreto, desempate y resultado con todos los ganadores                          |
| Dominó                 | Apertura forzada, extremos orientados, pozo, pase obligatorio y suma de puntos                                                                           |
| Damas                  | Captura obligatoria, misma ficha en saltos encadenados y coronación                                                                                      |
| Backgammon             | Dirección propia, barra antes de mover, obligación de gastar dados, dobles y salida                                                                      |
| Batalla naval          | Colocación manual y aleatoria, retirada, orientación, flota privada y disparos sin repetición                                                            |
| Mancala                | Siembra, captura, turno adicional y suma final de 48 semillas                                                                                            |
| Dados de combinaciones | Guardar/liberar dados, máximo tres tiradas, trece categorías y bonificaciones                                                                            |

Revisa cada tablero a 320 px, cambia el idioma y recarga durante la partida. Al terminar, comprueba las puntuaciones y «Ver la mesa». En Impostor, asegúrate de que los votos y el secreto se revelan solo al terminar y de que el modal reconoce a todos los ganadores.

El tablero no debe permitir jugar durante el turno del contrario. Al terminar, el anfitrión puede preparar la revancha.

### Dos jugadores en el mismo ordenador

1. Abre la web en una ventana normal y crea una sala con «Jugar con amigos».
2. Copia su código de seis caracteres.
3. Abre otra ventana privada o un navegador distinto y visita la misma dirección.
4. Entra con el código y comprueba que ambos jugadores aparecen en la sala.
5. Empieza desde la ventana del anfitrión. Alterna jugadas: las dos ventanas deben mostrar los mismos movimientos.
6. Termina una partida de Tres en Raya y prepara la revancha. Las dos ventanas deben volver a la sala.

Usa una ventana nueva; duplicar una pestaña puede copiar su sesión. Cada jugador necesita su propia sesión. Si abres el mismo secreto en otra conexión, esta recupera el puesto y la anterior queda desconectada con la opción «Recuperar aquí».

### Reconexión y salida

Durante una partida, recarga una ventana. Debe recuperar la sala y el estado. También puedes desactivar y reactivar la red desde las herramientas del navegador durante menos de cinco minutos, manteniendo el servidor en marcha.

Prueba a salir de una partida. En un duelo, gana el rival; con más jugadores, el juego continúa según sus reglas. Si sale el anfitrión, otro jugador humano recibe ese papel.

### Tamaños de móvil

En las herramientas de desarrollo del navegador activa la vista de dispositivos. Prueba anchos de 320, 390 y 768 px, además del escritorio. En Ciudad Fortuna comprueba la Salida arriba a la izquierda, las figuras, el color de las propiedades, el último movimiento en el centro, los nombres e iconos de las casillas y las acciones visibles sin desplazarte. Durante una subasta confirma que cualquier postor solvente ve el formulario, el nombre de quien va ganando y el contador reiniciado tras una puja. Prueba «Ampliar tablero» y «Jugadores y propiedades». En Cambio de Color abre un comodín: debes ver los cuatro colores, sus cantidades y tus cartas a la vez. Revisa el catálogo, la sala y cada tablero: botones utilizables, formularios visibles y ausencia de desplazamiento horizontal de toda la página.

Recorre los controles con `Tab`. Los diálogos deben mantener el foco y cerrarse con `Escape` cuando no requieran elegir una acción final.

## Pruebas automáticas

```sh
pnpm check
```

Comprueba formato y lint, compila y ejecuta motores, idiomas, cancelación de ACK, integración y navegador. Estas últimas usan Google Chrome instalado. Para utilizar Chromium:

```sh
pnpm exec playwright install chromium
PLAYWRIGHT_BROWSER=chromium pnpm check
```

Para comprobaciones de desarrollo sin servidores HTTP, navegadores ni empaquetado de recursos:

```sh
pnpm check:quick
```

Comprueba formato, lint y tipos de las tres capas; compila lógica y servidor y ejecuta las pruebas de motores, idiomas, cliente y gestión de salas. No sustituye la comprobación completa tras cambios importantes.

También puedes ejecutarlas por separado:

```sh
pnpm test
pnpm test:i18n
pnpm build
pnpm test:integration
pnpm test:e2e
```

Las pruebas de motores incluyen diez partidas simuladas de cada juego, reglas configurables y privacidad de manos. Las de traducciones comprueban cobertura y parámetros. Las de integración incluyen sustitución autenticada de conexiones, varias salas independientes y agotamiento real de turnos de 30 segundos en los quince juegos (por eso tardan algo más de medio minuto). Las de navegador cubren ambos idiomas, primera visita, configuración con bots, visibilidad de controles, selector de color y caída de red. Las de integración arrancan un servidor temporal en el puerto 3190; las de navegador, otro en el 3187. No sustituyen al servidor de desarrollo del puerto 3000.

Los resultados, capturas y trazas quedan en `tests/.output/`, una carpeta generada que se puede borrar y está excluida de Git. Las trazas se guardan cuando falla una prueba.

## Probar la compilación que se alojará

Detén antes `pnpm dev`, porque ambos servidores usan el puerto 3000.

```sh
pnpm build
pnpm start
```

Abre **http://127.0.0.1:3000** y repite una partida entre dos ventanas. **http://127.0.0.1:3000/health** debe responder con `{"status":"ok"}`.

Las pruebas de navegador emulan tamaños de móvil en Chrome. Antes de publicar conviene probar también los dispositivos y navegadores que vayan a usar tus amigos. No hay una prueba de carga que garantice una cifra de jugadores simultáneos.

Para comprobar el reloj sin jugar, crea una sala de dos personas, configura 30 segundos y deja pasar el turno sin tocar nada: ambos navegadores deben recibir la misma jugada automática. Repite en dos salas distintas y comprueba que sus acciones no se mezclan.

Ciudad Fortuna incluye regresiones de rutas de movimiento, cárcel, alquileres compartidos, cambios de hipoteca durante tratos y valoración de bots. El navegador comprueba seis fichas sin solaparse con nombres ni precios en las cuatro orientaciones, movimiento reducido y la apertura móvil ampliada. La vista completa puede requerir desplazamiento vertical: se prioriza conservar texto legible frente a reducir todo el tablero a la altura de la pantalla.

`game-contract.test.ts` simula partidas completas y verifica inmutabilidad, conservación de cartas/fichas/semillas y abandono. Los casos especiales de cada juego están en `<juego>.test.ts`, siguiendo el patrón de las pruebas de Ciudad Fortuna. `settings.test.ts` comprueba las variantes configurables y su efecto real en los motores. Las pruebas de integración cubren salas independientes, proyecciones privadas, permisos, validación de opciones y agotamiento real de turnos de 30 segundos. `server.test.mjs` comprueba que las acciones parciales no reinicien el plazo.

En navegador, `games.spec.ts` juega una acción real, recarga, cambia de idioma y revisa accesibilidad en cada uno de los tableros cubiertos por esa suite a 1280 y 320 px. `settings-and-motion.spec.ts` comprueba opciones de la sala, restauración de valores predeterminados, movimientos de ajedrez, fichas de rummy, dados guardados, siembra de mancala y preferencia de movimiento reducido. `platform.spec.ts` conserva las pruebas de plataforma y el resto de juegos. Las capturas móviles quedan en `tests/.output/screenshots/`.

## Navegadores y pruebas de interacción

```sh
pnpm exec playwright install chromium firefox webkit
PLAYWRIGHT_BROWSER=chromium pnpm check
PLAYWRIGHT_BROWSER=firefox pnpm test:e2e
PLAYWRIGHT_BROWSER=webkit pnpm test:e2e
```

Sin variable se usa Chrome instalado. Las carpetas de trazas se separan por navegador y destino bajo `tests/.output/results/`. Las capturas ilustrativas no son snapshots aprobados. `robustness.spec.ts` prueba foco e inert, recuperación de módulo 404 conservando sesión, reflujo en 320/375/390/768/1280 px y acción por teclado. La suite añade incompatibilidad de protocolo con recarga voluntaria y el snapshot de media query obsoleto de Ciudad Fortuna. En Dominó realiza una acción real de colocar o robar según la mano legal, sin asumir un reparto favorable. El código `WWWWWW` es un caso de layout deliberadamente ancho. Las pruebas no certifican WCAG ni Safari real.

`tests/client.test.mjs` prueba que un ACK posterior a desconectar o caducar no restaure la sala anterior, y que fallos de envío liberen listeners. Las pruebas de registro comprueban motores separados, acciones inválidas inocuas y abandono; las de integración incluyen incompatibilidad y treinta handshakes concurrentes por IP. Los motores de dados y Ciudad Fortuna admiten aleatoriedad inyectable para reproducir secuencias sin reemplazar Math.random global; los demás conservan sus pruebas existentes.

## Docker local aislado

Con Docker Desktop disponible:

```sh
pnpm test:docker
```

El script usa el contexto local Unix, el Dockerfile real y una etiqueta y contenedor `sobremesa:local-test-<pid>` / `sobremesa-local-test-<pid>`. Publica solo `127.0.0.1:13000`, permite los dos orígenes locales correspondientes, usa el bridge ordinario y no monta archivos ni `.env`. Requiere el puerto libre: si está ocupado, termina sin parar el servicio existente. No usa Compose, Cloudflare ni un contexto Docker remoto.

Comprueba frontend, JS/CSS, caché/CSP, health/stats, polling y WebSocket, dos jugadores, permisos, acciones, reconexión y bots. Después ejecuta la suite E2E completa contra ese contenedor, comprueba healthcheck, usuario no root, filesystem de solo lectura y límites de CPU, memoria y procesos. Al terminar, incluso si falla una prueba, intenta detener y eliminar por id solo el contenedor creado y después su etiqueta. Conserva el error original y comunica también los fallos de apagado o limpieza, sin dejar de intentar las operaciones restantes. El contenedor se crea antes de arrancarlo para poder limpiarlo también si falla el arranque. Comprueba que SIGTERM termina con código cero. El caché local de build puede permanecer; nunca usa prune.

Para repetir navegador contra un servidor local ya preparado:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:13000 PLAYWRIGHT_BROWSER=chromium pnpm test:e2e
```

Solo se admiten hostnames de loopback; con esa variable Playwright no inicia otro servidor. No apuntes estas pruebas al dominio público.

## Alcance de las comprobaciones

Las pruebas locales no acreditan capacidad para los límites máximos de salas/conexiones ni sustituyen la revisión de [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Regresiones de errores y tareas de sala

`tests/scripts.test.mjs` simula comandos en un proceso aislado, sin Docker ni HTTP reales, para comprobar la limpieza ante fallos de pruebas, arranque, healthcheck, inspección, apagado y eliminación, conservando el error original.

`tests/server.test.mjs` comprueba a través del manejador Socket.IO que una acción manual cuyo motor muta el estado y lanza una excepción cierra únicamente su sala, responde sin secretos y conserva el rechazo normal de acciones inválidas. También usa el reloj simulado de Node para comprobar excepciones al vencer turnos y reservas, generar acciones de bots y proyectar estados. Verifica que solo se cierre la sala averiada, no se publiquen detalles privados del error y la otra sala continúe. También cubre el plazo conservado al reconectar, desconexiones de sockets sustituidos, recuperación de una partida ya terminada, salida con un bot pendiente y liberación de tareas al apagar.

La renovación de subastas se comprueba con tiempo simulado, incluyendo pujas en el mismo milisegundo y cinco segundos después. La integración comprueba la ventana de 15 segundos sin exigir que dos eventos inmediatos tengan marcas distintas; sus conexiones se liberan después de cada prueba, también si falla.

Las suites de navegador comparten `accessibilityAudit` con criterios automatizables A y AA de WCAG 2.0, 2.1 y 2.2. Los recorridos existentes cubren los quince tableros; siguen pendientes las verificaciones manuales de zoom nativo, lectores de pantalla y dispositivos físicos descritas en [ACCESSIBILITY.md](ACCESSIBILITY.md).
