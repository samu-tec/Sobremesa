import type { GameType } from './types/index.js';

export interface GameDefinition {
  id: GameType;
  name: string;
  category: 'Estrategia' | 'Cartas' | 'Clásicos' | 'Dados';
  description: string;
  duration: string;
  minPlayers: number;
  maxPlayers: number;
  rules: string[];
  tip: string;
}

export const GAME_DEFINITIONS = {
  monopoly: {
    id: 'monopoly',
    name: 'Ciudad Fortuna',
    category: 'Estrategia',
    duration: '30–90 min',
    minPlayers: 2,
    maxPlayers: 6,
    description: 'Compra calles, negocia con tus amigos y construye tu pequeño gran imperio.',
    rules: [
      'Por defecto, empiezas con 1.500 €. Tira dos dados y avanza por las 40 casillas. Al pasar por Salida cobras 200 €.',
      'Compra una propiedad libre o déjala en subasta. Todos los jugadores solventes pueden pujar, incluido quien rechazó comprarla. Cada oferta debe superar la anterior en al menos 10 €. La puja más alta gana cuando termina el plazo; cada nueva puja válida reinicia los 15 segundos. Pasar te retira de esa subasta.',
      'Paga alquiler al caer en propiedades rivales. Un grupo de calles completo duplica el alquiler sin edificios. Las hipotecas no cobran alquiler.',
      'Completa un grupo de color para construir, de forma equilibrada, hasta cuatro casas y un hotel. La banca tiene suministro ilimitado. Puedes vender edificios por la mitad del coste e hipotecar el grupo cuando no tenga edificios.',
      'Los dobles permiten repetir; tres dobles seguidos te llevan a la cárcel. Sales con dobles, carta o pagando 50 €. Tras tres intentos pagas y avanzas; salir con dobles no da una tirada extra.',
      'Puedes intercambiar dinero y propiedades sin edificios. Para recuperar una hipoteca pagas su valor más un 10 %. El receptor de una propiedad hipotecada conserva esa hipoteca.',
      'Por defecto no hay límite de rondas: gana la última persona solvente. Si el anfitrión fija un límite de 20, 40 o 60 rondas, gana quien tenga más patrimonio al alcanzarlo: efectivo + precio de propiedades + coste de edificios − hipotecas. Los empates se comparten. Si declaras bancarrota, tus propiedades vuelven al banco. Abandonar equivale a bancarrota.',
      'Las cartas, los impuestos y el bote opcional se resuelven automáticamente. Antes de empezar, el anfitrión puede ajustar dinero, salario, subastas, cárcel, construcción y bote de descanso. Las opciones de la sala prevalecen sobre estos valores predeterminados.',
    ],
    tip: 'Completa grupos de color y guarda efectivo para los alquileres.',
  },
  colorclash: {
    id: 'colorclash',
    name: 'Cambio de Color',
    category: 'Cartas',
    duration: '5–15 min',
    minPlayers: 2,
    maxPlayers: 4,
    description: 'Un color, un número y el momento perfecto para cambiarlo todo.',
    rules: [
      'Cada jugador recibe siete cartas por defecto; el anfitrión puede elegir cinco o nueve. Gana quien se queda sin cartas primero.',
      'Juega una carta del mismo color o valor que la carta central, o un comodín y elige color.',
      'Si robas, solo puedes jugar la carta recién robada cuando sea válida; también puedes pasar. Si no sirve, el turno pasa automáticamente.',
      'Salto hace perder el turno; Cambio invierte el sentido (con dos jugadores, vuelves a jugar). +2 y +4 hacen robar y perder el turno. No se acumulan penalizaciones.',
      'El +4 se puede jugar en cualquier momento de tu turno. No hay desafío ni penalización por no anunciar la última carta: estas son las reglas de esta variante.',
      'La última carta termina la partida inmediatamente. El mazo se repone con los descartes cuando hace falta.',
    ],
    tip: 'Reserva un comodín para cuando cambie el color de la mesa.',
  },
  connect4: {
    id: 'connect4',
    name: 'Cuatro en Línea',
    category: 'Clásicos',
    duration: '3–10 min',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Deja caer tu ficha. Conecta cuatro. Haz que cada movimiento cuente.',
    rules: [
      'Dos jugadores alternan turnos en un tablero de siete columnas y seis filas.',
      'Elige una columna con espacio. Tu ficha cae a la casilla libre más baja.',
      'Gana quien une cuatro fichas en horizontal, vertical o diagonal.',
      'Si el tablero se llena sin una línea ganadora, la partida termina en empate.',
    ],
    tip: 'Controla el centro y vigila las diagonales de tu rival.',
  },
  reversi: {
    id: 'reversi',
    name: 'Reversi',
    category: 'Estrategia',
    duration: '10–20 min',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Dale la vuelta al tablero. Una sola ficha puede cambiar la partida.',
    rules: [
      'El tablero empieza con cuatro fichas en el centro. Las oscuras juegan primero.',
      'Coloca una ficha de modo que encierres al menos una ficha rival entre la nueva y otra tuya, en línea recta en cualquiera de las ocho direcciones.',
      'Todas las fichas encerradas pasan a ser tuyas. Los puntos indican las jugadas válidas.',
      'Si no tienes jugadas, pasas automáticamente. Cuando nadie puede mover o el tablero se llena, gana quien tenga más fichas. Un mismo número produce empate.',
    ],
    tip: 'Las esquinas son seguras: una vez conquistadas no se pueden voltear.',
  },
  tictactoe: {
    id: 'tictactoe',
    name: 'Tres en Raya',
    category: 'Clásicos',
    duration: '1–3 min',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'El clásico de siempre. Tres casillas para una pequeña gran victoria.',
    rules: [
      'Dos jugadores colocan X y O por turnos en una cuadrícula de 3 × 3.',
      'Gana quien completa una fila, columna o diagonal con sus tres símbolos.',
      'Si se ocupan todas las casillas sin ganador, hay empate.',
      'El bot busca su mejor jugada: con una buena estrategia puedes empatar.',
    ],
    tip: 'Empieza por el centro y bloquea las parejas de tu rival.',
  },
  pig: {
    id: 'pig',
    name: 'Dados al 100',
    category: 'Dados',
    duration: '5–15 min',
    minPlayers: 2,
    maxPlayers: 4,
    description: 'Una tirada más… ¿o mejor guardar? La suerte también se decide.',
    rules: [
      'Por turnos, tira un dado tantas veces como quieras. Del 2 al 6 sumas puntos temporales.',
      'Puedes plantarte para guardar los puntos del turno en tu marcador y pasar el dado.',
      'Si sale 1, pierdes todos los puntos temporales y pasa el turno. Los puntos ya guardados se conservan.',
      'Por defecto gana quien guarda al menos 100 puntos. El objetivo puede ajustarse antes de empezar. Solo puedes plantarte si has sumado puntos.',
    ],
    tip: 'Plantarte con unos 20 puntos suele ser una buena decisión.',
  },

  rummy: {
    id: 'rummy',
    name: 'Rummy de fichas',
    category: 'Clásicos',
    duration: '15–40 min',
    minPlayers: 2,
    maxPlayers: 4,
    description: 'Forma grupos y escaleras, reorganiza la mesa y coloca todas tus fichas.',
    rules: [
      'Por defecto hay 106 fichas: dos copias del 1 al 13 en cuatro colores y dos comodines. Cada persona recibe catorce. Puedes ajustar el reparto, la apertura y los comodines en la sala. El objetivo es vaciar el atril.',
      'Los grupos tienen tres o cuatro fichas del mismo número y colores distintos. Las escaleras tienen al menos tres números consecutivos del mismo color. El 1 solo va antes del 2, nunca después del 13.',
      'Por defecto, para abrir necesitas combinaciones que sumen al menos 30 puntos y estén formadas solo por fichas de tu atril. Un comodín vale el número que representa. En ese turno no puedes modificar combinaciones anteriores.',
      'Después de abrir puedes añadir, separar y reorganizar libremente las combinaciones de toda la mesa. Debes jugar al menos una ficha propia y dejar todas las fichas de la mesa en combinaciones válidas. Ninguna puede volver a tu atril.',
      'Los comodines sustituyen cualquier ficha y pueden reasignarse al reorganizar, pero deben seguir en una combinación válida al confirmar. Si conservas un comodín al terminar, penaliza 30 puntos.',
      'Selecciona fichas y usa Crear combinación o Colocar aquí. Puedes desmontar grupos, deshacer y restaurar la mesa. Los cambios son privados hasta Confirmar jugada; el servidor solo acepta la mesa completa y válida.',
      'Si no juegas, roba una ficha y pasa; no puedes usarla hasta tu siguiente turno. Si se agota el pozo, puedes pasar sin robar. Al agotarse el reloj se restaura la mesa y se roba o pasa automáticamente.',
      'Gana quien vacía el atril y suma el valor de las fichas rivales, que puntúan en negativo para sus dueños. Si todos pasan con el pozo vacío, gana el atril de menor valor y se puntúan las diferencias. Si empatan los menores, la partida termina en empate.',
    ],
    tip: 'Abre con 30 puntos y observa la mesa: separar una escalera puede liberar la ficha que necesitas.',
  },
  chess: {
    id: 'chess',
    name: 'Ajedrez',
    category: 'Estrategia',
    duration: '10–60 min',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Cada pieza cuenta. Prepara tu ataque y protege a tu rey.',
    rules: [
      'Las blancas mueven primero. Selecciona una pieza para ver sus destinos legales. Gana quien da jaque mate al rey rival.',
      'Se aplican los movimientos completos de las piezas, el enroque, la captura al paso y la promoción a dama, torre, alfil o caballo. No se permite dejar al propio rey en jaque.',
      'Por defecto, el ahogado, el material insuficiente para dar mate, la triple repetición y los cincuenta movimientos sin capturas ni avance de peón producen tablas automáticas. Si desactivas las tablas automáticas, puedes reclamarlas cuando se cumplan en tu turno; la quinta repetición y los 75 movimientos siempre terminan en tablas.',
      'Puedes ofrecer tablas durante tu turno y aceptar una oferta rival. Puedes rendirte en cualquier momento. El reloj de sala es por turno; al agotarse, el servidor juega una jugada legal.',
    ],
    tip: 'Desarrolla tus piezas y comprueba las amenazas antes de mover.',
  },
  impostor: {
    id: 'impostor',
    name: 'Impostor',
    category: 'Clásicos',
    duration: '5–15 min',
    minPlayers: 3,
    maxPlayers: 10,
    description:
      'Todos conocen la palabra… salvo el impostor. Da pistas y descubre quién disimula.',
    rules: [
      'De tres a diez jugadores. Todos reciben la misma palabra secreta salvo el impostor. Por defecto, el impostor solo conoce la categoría. Tu identidad y palabra solo aparecen en tu pantalla.',
      'Por defecto hay dos vueltas de pistas. En cada turno da una sola palabra de 2 a 30 letras, sin decir la palabra secreta si la conoces. Antes de empezar puedes cambiar las vueltas, elegir un tema y mostrar u ocultar la categoría.',
      'Después se vota por turnos en secreto. No puedes votarte. La persona con más votos queda acusada; si empatan, se repite la votación entre los empatados. Un segundo empate deja escapar al impostor.',
      'Si se acusa a un inocente, gana el impostor. Si se descubre al impostor, aún puede ganar adivinando la palabra en un único intento. Se aceptan la palabra española o inglesa. Si falla, ganan todos los inocentes.',
      'Los votos y el papel del impostor se revelan al terminar. Si el impostor abandona, ganan los inocentes; si quedan menos de tres personas, gana el impostor. Los bots deducen a partir de su propia información.',
    ],
    tip: 'Da una pista que entiendan los tuyos sin regalar la palabra al impostor.',
  },
  dominoes: {
    id: 'dominoes',
    name: 'Dominó',
    category: 'Clásicos',
    duration: '15–30 min',
    minPlayers: 2,
    maxPlayers: 4,
    description: 'Une los extremos, lee la mesa y encuentra el momento de cerrar.',
    rules: [
      'Dominó individual de doble seis, de dos a cuatro personas. Se reparten siete fichas por jugador; las restantes forman el pozo. Abre el doble más alto repartido, o la ficha de mayor suma si no hay dobles.',
      'Coloca una ficha que coincida con un extremo de la cadena. Selecciona primero tu ficha y luego el extremo izquierdo o derecho.',
      'Si no puedes colocar, roba del pozo hasta poder jugar. Solo pasas cuando no puedes jugar y el pozo está vacío. No se puede robar ni pasar si tienes una ficha válida.',
      'Cierra quien se queda sin fichas y suma los puntos de las manos rivales. Si todos pasan, gana la mano de menor suma y puntúa las diferencias. Si hay empate de menor suma, nadie puntúa.',
      'Por defecto se juega hasta alcanzar 100 puntos o completar cinco rondas. Gana la puntuación más alta; si coinciden, hay empate. El anfitrión puede cambiar el objetivo, el máximo de rondas y el reparto antes de empezar.',
    ],
    tip: 'Libera fichas altas y observa qué números no pueden jugar tus rivales.',
  },
  checkers: {
    id: 'checkers',
    name: 'Damas',
    category: 'Estrategia',
    duration: '10–30 min',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Captura, encadena saltos y corona tus fichas.',
    rules: [
      'Variante de damas inglesas en tablero de 8 × 8, con doce fichas por bando. Las oscuras, situadas abajo, empiezan. Se juega sobre las casillas oscuras.',
      'Una ficha avanza una casilla en diagonal. Para capturar, salta hacia delante sobre una ficha rival hasta una casilla vacía. Capturar es obligatorio si hay alguna captura disponible.',
      'Debes continuar una cadena de capturas con la misma ficha hasta que no pueda saltar más. Puedes elegir entre las capturas posibles; no hay obligación de elegir la cadena más larga.',
      'Al llegar a la última fila, tu ficha se convierte en dama y termina su turno. Las damas avanzan y capturan en ambas direcciones, siempre a distancia de una casilla o un salto.',
      'Ganas si el rival se queda sin fichas o sin movimientos. Hay tablas por triple repetición o, por defecto, tras 80 jugadas consecutivas de damas sin capturas ni movimientos de fichas sin coronar. El límite se puede cambiar en la sala.',
    ],
    tip: 'No dejes capturas dobles y lleva tus fichas hacia la coronación.',
  },
  backgammon: {
    id: 'backgammon',
    name: 'Backgammon',
    category: 'Estrategia',
    duration: '10–30 min',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Corre con tus quince fichas, captura al rival y sácalas antes que nadie.',
    rules: [
      'Partida individual sin cubo de doblaje. Cada bando tiene quince fichas en la disposición clásica. Cada jugador tira un dado para abrir; el mayor empieza utilizando esos dos valores. Los empates de apertura se repiten.',
      'Las claras avanzan desde el punto 24 hacia el 1; las oscuras, del 1 al 24. Cada dado mueve una ficha por separado. Los dobles permiten cuatro movimientos del mismo valor.',
      'No puedes caer en un punto con dos o más fichas rivales. Una ficha rival sola se captura y va a la barra. Si tienes fichas en la barra, debes reintroducirlas antes de mover las demás.',
      'Debes gastar tantos dados como sea posible. Si solo puedes usar uno de dos dados distintos, debes usar el mayor cuando sea posible. Solo se muestran movimientos que cumplen estas obligaciones.',
      'Con todas tus fichas en tus seis puntos de casa, puedes sacarlas con el valor exacto o uno mayor si no queda ninguna ficha más alejada. Gana quien saca las quince. Se indica victoria simple, gammon o backgammon según la posición rival.',
    ],
    tip: 'Forma puntos con dos fichas y evita dejar fichas solas al alcance del rival.',
  },
  battleship: {
    id: 'battleship',
    name: 'Batalla naval',
    category: 'Estrategia',
    duration: '10–25 min',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Oculta tu flota y encuentra los barcos rivales, coordenada a coordenada.',
    rules: [
      'Cada jugador coloca cinco barcos de longitudes 5, 4, 3, 3 y 2 en su cuadrícula de 10 × 10. Pueden tocarse, pero no solaparse ni salir del tablero.',
      'Elige longitud y orientación y toca la casilla inicial de cada barco, o usa Colocación aleatoria. Puedes retirar barcos antes de confirmar con Flota lista. La colocación se realiza por turnos y se mantiene oculta.',
      'Cuando ambas flotas están listas, empieza el primer jugador. Elige una coordenada rival: puede ser agua, tocado o hundido. Por defecto cada disparo pasa el turno; con Repetir turno al acertar, un impacto permite volver a disparar.',
      'No puedes disparar dos veces a la misma casilla. Gana quien hunde los cinco barcos rivales. Las posiciones enemigas completas solo se revelan al terminar.',
    ],
    tip: 'Después de un impacto, busca en las casillas vecinas para seguir el barco.',
  },
  mancala: {
    id: 'mancala',
    name: 'Mancala',
    category: 'Estrategia',
    duration: '5–20 min',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Siembra semillas, prepara capturas y llena tu almacén.',
    rules: [
      'Variante Kalah: seis hoyos por jugador y un almacén a cada lado. Por defecto hay cuatro semillas por hoyo; puedes elegir entre tres y seis antes de empezar. Tu fila aparece abajo y tu almacén a la derecha.',
      'Elige un hoyo de tu lado y reparte sus semillas de una en una en sentido antihorario. Incluye tu almacén y salta siempre el almacén rival.',
      'Si la última semilla cae en tu almacén, repites turno. Si cae en un hoyo propio que estaba vacío y enfrente hay semillas, capturas esas semillas y la última que sembraste.',
      'Cuando una fila se queda vacía, termina la partida. Las semillas que quedan pasan al almacén de su dueño. Gana quien reúne más semillas. Si ambos almacenes tienen la misma cantidad, hay empate. No se aplica intercambio de lados.',
    ],
    tip: 'Busca turnos extra y vigila los hoyos vacíos que pueden capturar.',
  },
  combinations: {
    id: 'combinations',
    name: 'Dados de combinaciones',
    category: 'Dados',
    duration: '15–30 min',
    minPlayers: 2,
    maxPlayers: 6,
    description: 'Cinco dados, trece casillas y una última oportunidad para mejorar tu tirada.',
    rules: [
      'De dos a seis jugadores. Por defecto tienes hasta tres tiradas con cinco dados; puedes elegir una, dos o tres antes de empezar. Entre tiradas, toca los dados que quieras guardar. Después anota una categoría libre, aunque valga cero.',
      'Unos a seises suman solo los dados del valor indicado. Por defecto, sumar al menos 63 en estas seis categorías da 35 puntos de bonificación. Esta bonificación se puede desactivar en la sala.',
      'Trío y póquer suman los cinco dados si hay al menos tres o cuatro iguales. Full (tres más dos) vale 25; escalera corta de cuatro valores, 30; escalera larga de cinco, 40; cinco iguales, 50. Azar suma los cinco dados.',
      'Si ya anotaste 50 en cinco iguales, cada nuevo cinco iguales añade 100. Debes anotarlo en su casilla superior si está libre; si está ocupada, en una inferior libre usando el comodín para full o escaleras. Si no queda ninguna inferior, usa una superior libre.',
      'La partida termina cuando todos completan sus trece categorías. Se suman categorías y bonificaciones; gana la puntuación más alta y los empates se comparten.',
    ],
    tip: 'Cuida la sección superior: la bonificación de 35 puede decidir la partida.',
  },
} satisfies { [K in GameType]: GameDefinition & { id: K } };

export const GAME_CATALOG: readonly GameDefinition[] = Object.values(GAME_DEFINITIONS);

export function getGame(id: GameType): GameDefinition {
  const game = Object.hasOwn(GAME_DEFINITIONS, id) ? GAME_DEFINITIONS[id] : undefined;
  if (!game) throw new Error('Juego desconocido');
  return game;
}

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function matchesGame(game: GameDefinition, query: string): boolean {
  const haystack = normalizeSearch([game.name, game.description, game.category].join(' '));
  return normalizeSearch(query)
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}
