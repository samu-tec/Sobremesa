import type { GameType } from './types/index.js';

export interface GameDefinition {
  id: GameType;
  name: string;
  category: 'Estrategia' | 'Cartas' | 'Clásicos' | 'Dados';
  description: string;
  duration: string;
  minPlayers: number;
  maxPlayers: number;
  aliases: string[];
  rules: string[];
  tip: string;
}

// Search aliases are discovery metadata, never titles or claims of affiliation.
export const GAME_CATALOG: readonly GameDefinition[] = [
  {
    id: 'monopoly',
    name: 'Ciudad Fortuna',
    category: 'Estrategia',
    duration: '30–90 min',
    minPlayers: 2,
    maxPlayers: 6,
    description: 'Compra calles, negocia con tus amigos y construye tu pequeño gran imperio.',
    aliases: ['monopoly', 'monopoli', 'capital clash', 'richup', 'inmobiliario', 'propiedades'],
    rules: [
      'Por defecto, empiezas con 1.500 €. Tira dos dados y avanza por las 40 casillas. Al pasar por Salida cobras 200 €.',
      'Compra una propiedad libre o déjala en subasta. Todos los jugadores solventes pueden pujar, incluido quien rechazó comprarla. La puja mínima aumenta 10 €; pasar te retira de esa subasta.',
      'Paga alquiler al caer en propiedades rivales. Un grupo de calles completo duplica el alquiler sin edificios. Las hipotecas no cobran alquiler.',
      'Completa un grupo de color para construir, de forma equilibrada, hasta cuatro casas y un hotel. La banca tiene suministro ilimitado. Puedes vender edificios por la mitad del coste e hipotecar el grupo cuando no tenga edificios.',
      'Los dobles permiten repetir; tres dobles seguidos te llevan a la cárcel. Sales con dobles, carta o pagando 50 €. Tras tres intentos pagas y avanzas; salir con dobles no da una tirada extra.',
      'Puedes intercambiar dinero y propiedades sin edificios. Para recuperar una hipoteca pagas su valor más un 10 %. El receptor de una propiedad hipotecada conserva esa hipoteca.',
      'Si debes dinero, vende o hipoteca antes de continuar. Si declaras bancarrota, tus propiedades vuelven al banco. Gana la última persona solvente. Si se alcanza el límite de rondas (40 por defecto), gana el mayor patrimonio: efectivo + precio de propiedades + coste de edificios − hipotecas. Los empates se comparten. Abandonar equivale a bancarrota.',
      'Las cartas, los impuestos y el bote opcional se resuelven automáticamente. Antes de empezar, el anfitrión puede ajustar dinero, salario, subastas, cárcel, construcción y bote de descanso. Las opciones de la sala prevalecen sobre estos valores predeterminados.',
    ],
    tip: 'Completa grupos de color y guarda efectivo para los alquileres.',
  },
  {
    id: 'colorclash',
    name: 'Cambio de Color',
    category: 'Cartas',
    duration: '5–15 min',
    minPlayers: 2,
    maxPlayers: 4,
    description: 'Un color, un número y el momento perfecto para cambiarlo todo.',
    aliases: ['uno', 'color clash', 'cartas', 'colores'],
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
  {
    id: 'connect4',
    name: 'Cuatro en Línea',
    category: 'Clásicos',
    duration: '3–10 min',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Deja caer tu ficha. Conecta cuatro. Haz que cada movimiento cuente.',
    aliases: ['conecta 4', 'connect four', 'connect4', 'cuatro en raya', '4 en raya'],
    rules: [
      'Dos jugadores alternan turnos en un tablero de siete columnas y seis filas.',
      'Elige una columna con espacio. Tu ficha cae a la casilla libre más baja.',
      'Gana quien une cuatro fichas en horizontal, vertical o diagonal.',
      'Si el tablero se llena sin una línea ganadora, la partida termina en empate.',
    ],
    tip: 'Controla el centro y vigila las diagonales de tu rival.',
  },
  {
    id: 'reversi',
    name: 'Reversi',
    category: 'Estrategia',
    duration: '10–20 min',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Dale la vuelta al tablero. Una sola ficha puede cambiar la partida.',
    aliases: ['othello', 'reversi', 'fichas', 'voltear'],
    rules: [
      'El tablero empieza con cuatro fichas en el centro. Las oscuras juegan primero.',
      'Coloca una ficha de modo que encierres al menos una ficha rival entre la nueva y otra tuya, en línea recta en cualquiera de las ocho direcciones.',
      'Todas las fichas encerradas pasan a ser tuyas. Los puntos indican las jugadas válidas.',
      'Si no tienes jugadas, pasas automáticamente. Cuando nadie puede mover o el tablero se llena, gana quien tenga más fichas. Un mismo número produce empate.',
    ],
    tip: 'Las esquinas son seguras: una vez conquistadas no se pueden voltear.',
  },
  {
    id: 'tictactoe',
    name: 'Tres en Raya',
    category: 'Clásicos',
    duration: '1–3 min',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'El clásico de siempre. Tres casillas para una pequeña gran victoria.',
    aliases: ['tic tac toe', 'tictactoe', 'tres en linea', '3 en raya', 'equis', 'gato'],
    rules: [
      'Dos jugadores colocan X y O por turnos en una cuadrícula de 3 × 3.',
      'Gana quien completa una fila, columna o diagonal con sus tres símbolos.',
      'Si se ocupan todas las casillas sin ganador, hay empate.',
      'El bot busca su mejor jugada: con una buena estrategia puedes empatar.',
    ],
    tip: 'Empieza por el centro y bloquea las parejas de tu rival.',
  },
  {
    id: 'pig',
    name: 'Dados al 100',
    category: 'Dados',
    duration: '5–15 min',
    minPlayers: 2,
    maxPlayers: 4,
    description: 'Una tirada más… ¿o mejor guardar? La suerte también se decide.',
    aliases: ['pig', 'dados', 'cien', '100', 'arriesgar'],
    rules: [
      'Por turnos, tira un dado tantas veces como quieras. Del 2 al 6 sumas puntos temporales.',
      'Puedes plantarte para guardar los puntos del turno en tu marcador y pasar el dado.',
      'Si sale 1, pierdes todos los puntos temporales y pasa el turno. Los puntos ya guardados se conservan.',
      'Gana quien guarda 100 puntos o más primero. Solo puedes plantarte si has sumado puntos.',
    ],
    tip: 'Plantarte con unos 20 puntos suele ser una buena decisión.',
  },
];

export function getGame(id: GameType): GameDefinition {
  const game = GAME_CATALOG.find((game) => game.id === id);
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
  const haystack = normalizeSearch(
    [game.name, game.description, game.category, ...game.aliases].join(' '),
  );
  return normalizeSearch(query)
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}
