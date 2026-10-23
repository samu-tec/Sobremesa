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
| Rummy                  | Atril de catorce fichas, apertura de 30 puntos, grupos, escaleras, comodines, división y unión de combinaciones, borradores, deshacer, robo y puntuación |
| Ajedrez                | Selección y destinos, enroque, jaque, promoción con cuatro opciones, tablas, historial y rendición                                                       |
| Impostor               | Tres participantes mínimos, papel ocultable, dos vueltas de pistas, voto secreto, desempate y resultado con todos los ganadores                          |
| Dominó                 | Apertura forzada, extremos orientados, pozo, pase obligatorio y suma de puntos                                                                           |
| Damas                  | Captura obligatoria, misma ficha en saltos encadenados y coronación                                                                                      |
| Backgammon             | Dirección propia, barra antes de mover, obligación de gastar dados, dobles y salida                                                                      |
| Batalla naval          | Colocación manual y aleatoria, retirada, orientación, flota privada y disparos sin repetición                                                            |
| Mancala                | Siembra, captura, turno adicional y suma final de 48 semillas                                                                                            |
| Dados de combinaciones | Guardar/liberar dados, máximo tres tiradas, trece categorías y bonificaciones                                                                            |

Revisa cada tablero a 320 px, cambia el idioma y recarga durante la partida. Al terminar, comprueba las puntuaciones y «Ver la mesa». En Impostor, asegúrate de que los votos y el secreto se revelan solo al terminar y de que el modal reconoce a todos los ganadores.

Las acciones deben respetar la fase y sus permisos, incluidas las decisiones simultáneas. Al terminar, el anfitrión puede preparar la revancha.

### Cabecera, ampliación y audio

- Comprueba que la mesa mantiene su posición al cambiar de turno o desconectarse un compañero. No deben existir «¡Te toca!» ni una franja vacía. Los avisos largos se consultan desde el panel de participantes.
- Prueba «Ampliar el juego», la salida del navegador y el botón de salida. Si Fullscreen API no está disponible, debe funcionar el modo inmersivo. Escape cierra primero un diálogo y permite salir del modo CSS cuando no hay diálogos.
- En «Preferencias» cambia idioma, sonido y volumen desde la portada, la sala de espera y la partida. Comprueba el sonido activado al 25 % por defecto, recarga y verifica que las preferencias se conservan. Oculta la pestaña y recupera la conexión: no deben reproducirse avisos atrasados. Comprueba el volumen y la suavidad en altavoces y auriculares reales.
- Revisa 1280×720, 1366×768, 1440×900, 768×1024, 360×640, 390×844 y horizontal. El zoom y los dispositivos físicos requieren comprobación manual adicional.
- `tests/browser/game-experience.spec.ts` cubre estabilidad con dos humanos, cabecera, tamaños, modo CSS y nativo, accesibilidad, preferencias, audio bloqueado y síntesis real. `tests/client.test.mjs` comprueba límites de ráfagas, ocultación y liberación del audio.

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

En las herramientas de desarrollo del navegador activa la vista de dispositivos. Prueba anchos de 320, 390 y 768 px, además del escritorio. En Ciudad Fortuna comprueba la Salida arriba a la izquierda, las figuras, el color de las propiedades, las tres jugadas recientes y el acceso a la actividad completa, los nombres e iconos de las casillas y las acciones. En escritorio, confirma que la página no se desplaza y que Propiedades, Tratos y Actividad mantienen su posición; en móvil, comprueba el reflujo y que todos los controles se alcanzan. Durante una subasta confirma que cualquier postor solvente ve el formulario, el nombre de quien va ganando y el contador reiniciado tras una puja. Comprueba que no hay zoom específico e inspecciona una casilla con teclado. En Cambio de Color abre un comodín: debes ver los cuatro colores, sus cantidades y tus cartas a la vez. Revisa el catálogo, la sala y cada tablero: botones utilizables, formularios visibles y ausencia de desplazamiento horizontal de toda la página.

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

Las pruebas de motores incluyen partidas completas, reglas configurables y privacidad de manos. Las de traducciones comprueban cobertura y parámetros. Las de integración incluyen sustitución autenticada de conexiones, varias salas independientes y agotamiento real de turnos de 30 segundos en los treinta juegos (por eso tardan algo más de medio minuto). Las de navegador cubren ambos idiomas, primera visita, configuración con bots, visibilidad de controles, selector de color y caída de red. Las de integración arrancan un servidor temporal en el puerto 3190; las de navegador, otro en el 3187. No sustituyen al servidor de desarrollo del puerto 3000.

Los resultados, capturas y trazas quedan en `tests/.output/`, una carpeta generada que se puede borrar y está excluida de Git. Las trazas se guardan cuando falla una prueba.

## Probar la compilación que se alojará

Detén antes `pnpm dev`, porque ambos servidores usan el puerto 3000.

```sh
pnpm build
pnpm start
```

Abre **http://127.0.0.1:3000** y repite una partida entre dos ventanas. **http://127.0.0.1:3000/health** debe responder con `{"status":"ok"}`.

Las pruebas de navegador emulan tamaños de móvil en Chrome. Antes de publicar conviene probar también los dispositivos y navegadores que vayan a usar tus amigos. No hay una prueba de carga que garantice una cifra de jugadores simultáneos.

Para comprobar el autoplay involuntario, deja vencer un turno ordinario: solo el jugador activo recibe una confirmación privada de veinte segundos; responder concede un único turno adicional. Si no responde, el bot legal del motor actúa y el anfitrión recibe una revisión a los tres minutos. Comprueba que una acción legal desde la sesión conectada recupera el control cuando vuelva su turno, y que «Volver a jugar» también lo recupera fuera de turno sin cambiar la jugada ni el reloj de otra persona. La petición requiere sesión y `matchId` vigentes; repetirla, enviarla desde otro socket o tras cambiar de partida no debe modificar el estado. La recuperación cancela temporizadores y decisiones del anfitrión anteriores. Una desconexión activa el juego automático de inmediato y permite recuperar la plaza al reconectar. El anfitrión puede retirar con confirmación a una persona que siga desconectada sin esperar tres minutos; si ya reconectó, la retirada se rechaza. Si el anfitrión no resuelve una revisión de autoplay durante el minuto siguiente, se aplica el abandono del motor. Las pruebas con tiempo simulado verifican permisos, actividad humana, caducidad, recuperación, retiradas, reconexiones y callbacks obsoletos; también confirman que una revisión del anfitrión no apaga el reloj de una fase con vencimiento propio.

`server.test.mjs` valida el banco de 180 preguntas del Quiz: 30 por categoría, identificadores y enunciados únicos, cuatro opciones por idioma y respuesta dentro del rango. Las comprobaciones de lógica cubren que las preguntas no se repitan durante la partida y que la solución permanezca oculta hasta responder o vencer el reloj.

Ciudad Fortuna incluye regresiones de rutas de movimiento, cárcel, alquileres compartidos, cambios de hipoteca durante tratos y valoración de bots. El navegador comprueba seis fichas sin solaparse con nombres ni precios en las cuatro orientaciones, movimiento reducido y la inspección móvil de casillas sin zoom específico. Los detalles completos se leen en el inspector y la gestión económica se abre desde acciones.

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

`tests/server.test.mjs` comprueba a través del manejador Socket.IO que una acción manual cuyo motor muta el estado y lanza una excepción cierra únicamente su sala, responde sin secretos y conserva el rechazo normal de acciones inválidas. También usa el reloj simulado de Node para comprobar excepciones al vencer turnos y reservas, generar acciones de bots y proyectar estados. Verifica que solo se cierre la sala averiada, no se publiquen detalles privados del error y la otra sala continúe. Los casos de inicio, reinicio, abandono manual, resolución final, configuración y recuperación también inyectan fallos y comprueban el cierre aislado. El registro de los treinta motores rechaza identidades repetidas y cantidades de jugadores fuera de catálogo; Cambio de Color conserva repartos de 5, 7 y 9 cartas mediante el esquema compartido. También cubre `lastActivity` ante jugadas humanas y automáticas, caducidad con temporizadores, recuperación de autoplay mediante la ruta Socket.IO, sockets y `matchId` obsoletos, retirada temprana con reconexión entre apertura y confirmación, reservas de desconexión, el plazo conservado al reconectar, recuperación de una partida terminada, salida con un bot pendiente y liberación de tareas al apagar.

La renovación de subastas se comprueba con tiempo simulado, incluyendo pujas en el mismo milisegundo y cinco segundos después. La integración cubre las acciones automáticas con plazos reales breves; sus conexiones se liberan después de cada prueba, también si falla.

Las suites de navegador comparten `accessibilityAudit` con criterios automatizables A y AA de WCAG 2.0, 2.1 y 2.2. Los recorridos existentes cubren los treinta tableros. La configuración de Cambio de Color se comprueba con teclado, tamaños de texto calculados, reflujo a 320, 375, 390, 768 y 1280 px y ampliación CSS al 200%; siguen pendientes las verificaciones manuales de zoom nativo, lectores de pantalla y dispositivos físicos descritas en [ACCESSIBILITY.md](ACCESSIBILITY.md).

Las pruebas de Parchís (`packages/sobremesa-logic/test/parchis.test.ts`) cubren capturas, salidas ocupadas, seguros, barreras, premios encadenados, tres seises, meta exacta, abandono, inmutabilidad y partidas completas con dos, tres y cuatro bots. Los recorridos de navegador del juego usan teclado, posiciones legibles, cambio de idioma y reconexión a 320 y 1280 px. Las suites de integración incluyen Parchís en el aislamiento de salas y los plazos de turno.

Las pruebas de Oca (`packages/sobremesa-logic/test/oca.test.ts`) cubren todas las casillas especiales, rebote, llegada exacta, oca 59 sin victoria automática, liberación del pozo, esperas simultáneas, abandono, acciones inválidas, aislamiento de la proyección y partidas completas de dos a seis jugadores. Los recorridos de navegador usan el dado con teclado, consultan casillas, recargan y cambian de idioma a 320 y 1280 px. La integración incluye las dos salas y el reloj de Oca. La regresión de Rummy comprueba desplazamiento por teclado de una combinación larga con fichas bloqueadas.

Go comprueba capturas simultáneas, grupos, libertades, suicidio, ko, amenazas, superko, área, neutralidad, komi, propuesta de muertos, confirmación bilateral, reanudación, privacidad del historial y partidas completas con bots en los tres tamaños. Una regresión de servidor prueba que marcar no renueva el reloj y que el timeout de revisión reanuda. Los recorridos de navegador cubren flechas, Enter, piedra real, idioma y recarga.

Las pruebas de Damas chinas (`packages/sobremesa-logic/test/chinese.test.ts`) cubren geometría, configuraciones de participantes, pasos, saltos encadenados sin capturas, entrada irreversible en destino, victoria, bloqueo, repetición, abandono y partidas completas con bots en los cuatro tamaños de grupo. La sala rechaza cinco participantes sin cerrarse y acepta seis. El navegador comprueba selección, confirmación por teclado, reflujo, idiomas y reconexión a 320 y 1280 px.

`mahjong.test.ts` comprueba reparto, combinaciones, puntuación, prioridades, kongs, reposiciones, robo de kong, victorias simultáneas, límites de fan, descarte final, privacidad y veinte partidas completas con bots y conservación de las 136 fichas. La prueba del servidor usa reloj simulado para las respuestas de ocho segundos y el presupuesto compartido entre robo y descarte. El navegador juega a 320 y 1280 px y verifica con cuatro personas que sus manos sean distintas, que los pases permitan robar y que una recarga conserve la mano privada.

`cards-final.test.ts` cubre Mus, Escoba, Cinquillo y Texas Hold’em: conservación de barajas y fichas, envites, órdagos, capturas, secuencias, categorías, botes secundarios, fichas impares, all-in incompletos y torneos completos. `social-final.test.ts` cubre geometría y puntuación de palabras, soluciones de preguntas, privacidad y límites de dibujo, hipótesis privadas y acusaciones. `conquest.test.ts` comprueba el mapa, refuerzos, combates, traslados y partidas completas de dos a seis personas. El servidor también juega partidas de Palabras con ambos diccionarios reales, verificando conservación de letras.

`impostor-physical.test.ts` protege el modo online y comprueba pistas habladas, recuentos autorizados, desempates, confirmación del intento y migración de moderador. `social-and-physical.spec.ts` completa una partida de Dibuja con tres clientes móviles, recupera el lienzo por reconexión y verifica los modos presenciales de varios móviles y dispositivo compartido. El recorrido local usa teclado y comprueba que el papel anterior desaparezca, que la nueva ronda empiece neutral y que recargar elimine el estado local. El servidor simula los plazos de autoplay en los treinta juegos; Socket.IO confirma en tiempo real los movimientos de vencimiento en un juego de tablero y uno de cartas. El límite de treinta sesiones y los 120 intentos por minuto se prueban en un servidor local aislado para no consumir la cuota de los demás recorridos.

La validación automatizada no sustituye la revisión manual con lectores de pantalla, zoom nativo y teléfonos físicos. Docker requiere que Docker Desktop esté iniciado; si su daemon no está disponible, se informa del intento fallido y no se declara verificada la imagen actual.

## Última comprobación local: 22 de octubre de 2026

`pnpm check:quick` y `PLAYWRIGHT_BROWSER=chromium pnpm check` terminaron correctamente: formato, ESLint, compilación de producción y TypeScript, 249 pruebas de lógica, 3 de localización, 3 de cliente, 200 de servidor/integración/scripts y 142 recorridos de Chromium. La comprobación completa de WebKit también terminó con 142 recorridos correctos. `caffeinate` mantuvo despierto el Mac durante los temporizadores reales sin cambiar ajustes del sistema ni límites de producción.

`pnpm test:docker` pasó con la imagen de producción: instalación con lockfile congelado, HTTP, assets, CSP, polling, WebSocket, permisos, dos personas, reconexión, bots y los 142 recorridos de Chromium contra el contenedor. Se comprobaron healthcheck, usuario sin privilegios, filesystem de solo lectura, límites de memoria/CPU/procesos y apagado. Se eliminaron el contenedor `sobremesa-local-test-39188` y su etiqueta temporal. Solo se publicó loopback.

Después de esas suites se reforzó únicamente el CSS inmersivo para mantener la cabecera accesible al desplazarse y reducir textos secundarios. Se repitieron compilación, `check:quick` y diez recorridos de zonas, tamaños y fullscreen en cada navegador: Chromium y WebKit. No se repitió Docker por este último ajuste de presentación.

Firefox no pudo arrancar: su binario informó «Could not find profile folder» tanto con la carpeta temporal habitual como con `/private/tmp`; sus recorridos quedan sin validar. Siguen pendientes lectores de pantalla, zoom nativo y dispositivos físicos. Las diferencias nativas de WebKit con Escape y Opción+Tab se comprueban explícitamente, sin desactivar funciones ni pruebas.

No se contactó producción ni Cloudflare real y no hubo despliegues, commits ni push. La configuración externa efectiva, registros, cookies y garantías del servicio deben verificarse por su administrador según [LEGAL.md](LEGAL.md). `AGENTS.md`, `.agents/` y `.codex/` permanecen ignorados localmente, fuera del índice Git y excluidos del contexto Docker.

## Continuación de la mejora de jugabilidad

La base común reúne cabecera centrada, filas activas, acciones izquierdas opcionales, participantes derechos, avisos discretos, pantalla completa y audio. Cambio de Color incluye dirección autoritativa, acumulación opcional, mazo accionable resaltado, selector de color estable y victoria inmediata. El grupo conserva sala, personas y configuraciones al cambiar de juego. Los treinta tableros conservan reglas y sus controles particulares; la tabla siguiente relaciona la cobertura de cada uno.

`server.test.mjs` comprueba confirmación finita, sesión/actor/nonce, abandono por motor en los treinta registros, prórroga única, acciones parciales, reconexión y cancelación por cambios de ciclo de vida. Los tests de excepciones fuerzan explícitamente una política automática para aislar esa ruta del aviso humano. Las integraciones utilizan Socket.IO real para rechazar confirmaciones de otra conexión y respuestas reutilizadas. Los vencimientos de reglas se prueban por separado.

Ciudad Fortuna se comprueba sin zoom específico: cuarenta casillas, ficha/saldo/posición en participantes, controles izquierdos, inspección de nombres y alquileres a tamaño legible en móvil y separación de seis fichas en las cuatro orientaciones. Las pruebas previas de zoom se sustituyen por estos recorridos. Las muestras de zonas compartidas verifican posición geométrica, título centrado, reloj único, reflujo y axe antes de recorrer las demás familias.

### Grupo entre juegos y controles de los treinta tableros

`tests/browser/groups.spec.ts` recorre con dos navegadores la entrada con minúsculas y espacios, cancelación y confirmación de retirada, recarga sin restaurar una plaza retirada, reentrada explícita, cambio sincronizado de juego, partida completa de Tres en Raya, consulta del resultado, retorno al grupo y recuperación de las reglas de Cambio de Color. También comprueba selección reversible, flechas y Escape dentro del modo inmersivo. Las pruebas de servidor repiten la transición desde una partida terminada hacia los treinta juegos y verifican permisos, reservas, relojes, incompatibilidad de plazas y rechazo de contextos antiguos; integración utiliza Socket.IO real en loopback.

La revisión de jugabilidad conserva las variantes publicadas en `GAME_RULES.md` y el catálogo. Se contrasta cada acción visible con su validador, proyección y pruebas específicas:

| Juego                    | Interacciones y reglas revisadas                                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ciudad Fortuna           | Compra, subasta abierta, deuda, hipoteca, construcción, intercambio y bancarrota; acciones trasladadas al panel lateral en escritorio para aprovechar la altura del tablero. |
| Cambio de Color          | Orden y dirección del motor, cartas legales, robo, comodines, cadena mixta opcional y última carta; Jump-In exacto (incluidas acciones), timeout, privacidad y bots.         |
| Rummy                    | Apertura, comodines, borrador completo, reorganización, deshacer y restaurar; mesa y editor en paralelo y selección cancelable sin perder el borrador.                       |
| Ajedrez                  | Destinos legales, promoción, enroque, jaque, tablas y rendición; cancelar selección y explorar con flechas.                                                                  |
| Damas                    | Captura obligatoria, cadena y coronación; cancelar solo la elección libre, sin interrumpir una captura forzada.                                                              |
| Reversi                  | Capturas en ocho direcciones, pase y recuento final; flechas y previsualización del número de fichas volteadas.                                                              |
| Dominó                   | Apertura, extremos, orientación, robo y bloqueo; selección reversible y ronda consultable sin desplazar la mesa.                                                             |
| Backgammon               | Barra, dados obligatorios, dobles, secuencias y salida; cancelación del filtro de origen y lista de movimientos junto al tablero.                                            |
| Batalla naval            | Colocación y retirada, orientación, flota privada, disparos y hundimientos; navegación con flechas.                                                                          |
| Mancala                  | Siembra, captura, turno extra y recogida final; flechas por la fila propia.                                                                                                  |
| Parchís                  | Salida, barreras, captura, premios y llegada exacta; tablero y controles en paralelo en escritorio.                                                                          |
| Oca                      | Recorrido, saltos, espera, rebote y final; tablero y estado de participantes en paralelo.                                                                                    |
| Go                       | Suicidio, repetición, pases, grupos muertos y acuerdo de puntuación; altura acotada y desplazamiento interno en tableros grandes.                                            |
| Damas chinas             | Pasos, saltos, ruta y destino; cancelar la ruta y adaptar el tablero a la altura disponible.                                                                                 |
| Mahjong                  | Robo, descarte, reclamaciones, kongs, fan y privacidad; selección reversible y confirmación de descarte.                                                                     |
| Brisca                   | Jerarquía, triunfo, cambio, recogida, parejas y tanteo; cancelar la carta antes de confirmarla.                                                                              |
| Mus                      | Mus, descarte, declaraciones, lances, envites y órdago; cancelar descartes locales.                                                                                          |
| Escoba                   | Suma de quince, capturas obligatorias, escobas y mayorías; bonus opcional por los cuatro sietes (tres puntos totales) y cancelación conjunta de carta y captura.             |
| Cinquillo                | Apertura, secuencias y pase obligatorio; cancelar la carta antes de colocarla.                                                                                               |
| Póker                    | Ciegas, calles, subidas, all-in, botes secundarios y showdown; comunitarias junto a la mano y apuestas, con preparación previa al envío.                                     |
| Palabras cruzadas        | Atril, borrador, retirada, diccionario y puntos; cuadrícula junto al atril, flechas y cancelación sin borrar letras colocadas.                                               |
| Preguntas y respuestas   | Pregunta, respuesta privada, confirmación, revisión y empate; selección reversible.                                                                                          |
| Dibuja y adivina         | Elección secreta, trazos, formas por teclado, respuestas, plazos y puntuación; presupuesto visible de trazos y limpieza disponible al agotarlo.                              |
| Misterio y deducción     | Hipótesis, refutación privada, cuaderno, acusación confirmada y eliminación; las marcas permanecen locales.                                                                  |
| Conquista de territorios | Refuerzos, vecinos, combate, traslado, control y final por rondas; mapa y controles en paralelo.                                                                             |
| Impostor                 | Pistas, votos secretos, desempates, intento final y modos presenciales; ocultación del papel al perder foco.                                                                 |
| Cuatro en Línea          | Gravedad, columna llena y líneas ganadoras; navegación de columnas con flechas.                                                                                              |
| Tres en Raya             | Casillas, victoria y empate; flechas y transición completa al siguiente juego.                                                                                               |
| Dados al 100             | Tiradas, pérdida del total temporal, guardar y objetivo configurable; bloqueo de guardar sin puntos.                                                                         |
| Dados de combinaciones   | Dados guardados, categorías, bonificaciones y final; liberar la selección local y consultar la hoja mediante desplazamiento interno con cabecera y total fijos.              |

Las partidas completas de motores, invariantes de cartas/fichas/dinero, variantes, bots, privacidad y abandono se comprueban en las pruebas específicas de lógica y servidor. Los recorridos de navegador añaden acciones reales, idioma, reconexión, accesibilidad y tamaños de pantalla. La inspección automatizada no sustituye revisar dispositivos físicos, lectores de pantalla y audio con altavoces o auriculares.

En WebKit local, Escape en pantalla completa nativa es consumido por el navegador: sale de fullscreen sin entregar `keydown` al documento y conserva el diálogo y su foco. Un segundo Escape cierra el diálogo. El test comprueba ambos pasos; en el modo CSS y en Chromium se mantiene la prioridad de cerrar primero el diálogo. No se desactiva la API nativa para forzar el comportamiento de otro navegador.
