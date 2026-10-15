# Decisiones del proyecto

## Arquitectura

Sobremesa se organiza en tres paquetes:

- `apps/client`: aplicación React, componentes y conexión con Socket.IO.
- `apps/server`: servidor HTTP, sesiones, salas y turnos de bots.
- `packages/game-logic`: motores, tipos, catálogo y reglas sin dependencias de la interfaz o el transporte.

pnpm workspaces conecta los paquetes. TypeScript se usa en modo estricto. El cliente y el servidor comparten contratos; los mensajes recibidos se validan también en ejecución, porque los tipos no protegen la entrada de red.

Cliente, API y Socket.IO comparten origen en producción. Vite actúa como proxy durante el desarrollo. El despliegue está pensado para un servidor Node detrás de Cloudflare Tunnel, sin servicios externos necesarios para jugar.

## Marca, repositorio y dominio

El nombre del proyecto y la marca visible son **Sobremesa**. El logotipo escribe «sobremesa.» en minúsculas por decisión visual. La dirección pública prevista es `https://games.samuelciocan.com`; el subdominio describe dónde se juega, no cambia el nombre del producto. El título, la descripción y las tarjetas al compartir la web deben conservar esta relación en español e inglés.

El paquete raíz también se llama `sobremesa`. Los nombres `games-client`, `games-server` y `@games/game-logic` son identificadores internos de pnpm; no aparecen como nombres de producto para los visitantes. El remoto de GitHub todavía es `samu-tec/Games`; el nombre elegido para el repositorio es `samu-tec/sobremesa`. Tras cambiarlo en GitHub, actualiza el remoto local a `https://github.com/samu-tec/sobremesa.git`.

## Catálogo y motores

`packages/game-logic/src/catalog.ts` es la fuente común de nombres, jugadores, categorías, reglas, consejos y alias de búsqueda. El servidor obtiene de ahí los límites de cada sala.

Cada juego implementa `IGameEngine`: inicialización, validación, aplicación de acciones, proyección por jugador, ganador, bot y abandono. El motor no conoce React ni sockets. Las acciones devuelven estados nuevos y no mutan los anteriores.

Los tableros se cargan cuando se abre el juego. El código específico de cada tablero no forma parte de la carga inicial del catálogo.

Los bots tienen un cálculo acotado: minimax en Tres en Raya, búsqueda limitada en Cuatro en Línea, esquinas y movilidad en Reversi, riesgo de turno en Dados al 100 y decisiones por mano o patrimonio en los otros juegos. El gestor programa sus pausas.

## Estilo e interacción

La interfaz usa fondos claros, verde bosque, salvia y coral, con ilustraciones propias en SVG y fuentes del sistema. Los estilos comunes están en `apps/client/src/styles.css`.

`GameLayout`, `PlayersPanel`, `GameTip`, `DiceFace`, `Modal` y `Rules` se reutilizan entre juegos. Los componentes comparten botones, campos, paneles, avisos, turnos y resultados.

El recorrido es catálogo → sala → partida → resultado → revancha o catálogo. Cada juego tiene reglas accesibles durante la partida y confirmación antes de abandonar. Los errores se muestran en un aviso común.

La página permite zoom, navegación por teclado y movimiento reducido. Los diálogos gestionan el foco y las superposiciones. El catálogo utiliza una columna por debajo de 420 px. Ciudad Fortuna conserva el tablero completo y muestra detalles al tocar una casilla; las acciones principales están en el centro en escritorio y en una barra inferior fija en móvil. El panel de propiedades tiene desplazamiento independiente en escritorio y se abre en un diálogo accesible en móvil. Salida está arriba a la izquierda y el recorrido avanza hacia la derecha. Cada jugador tiene color y figura estables, repetidos en sus fichas, resumen y propiedades. El tablero se puede ampliar en móvil sin desplazar sus controles principales.

## Reglas de las variantes

Las reglas del catálogo describen lo que ejecutan los motores. Cambiar una regla requiere actualizar ambos y las pruebas correspondientes.

Ciudad Fortuna utiliza:

- Compras, alquileres, subastas por turnos, edificios equilibrados, hipotecas, intercambios y cárcel.
- Incremento mínimo de subasta de 10 €. Pasar retira al postor; el importe se cobra al cerrar.
- Cartas de libertad fuera del mazo hasta usarse o devolverse por abandono o bancarrota.
- Saldo negativo que impide tirar hasta recuperar dinero o declarar bancarrota.
- Límite de 20, 40 o 60 rondas, con 40 por defecto. Gana el último participante activo o el mayor patrimonio al agotarse las rondas. Patrimonio = efectivo + precio de propiedades + coste de edificios − valor de hipotecas. Igual patrimonio produce empate.
- Banco con edificios ilimitados y propiedades de bancarrota de vuelta al banco. Un abandono durante una subasta la cancela. Los tratos admiten dinero y propiedades sin edificios; las hipotecas se conservan al transferirlas.
- Bote de descanso y doble salario desactivados por defecto, configurables antes de empezar.

En Cambio de Color no se acumulan penalizaciones ni se exige anunciar la última carta. El +4 se puede jugar en cualquier turno propio y no tiene desafío. Después de robar solo se puede jugar esa carta. La última carta termina la partida inmediatamente.

## Sesiones y salas

El navegador conserva un secreto aleatorio de 256 bits en `sessionStorage`. El servidor deriva de él un identificador público con SHA-256 y autoriza mediante el socket. Declarar un identificador en una acción no concede acceso al jugador correspondiente.

El secreto no se incluye en estados, enlaces o registros. El nombre, la confirmación del perfil, el idioma y los favoritos son preferencias de `localStorage`; la sesión pertenece a la pestaña. Las pestañas duplicadas pueden compartir el secreto y no ocupar simultáneamente el mismo puesto. Una reconexión autenticada sustituye al socket anterior, aunque aún parezca conectado: esto permite cambiar de WiFi a datos móviles sin depender de la IP. La conexión anterior recibe `session:replaced` y solo puede recuperar el puesto mediante una acción explícita. Los reintentos transitorios mantienen el código de sala; solo `ROOM_UNAVAILABLE` o `NOT_A_MEMBER` lo descartan.

Una sesión ocupa una sala. Solo el anfitrión puede configurar opciones, añadir bots, empezar o preparar la revancha. Las opciones se validan contra valores permitidos. La revancha requiere una partida terminada y cambia el asiento inicial.

Las desconexiones reservan el sitio durante 180 segundos por defecto, configurables mediante `DISCONNECT_GRACE_PERIOD_MS`. Al volver se recupera el estado del jugador, también si ya hay resultado. Al salir o caducar la reserva, el motor resuelve el abandono. Si sale el anfitrión, el papel pasa a otro humano, dando prioridad a los conectados. Las reservas de otros jugadores mantienen su propio plazo y las salas sin personas se eliminan.

## Seguridad y recursos

Las reglas se ejecutan en el servidor. Dados, dinero y cartas no dependen de resultados enviados por el cliente. Cada participante recibe una proyección del estado que excluye manos ajenas y orden de los mazos.

Los mensajes tienen un máximo de 16 KiB. Cada conexión admite una ráfaga de 30 acciones y repone cinco por segundo. Los límites predeterminados son 120 intentos por IP y minuto, 30 conexiones por IP, 2.000 conexiones globales y 500 salas. Las salas caducan tras 30 minutos sin actividad humana y los contadores se limpian periódicamente.

Se comprueba el origen del handshake además de aplicar CORS con una lista explícita. Las conexiones sin `Origin` siguen necesitando una sesión válida. No se inserta HTML aportado por usuarios ni hay subidas de archivos, chat o ejecución de código de visitantes.

El servidor incluye CSP, protección contra iframes y MIME incorrecto, política de referencias y restricciones de cámara, micrófono y ubicación. Producción añade HSTS. CSP permite estilos en línea para los colores y posiciones de los tableros; los scripts se limitan al propio origen. Los assets con huella usan caché larga y el HTML puede actualizarse sin quedar congelado.

Node escucha en loopback por defecto. Docker publica el puerto en `127.0.0.1` y usa un usuario sin privilegios, sistema de archivos de solo lectura y límites de recursos. `TRUST_CLOUDFLARE` está desactivado por defecto: activarlo requiere que el origen esté aislado tras un proxy de confianza.

## Persistencia y crecimiento

Las salas están en memoria y pertenecen a un solo proceso. Un reinicio termina las partidas. Los límites configurados son protecciones, no una capacidad demostrada con pruebas de carga.

Para añadir instancias habría que asignar un propietario único a cada sala, serializar acciones, coordinar presencia y persistir estados si se quieren recuperar tras reinicios. Un adaptador Redis para Socket.IO solo distribuye eventos: no comparte ni protege el estado de los motores.

## Nombres y procedencia

Los nombres visibles son Ciudad Fortuna, Cambio de Color, Cuatro en Línea, Reversi, Tres en Raya y Dados al 100. Se mantienen las claves históricas `monopoly` y `colorclash` como identificadores técnicos. Los alias facilitan la búsqueda sin usarse como títulos ni afirmar afiliación.

Las ilustraciones SVG son propias. El código parte del proyecto proporcionado por su propietario; no se ha importado código o arte de richup.io. Un nombre distinto no garantiza por sí solo ausencia de conflictos de marca o derechos sobre materiales heredados. Referencia: [OMPI sobre videojuegos y propiedad intelectual](https://www.wipo.int/en/web/wipo-magazine/articles/video-games-and-ip-a-global-perspective-38773).

## Idiomas y primera visita

Español e inglés usan el mismo estado y las mismas acciones. Cambiar de idioma no recarga la página ni abandona la sala. Se ofrece el idioma del navegador cuando es compatible, con español como alternativa, y se recuerda la elección del usuario. El selector está disponible en catálogo, sala, partida y privacidad.

`apps/client/src/i18n/` contiene el registro de idiomas, formato monetario, traducciones y acceso al catálogo localizado. El español es el texto fuente; las traducciones inglesas viven en `en.ts`. Las claves se interpolan con parámetros, nunca concatenando o traduciendo apodos. `GameText` conserva las plantillas y sus valores en los mensajes de los motores; cada cliente los representa en su idioma. Los términos del juego se marcan explícitamente y los nombres de jugadores permanecen intactos. Las calles conservan sus nombres propios; las casillas especiales sí se traducen.

Para añadir un idioma: registrar código y formato en `LANGUAGES`, incorporar su diccionario a `dictionaries`, traducir también el contenido de `Privacy`, añadir el generador de apodos adecuado y ampliar la comprobación de cobertura. `pnpm test:i18n` detecta textos del catálogo, cartas, mensajes e interfaz sin traducción inglesa o con parámetros distintos. Los textos nuevos deben pasar por `t`, y los eventos nuevos por `message` y `term`.

La primera visita pide un apodo; no solicita identidad real ni crea cuentas. Se ofrece un nombre aleatorio y se puede editar el perfil más adelante. Elegir bots prepara la sala y deja configurar antes de empezar, igual que jugar con amigos.

## Tiempo y opciones por sala

Cada sala tiene un plazo de 30, 60, 90, 120 o 180 segundos, con 90 por defecto. El servidor publica el plazo y su hora; el cliente descuenta con un reloj monotónico local. Cambiar opciones está limitado al anfitrión y a salas en espera. Las acciones de gestión o los tratos no renuevan el turno; una nueva puja sí tiene un plazo propio. Los temporizadores se eliminan al finalizar, reiniciar o destruir una sala.

Al agotar el tiempo, Ciudad Fortuna tira si hace falta, rechaza compras pendientes, pasa en subastas y termina el turno. Si hay deuda, liquida bienes legalmente antes de continuar o declara bancarrota. Cambio de Color roba y pasa; Dados guarda los puntos disponibles o resuelve una tirada; los juegos de tablero realizan una jugada legal. Los dobles siguen perteneciendo al mismo plazo. La reconexión conserva el asiento, pero no detiene el reloj de la partida.

Además de las opciones originales, Ciudad Fortuna permite ajustar multa e intentos de cárcel, cobrar alquiler desde prisión y exigir construcción equilibrada. Cambio de Color admite manos iniciales de cinco, siete o nueve cartas. Las reglas durante la partida muestran las opciones reales de la sala junto a las reglas generales. El selector de comodín es un panel junto a la mano, con el número de cartas de cada color, sin superposición que la tape.

## Privacidad para el sitio público

La ruta `/privacy` informa en ambos idiomas sobre apodos, sesiones, IP de conexión, almacenamiento funcional, conservación, participantes y proveedores de red. Incluye la identificación y correo del responsable facilitados por el propietario para la transparencia del tratamiento: Samuel Ciocan, España, `contacto@samuelciocan.com`. No incluye domicilio, NIF ni otros datos comerciales no facilitados. No se han añadido analítica, anuncios, cuentas o cookies opcionales.

No guardar una base de datos no elimina el tratamiento: los identificadores y las IP pueden ser datos personales. La aplicación de la LSSI depende, entre otros factores, del carácter económico de la actividad; no se presupone que una web de ocio sin monetización necesite los mismos datos que una empresa. Antes de publicar, el operador debe comprobar la configuración efectiva de Cloudflare, sus registros y contrato de tratamiento, y adaptar el aviso si añade servicios, analítica, monetización o nuevos proveedores. El código no acredita por sí solo cumplimiento jurídico universal.

Fuentes consultadas: [AEPD: conceptos básicos e IP](https://www.aepd.es/preguntas-frecuentes/0-conceptos-basicos), [AEPD: protección por defecto](https://www.aepd.es/derechos-y-deberes/cumple-tus-deberes/medidas-de-cumplimiento/proteccion-de-datos-por-defecto), [LSSI: ámbito de aplicación](https://lssi.digital.gob.es/lssi/la-ley/preguntas-frecuentes), [política de Cloudflare](https://www.cloudflare.com/privacypolicy/).

## Referencia funcional

Se revisaron la portada de [Richup](https://richup.io/) y su [blog oficial](https://blog.richup.io/) el 15 de octubre de 2026. Se contrastaron la compra, alquiler, grupos, casas y hoteles, configuración, reloj y figuras distinguibles. Su sala pública permaneció en «Loading game…» desde el entorno de revisión, por lo que no se declara paridad completa con su versión actual.

Ciudad Fortuna conserva una variante propia: banco ilimitado, subastas por pujas de turno, sin transferencias de cartas de libertad ni modos de equipos. Las funciones sociales con cuentas, tienda, clasificaciones y torneos de Richup no forman parte de esta web de invitados. No se han copiado sus recursos o código. Estas diferencias deben permanecer explícitas al documentar o ampliar el juego.

## Herramientas y documentación

Prettier mantiene el formato del código y se configura en `package.json`. Reutiliza `.gitignore` para excluir archivos generados. `pnpm-lock.yaml` fija las dependencias y las instalaciones reproducibles utilizan `--frozen-lockfile`.

Las pruebas de reglas viven junto al paquete de motores; las de integración y navegador, en `tests/`. Sus resultados se guardan en `tests/.output/` y no se versionan.

El README explica cómo arrancar y la estructura. `CONTRIBUTING.md` describe el desarrollo, `TESTING.md` las comprobaciones y `DEPLOYMENT.md` el alojamiento. Este documento recoge las decisiones que cambian la arquitectura, las reglas o el funcionamiento compartido.
