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
