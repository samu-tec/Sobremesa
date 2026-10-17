import {
  CambioDeColorEngine,
  CiudadFortunaEngine,
  TresEnRayaEngine,
  CuatroEnLineaEngine,
  ReversiEngine,
  DadosAl100Engine,
  RummyDeFichasEngine,
  AjedrezEngine,
  ImpostorEngine,
  DominoEngine,
  DamasEngine,
  BackgammonEngine,
  BatallaNavalEngine,
  MancalaEngine,
  DadosDeCombinacionesEngine,
  type GameType,
  type RoomRules,
} from 'sobremesa-logic';

import { defineGame } from './runtime.js';
import type { GameMatch } from './match.js';

export const gameFactories = {
  tictactoe: () => defineGame(new TresEnRayaEngine()),
  colorclash: () => {
    const engine = new CambioDeColorEngine();
    return {
      ...defineGame(engine, {
        completed: (s, a) =>
          a.type === 'PLAY_CARD' || a.type === 'PASS_TURN' || !s.hasDrawnThisTurn,
        timeoutAction: (s) => ({ type: s.hasDrawnThisTurn ? 'PASS_TURN' : 'DRAW_CARD' }) as const,
        continueTimeout: () => true,
      }),
      configureRules: (rules: RoomRules) => engine.setStartingCards(rules.startingCards ?? 7),
    };
  },
  monopoly: () => {
    const engine = new CiudadFortunaEngine();
    return defineGame(engine, {
      actor: (s) => (s.auction ? `auction:${s.auction.tileIndex}` : s.currentTurnPlayerId),
      completed: (_s, a) => a.type === 'END_TURN' || a.type === 'BID',
      timeoutSeconds: (s) => (s.auction ? 15 : null),
      expire: (s) => (s.auction ? engine.finishAuction(s) : null),
      timeoutAction: (s, id) =>
        s.players.find((p) => p.id === id)!.cash < 0
          ? engine.getBotAction(s, id)
          : ({
              type:
                s.turnPhase === 'roll'
                  ? 'ROLL_DICE'
                  : s.turnPhase === 'tile_action'
                    ? 'PASS_PROPERTY'
                    : 'END_TURN',
            } as const),
      continueTimeout: (a) => a.type !== 'END_TURN',
      botId: (s, players) => {
        if (s.auction) {
          const auction = s.auction;
          return players.find(
            (p) =>
              p.isBot &&
              !auction.passedPlayerIds.includes(p.id) &&
              auction.highestBidderId !== p.id &&
              s.players.some((participant) => participant.id === p.id && !participant.isBankrupt),
          )?.id;
        }
        return (
          players.find((p) => p.isBot && p.id === s.activeTrade?.toPlayerId)?.id ||
          players.find((p) => p.isBot && p.id === s.currentTurnPlayerId)?.id
        );
      },
    });
  },
  connect4: () => defineGame(new CuatroEnLineaEngine()),
  reversi: () => defineGame(new ReversiEngine()),
  pig: () =>
    defineGame(new DadosAl100Engine(), {
      completed: (s, a) => a.type === 'HOLD' || s.lastRoll === 1,
      timeoutAction: (s) => ({ type: s.turnTotal > 0 ? 'HOLD' : 'ROLL' }) as const,
      continueTimeout: () => true,
    }),
  rummy: () =>
    defineGame(new RummyDeFichasEngine(), {
      timeoutAction: (s) => ({ type: s.pool.length ? 'DRAW' : 'PASS' }),
      continueTimeout: () => true,
    }),
  chess: () => defineGame(new AjedrezEngine(), { completed: (_s, a) => a.type === 'MOVE' }),
  impostor: () => defineGame(new ImpostorEngine()),
  dominoes: () =>
    defineGame(new DominoEngine(), {
      completed: (_s, a) => a.type !== 'DRAW',
      continueTimeout: (a) => a.type !== 'NEXT_ROUND',
    }),
  checkers: () =>
    defineGame(new DamasEngine(), {
      completed: (s) => s.forcedFrom === null,
      continueTimeout: () => true,
    }),
  backgammon: () =>
    defineGame(new BackgammonEngine(), {
      completed: () => false,
      continueTimeout: () => true,
    }),
  battleship: () =>
    defineGame(new BatallaNavalEngine(), {
      completed: (_s, a) => a.type === 'READY' || a.type === 'FIRE',
      continueTimeout: () => true,
    }),
  mancala: () => defineGame(new MancalaEngine()),
  combinations: () =>
    defineGame(new DadosDeCombinacionesEngine(), {
      completed: (_s, a) => a.type === 'SCORE',
      continueTimeout: () => true,
    }),
} satisfies Record<GameType, () => { createMatch(): GameMatch }>;
