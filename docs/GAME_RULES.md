# Reglas y variantes

La referencia visible para cada juego es `packages/sobremesa-logic/src/catalog.ts`; `settings.ts` declara las opciones y sus valores permitidos. El motor de `src/games/<juego>/` aplica esas reglas y sus pruebas verifican el comportamiento. Al cambiar una variante, mantén sincronizados esos tres lugares y sus traducciones. Esta guía reúne las particularidades que conviene conocer al mantener los motores.

## Reglas de las variantes

Las reglas del catálogo describen lo que ejecutan los motores. Cambiar una regla requiere actualizar ambos y las pruebas correspondientes.

### Ciudad Fortuna

La variante incluye:

- Compras, alquileres, edificios equilibrados, hipotecas, intercambios y cárcel.
- Las subastas son abiertas: cualquier jugador solvente puede pujar, la oferta debe superar la actual en 10 € como mínimo y pasar retira a ese postor. El reloj da 15 segundos y se reinicia con cada puja válida; al vencer, gana y paga la oferta más alta. Se cierra antes si ya no quedan posibles postores. Los bots pueden entrar en la subasta mientras el reloj corre.
- Cartas de libertad fuera del mazo hasta usarse o devolverse por abandono o bancarrota.
- Saldo negativo que impide tirar hasta recuperar dinero o declarar bancarrota.
- Sin límite de rondas por defecto. El anfitrión puede elegir 20, 40 o 60; al llegar al límite, gana el mayor patrimonio. Gana antes la última persona solvente. Patrimonio = efectivo + precio de propiedades + coste de edificios − valor de hipotecas. Igual patrimonio produce empate.
- Banco con edificios ilimitados y propiedades de bancarrota de vuelta al banco. Un abandono durante una subasta la cancela. Los tratos admiten dinero y propiedades sin edificios; las hipotecas se conservan al transferirlas. Un trato se cancela si deja de ser válido o cambia la hipoteca de un bien incluido. Los bots valoran los precios, las hipotecas y los grupos completos.
- Bote de descanso y doble salario desactivados por defecto, configurables antes de empezar.

### Cambio de Color

No se acumulan penalizaciones ni se exige anunciar la última carta. El +4 se puede jugar en cualquier turno propio y no tiene desafío. Después de robar solo se puede jugar esa carta. La última carta termina la partida inmediatamente.

## Motores y privacidad

### Ajedrez

El ajedrez usa [chess.js 1.4.0](https://jhlywa.github.io/chess.js/) (BSD-2-Clause) para jugadas legales, mate, ahogado, material y cincuenta movimientos. La repetición se contabiliza por posición FEN sin contadores para evitar reconstruir el historial en cada turno. Las tablas por triple repetición y cincuenta movimientos son automáticas por defecto. El anfitrión puede exigir su reclamación; la quinta repetición y los setenta y cinco movimientos siguen produciendo tablas automáticas, con prioridad del jaque mate, según las [reglas de la FIDE](https://handbook.fide.com/chapter/E012023). El bot explora dos medias jugadas; las búsquedas de damas y mancala también están acotadas. El generador de avisos incluye las dependencias del paquete de lógica y conserva la licencia original.

### Rummy de fichas

Rummy de fichas usa 106 fichas, dos comodines, atril de catorce fichas y apertura de 30 puntos, con [grupos y escaleras como referencia](https://rummikub.com/wp-content/uploads/2019/12/2600-English.pdf). Cada acción envía la propuesta completa de mesa: conserva todas las fichas anteriores, incorpora al menos una propia y deja únicamente combinaciones válidas. Antes de abrir no permite alterar ni aprovechar las combinaciones ajenas. El editor mantiene borradores privados con deshacer, división, unión y restauración. Los comodines se pueden reasignar al reorganizar y nunca volver al atril. Cada partida termina al vaciar un atril o tras una vuelta completa de pases con el pozo vacío; se muestran los puntos positivos y negativos, con penalización de 30 por comodín. El reloj descarta el borrador y roba una ficha o pasa.

### Dominó, Damas, Backgammon y dados

Dominó usa doble seis individual con robo y bloqueo. Damas aplica las [reglas inglesas de captura y coronación](https://wcdf.net/rules/rules_of_checkers_english.pdf), con tablas automáticas declaradas en el catálogo. Backgammon implementa [movimiento, barra, dados obligatorios y salida](https://usbgf.org/backgammon-basics-how-to-play/) en una partida sin cubo. Dados de combinaciones incluye las trece categorías, bonificaciones y reglas de comodín detalladas en la interfaz. Las diferencias de cada variante están escritas en sus reglas.

### Proyecciones privadas y bots

Los estados públicos de rummy y dominó incluyen solo la mano propia, el tamaño de las manos rivales y el tamaño del mazo. Batalla naval nunca envía la flota rival antes del resultado, y los bots eligen disparos únicamente desde su propia proyección. Impostor proyecta el papel y palabra propios, oculta los votos ajenos hasta el resultado y ofrece una victoria de equipo mediante `winnerIds`. Los bots de Impostor usan el banco público, su palabra cuando les corresponde y las pistas recibidas; nunca consultan la identidad secreta para votar. El impostor puede dar casualmente la palabra como pista: su validador no consulta el secreto para evitar convertir un rechazo en un oráculo de la palabra.

### Plazos y abandono

El reloj completa los turnos pendientes con acciones válidas: robo de fichas, dados y anotación, colocación y confirmación de flota, movimientos obligatorios y capturas encadenadas. Las nuevas rondas se detienen tras iniciarse para no consumir también el turno siguiente. En los duelos un abandono da la victoria al rival; las variantes de más jugadores retiran a quien abandona y continúan cuando queda el mínimo aplicable.

## Opciones y presupuestos de turno

`settings.ts` declara opciones, valores permitidos, valores predeterminados y textos de ayuda. El servidor valida ese mismo esquema, el motor recibe las reglas efectivas y la sala y el panel de reglas muestran esos valores. Solo el anfitrión puede cambiarlos mientras la sala espera; puede restaurar los valores predeterminados antes de empezar. Los juegos sin variantes conservan sus reglas publicadas y permiten ajustar el reloj.

Rummy permite ajustar apertura, tamaño del atril y comodines. Dominó permite configurar objetivo, límite de rondas y reparto. Impostor permite ajustar vueltas de pistas, categoría de palabras y visibilidad de la categoría. Mancala permite elegir semillas por hueco; Dados al 100, el objetivo; Dados de combinaciones, tiradas y bonificación superior; Batalla naval, turno extra al acertar; Damas, plazo de tablas sin captura ni avance de peón; Ajedrez, reclamación o aplicación automática de triple repetición y cincuenta movimientos.

El plazo pertenece al turno completo: ofrecer tablas, guardar dados, robar en dominó, colocar barcos, encadenar capturas o mover una parte de los dados de backgammon no renueva el presupuesto. Las fases de flota y disparos, los cambios de turno y las rondas nuevas reciben su plazo correspondiente. Las subastas y las decisiones de Ciudad Fortuna conservan su política propia.

## Parchís

Modalidad individual de un dado para dos, tres o cuatro personas, cuatro fichas por color, todas inicialmente en casa. Dos personas ocupan colores opuestos. La salida exige cinco, la meta exige cuenta exacta y no hay rebote. El primer asiento abre la partida y las revanchas rotan los asientos; no se hace una tirada previa de apertura. Los seguros, barreras, salida ocupada y premios se resuelven en el motor. La regla de tres seises usa la última ficha movida, incluidos los movimientos de premio, y protege las fichas que ya están en pasillo o meta. Si no hay movimiento se consume la tirada y se conserva la repetición cuando salió seis. Los premios se usan enteros o se pierden si no existe ningún movimiento legal.

Las reglas visibles del catálogo detallan las obligaciones de salir y abrir barrera. La geometría es un recorrido de 68 casillas y siete casillas de pasillo más meta por color. Referencias de mecánicas: [Ludoteka](https://www.ludoteka.com/juegos/parchis/reglas) y [Buho21](https://www.buho21.com/reglas/parchis.jsf), cuyas variantes de apertura y llegada no coinciden en todos los detalles. Los textos y SVG de Sobremesa son propios. No se incluyen equipos, dos dados ni rebote.

Los bots deciden únicamente con el tablero público. Cada movimiento y premio se valida en el servidor. Agotar el reloj completa la secuencia pendiente hasta pasar el turno, con el límite de acciones automáticas existente. Abandonar retira las cuatro fichas y conserva la partida entre los demás; la última persona activa gana. Los botones de fichas y el panel desplegable de posiciones dan una alternativa legible y por teclado al tablero visual. La animación reutiliza el ciclo de movimiento reducido y reconexión de los tableros existentes.

## Juego de la Oca

Variante de un dado para dos a seis personas, con salida en 0 y llegada exacta a 63. El recorrido, las ocas, puentes, dados, posada, pozo, laberinto, cárcel y calavera se describen en el catálogo y se calculan en el servidor. La posada penaliza un turno; la cárcel, dos; el pozo se libera por otra llegada o al cumplir tres turnos propios. Las esperas se descuentan automáticamente, incluso si todos esperan, sin dejar una sala bloqueada.

Se toma como referencia la [modalidad de un dado publicada por el Ayuntamiento de Pamplona](https://www.pamplona.es/sites/default/files/2021-08/Reglas%20del%20Juego%20de%20la%20Oca%202021.pdf). La oca 59 lleva a 63 sin victoria: la tirada siguiente retrocede. El exceso de una tirada rebota en meta; si termina sobre una oca durante el regreso, salta a la anterior y permite repetir. Cada salto se aplica una sola vez. Solo una tirada que termina exactamente en 63 declara la victoria. No se incluyen dos dados ni salidas especiales de nueve.

El SVG y la ilustración del catálogo son propios; los iconos reutilizan Lucide y conservan sus avisos de licencia existentes. Los jugadores se distinguen por número además de color, con posiciones y esperas legibles fuera del tablero. Los bots solo tiran el dado en su turno y el abandono conserva la partida entre las personas restantes.

## Go

Variante por área con superko posicional, suicidio prohibido y komi fijo de 7,5 para blancas, sin hándicap, en tableros de 9, 13 y 19. No se presenta como reglas japonesas ni como una reproducción literal del reglamento AGA: se declaran las decisiones de puntuación y repetición. Referencia de conceptos: [comparación de reglamentos de la British Go Association](https://www.britgo.org/rules/compare.html).

Dos pases abren una propuesta de retirada de grupos muertos. Las marcas abarcan grupos completos y cualquier cambio anula las dos confirmaciones. Solo ambos acuerdos sobre la misma propuesta terminan el juego. Reanudar restaura el turno posterior a los pases, las piedras originales y el historial de superko. Se resuelve la disputa mediante capturas. El timeout pasa en juego y reanuda en revisión; nunca acepta una propuesta humana. Los bots aceptan el recuento actual sin un análisis avanzado de grupos muertos.

El recuento suma piedras y regiones vacías adyacentes únicamente a un color, sin puntos extra por prisioneros; los espacios compartidos son neutrales. El historial de tableros permanece en el servidor para evitar transmitirlo en cada jugada. El servidor proyecta las colocaciones legales. El tablero permite explorar con flechas y colocar con Enter, y los tableros grandes se desplazan dentro de su superficie sin ensanchar la página.

## Damas chinas

Estrella tradicional de 121 huecos, diez fichas por persona y configuraciones de 2, 3, 4 o 6 participantes. El catálogo detalla posiciones iniciales, pasos y saltos encadenados sobre cualquier color sin capturas. Referencia de las mecánicas tradicionales: [reglamento histórico publicado por Hasbro](https://www.hasbro.com/common/instruct/ChineseCheckers%281938%29.PDF). Los textos, el código y los SVG se han creado para Sobremesa.

La variante permite atravesar otros triángulos, pero una ficha que entra en su destino no puede salir de él. Para prevenir ciclos sin fijar un límite de turnos, la triple repetición de tablero y turno termina en tablas; también lo hace el bloqueo de todas las personas activas. Solo se permite pasar cuando no existen movimientos. El abandono retira las fichas y mantiene el resto de la partida.

El servidor valida cada tramo completo de la ruta y conserva el historial de repetición. El tablero muestra un recorrido legal por destino y requiere confirmarlo antes de mover. Los selectores de ficha y destino ofrecen controles grandes alternativos al tablero, utilizable por teclado. En pantallas pequeñas se ve la estrella completa; «Ampliar tablero» aumenta los objetivos y desplaza solo su superficie. Los selectores conservan siempre su tamaño legible. Los bots usan el tablero público y priorizan llenar el fondo del triángulo antes que su entrada.

## Mahjong tradicional

Mahjong multijugador de Hong Kong antiguo para cuatro personas, con 136 fichas y sin flores ni estaciones. Se juega una mano en ronda Este; no una partida completa de cuatro rondas de viento. La revancha rota los asientos. Las reglas del catálogo especifican el mínimo de fan configurable (0, 1 o 3), el límite fijo de cuatro fan y los pagos en puntos. Se admiten cuatro combinaciones y pareja, o trece huérfanos. Siete parejas no es una forma especial. Se han contrastado mecánicas y variantes de mesa con las [reglas de Hong Kong antiguo publicadas en Tabletopia](https://c.tabletopia.com/games/old-hong-kong-mahjong/rules/mahjong-rules/en); no se presenta esta selección de convenciones como un reglamento universal.

Se incluyen reclamaciones de escaleras, tríos y kongs, kongs ocultos y añadidos, reposiciones desde el final del muro y robo del kong añadido. Los kongs ocultos no se roban en esta variante. La ventana de respuesta pasa por los otros tres asientos, ocho segundos por persona, y sus decisiones se resuelven juntas respetando prioridad y cercanía. Pasar un Mahjong impide reclamar ese tipo hasta el siguiente robo. El último descarte se puede reclamar aunque no queden fichas para robar.

La puntuación considera todas las descomposiciones válidas y selecciona la mejor. Las convenciones de bonos, límites y pagos están en las reglas visibles. No hay bonos de flores, siete parejas ni bonificación por mano oculta. Los puntos base van de 1 a 16; los pagos se conservan a suma cero. Un empate por muro agotado no puntúa. Un abandono cancela la mano sin puntos, preservando la privacidad de las manos perdedoras y de los kongs ocultos. Solo se revela la mano ganadora.

La fábrica del servidor utiliza aleatoriedad criptográfica para barajar. La proyección elimina muro, respuestas pendientes, restricciones privadas y fichas ajenas. Los bots deciden usando únicamente su propia proyección y sus opciones legales. El tablero requiere seleccionar y confirmar el descarte, ofrece controles por teclado y muestra el significado de cada ficha al seleccionarla. Las caras y el arte SVG son propios, con números, figuras geométricas e ideogramas tradicionales.

## Brisca

Brisca de cuarenta cartas para dos jugadores o cuatro por parejas alternas, con tres cartas en mano y sin obligación de asistir, ni siquiera al agotarse el mazo. Se mantienen la jerarquía, los 120 puntos por reparto, el robo desde el ganador y el triunfo visible como última carta. Referencia de mecánicas: [reglas de Fournier](https://www.nhfournier.es/como-jugar/brisca/). Los naipes de Sobremesa utilizan símbolos SVG geométricos propios y denominaciones tradicionales; no incorporan caras ni ilustraciones del fabricante.

El cambio opcional permite al ganador sustituir un triunfo que puntúa por el siete, o uno sin puntos por el dos, antes del robo; el último robo no admite cambios. Un empate a sesenta anula el reparto. La sala permite objetivos de una, tres o cinco victorias y desactivar los cambios. El dador avanza entre repartos. Los compañeros comparten tanteo y victoria, conservando sus manos privadas; no se ofrecen señas digitales. Un abandono concede la victoria al otro bando.

El servidor baraja mediante criptografía, valida cada carta y conserva el mazo oculto. Los bots deciden con su mano y las cartas públicas. La secuencia de cambio y robo comparte el presupuesto del siguiente turno. El tablero permite seleccionar y confirmar por teclado, muestra cartas y tanteos, y utiliza el movimiento común con preferencia de movimiento reducido.

## Mus, Escoba y Cinquillo

Mus utiliza ocho reyes y ocho ases, cuatro jugadores por parejas alternas y un juego a 30 o 40 piedras. Incluye mus unánime, descartes, declaraciones comprobadas, Grande, Chica, Pares y Juego o Punto, dejes, reenvidos y órdagos. Los lances aceptados se cobran por orden; un órdago aceptado decide el juego inmediatamente. No incluye señas ni mus corrido inicial. Escoba utiliza cuarenta cartas y partidas individuales de dos a cuatro: captura obligatoria con la carta elegida si suma quince, escobas y mayorías de cartas, oros y sietes, con punto compartido para las mayorías empatadas. Cinquillo reparte las cuarenta cartas entre tres y seis participantes, abre con cinco de oros, obliga a jugar si es posible y termina al vaciar la primera mano. Las variantes y abandonos se detallan en el catálogo. Fuentes de contraste: [Mus](https://www.nhfournier.es/como-jugar/mus/), [Escoba](https://www.ludoteka.com/juegos/escoba/reglas) y [Cinquillo](https://www.ludoteka.com/juegos/cinquillo/reglas). Naipes y textos propios.

## Texas Hold’em

Torneo de dos a ocho con 1.000 fichas ficticias por persona, sin valor económico, recompras ni premios. Ciegas 10/20, duplicadas cada cinco manos y limitadas al total inicial. Incluye heads-up, calles, all-in y reapertura acumulada de subidas cortas, mejor combinación de cinco entre siete, desempates, botes secundarios, devoluciones y fichas impares por asiento desde la izquierda del botón. Solo se revelan manos no retiradas en el showdown. El catálogo especifica la retirada por abandono y la política de reloj. Referencia mecánica: [reglas de Texas Hold’em](https://www.pokerstars.com/poker/games/texas-holdem/); no se utilizan servicios ni recursos de esa plataforma.

## Palabras y juegos sociales originales

Palabras cruzadas tiene un tablero propio 11×11 sin multiplicadores, bolsa propia, siete letras por atril y diccionario local ES o EN. Se validan centro, conexión, continuidad y todas las palabras cruzadas en el servidor; se puntúan sus letras y un bono de diez por usar siete. Dos vueltas sin colocaciones o vaciar un atril con bolsa agotada cierran el recuento. Licencias y procedencia en [LEGAL.md](LEGAL.md).

Preguntas y respuestas incluye 72 preguntas bilingües propias, seis categorías y de tres a ocho preguntas por participante; acierto diez puntos, error cero, empate compartido. Dibuja y adivina requiere tres a diez humanos, conceptos propios bilingües, hasta dos vueltas, elección privada, lienzo temporal, respuestas limitadas y marcador por orden de acierto. No graba audio ni conserva dibujos. Dispone de coordenadas y formas por teclado como alternativa al gesto.

Misterio y deducción plantea el caso original de la lente de Bruma: seis personajes, seis lugares y seis objetos; tres cartas forman la solución y el resto son pistas privadas. Las hipótesis reciben una refutación privada por orden de asiento; las acusaciones finales se comparan en el servidor y fallar elimina de investigar, manteniendo la obligación de mostrar pistas. Conquista de territorios utiliza un mapa propio de 18 posiciones y tres regiones, refuerzos, hasta tres combates por turno y un traslado conectado. Gana el control de doce posiciones al cerrar turno o el mejor control al cerrar quince rondas. El catálogo precisa apoyos, dados, bajas, empates, límites y abandono.

## Impostor presencial

Online conserva pistas escritas y votos digitales. Presencial permite pistas habladas, votos digitales secretos o totales físicos registrados por el anfitrión, desempate y último intento hablado confirmado en dos pasos. El recuento físico no representa votos individuales. El anfitrión migra cuando corresponde; solo él confirma esas fases. Los plazos marcan pistas agotadas, abstenciones o intento fallido, sin grabar voz.

La opción de un solo móvil se abre desde Impostor: tres a diez nombres, ajustes existentes, pantalla neutral y revelación individual. Ocultar y pasar desmonta el papel anterior; cambiar de pestaña o perder foco lo oculta. No se guardan secretos. Después se usan pistas y recuento físicos, sin reloj automático local. Otra ronda vuelve a repartir papeles; recargar descarta el estado local.
