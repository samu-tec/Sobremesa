import {
  PokerEngine,
  WordsEngine,
  QuizEngine,
  DrawingEngine,
  MysteryEngine,
  ConquestEngine,
  CinquilloEngine,
  EscobaEngine,
  MusEngine,
  BriscaEngine,
  MahjongEngine,
  ChineseEngine,
  GoEngine,
  OcaEngine,
  ParchisEngine,
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

import { defineGame, type GameMatch } from './runtime.js';
import { randomInt } from 'node:crypto';
import { drawingWords } from './drawing-words.js';
import { quizQuestions } from './quiz-questions.js';
import { wordDictionaries } from './word-dictionaries.js';

const secureRandom = () => randomInt(0x100000000) / 0x100000000;
export const gameFactories = {
  poker: () =>
    defineGame(new PokerEngine(secureRandom), {
      timeoutAction: (s) => ({
        type:
          s.phase === 'hand_end'
            ? 'NEXT_HAND'
            : s.players.find((p) => p.id === s.currentTurnPlayerId)!.bet >= s.currentBet
              ? 'CHECK'
              : 'FOLD',
      }),
    }),
  words: () => defineGame(new WordsEngine(secureRandom, wordDictionaries)),
  quiz: () =>
    defineGame(new QuizEngine(secureRandom, quizQuestions), {
      requiresPresence: () => false,
      timeoutAction: (s) => ({ type: s.phase === 'review' ? 'NEXT' : 'SKIP' }),
    }),
  drawing: () =>
    defineGame(new DrawingEngine(secureRandom, drawingWords), {
      requiresPresence: (s) => s.phase === 'choose',
      completed: (s, a) => a.type === 'CHOOSE' || a.type === 'NEXT' || s.phase === 'review',
      timeoutSeconds: (s) => (s.phase === 'choose' ? 20 : s.phase === 'review' ? 8 : s.drawSeconds),
      timeoutAction: (s) =>
        s.phase === 'choose'
          ? ({ type: 'CHOOSE', index: 0 } as const)
          : ({ type: s.phase === 'draw' ? 'END' : 'NEXT' } as const),
    }),
  mystery: () => {
    const engine = new MysteryEngine(secureRandom);
    return defineGame(engine, {
      timeoutAction: (s, id) =>
        s.phase === 'refute' ? engine.getBotAction(s, id) : { type: 'END_TURN' },
    });
  },
  conquest: () => {
    const engine = new ConquestEngine(secureRandom);
    return defineGame(engine, {
      completed: (_s, a) => a.type === 'END_TURN',
      timeoutAction: (s, id) => engine.getTimeoutAction(s, id),
      continueTimeout: (a) => a.type === 'REINFORCE',
    });
  },
  cinquillo: () => defineGame(new CinquilloEngine(secureRandom)),
  escoba: () => defineGame(new EscobaEngine(secureRandom)),
  mus: () => {
    const engine = new MusEngine(secureRandom);
    return defineGame(engine, {
      timeoutAction: (s, id) =>
        s.phase === 'mus'
          ? ({ type: 'CUT' } as const)
          : s.phase === 'bet'
            ? ({ type: s.bet ? 'FOLD' : 'PASS' } as const)
            : engine.getBotAction(s, id),
    });
  },
  brisca: () =>
    defineGame(new BriscaEngine(secureRandom), {
      completed: (_s, a) => a.type === 'PLAY' || a.type === 'NEXT_ROUND',
      continueTimeout: (a) => a.type === 'EXCHANGE' || a.type === 'COLLECT',
    }),
  mahjong: () => {
    const engine = new MahjongEngine(secureRandom);
    return defineGame(engine, {
      completed: (_s, a) => a.type !== 'DRAW' && a.type !== 'KONG',
      requiresPresence: (s) => s.phase !== 'claim',
      timeoutSeconds: (s) => (s.phase === 'claim' ? 8 : null),
      timeoutAction: (s, id) =>
        s.phase === 'claim' ? ({ type: 'PASS' } as const) : engine.getBotAction(s, id),
      continueTimeout: (a) => a.type === 'DRAW' || a.type === 'KONG',
    });
  },
  chinesecheckers: () => defineGame(new ChineseEngine()),
  go: () =>
    defineGame(new GoEngine(), {
      requiresPresence: (s) => s.phase !== 'score',
      completed: (_s, a) => a.type !== 'MARK_DEAD',
      timeoutAction: (s) => ({ type: s.phase === 'score' ? 'RESUME' : 'PASS' }) as const,
    }),
  oca: () => defineGame(new OcaEngine()),
  parchis: () =>
    defineGame(new ParchisEngine(), {
      completed: (s) => s.phase === 'roll',
      continueTimeout: (_action) => true,
    }),
  tictactoe: () => defineGame(new TresEnRayaEngine()),
  colorclash: () => {
    const engine = new CambioDeColorEngine();
    return {
      ...defineGame(engine, {
        requiresPresence: (s) => !s.pendingDraw && !s.hasDrawnThisTurn,
        completed: (s, a) =>
          a.type === 'PLAY_CARD' || a.type === 'PASS_TURN' || !s.hasDrawnThisTurn,
        timeoutAction: (s) => ({ type: s.hasDrawnThisTurn ? 'PASS_TURN' : 'DRAW_CARD' }) as const,
        continueTimeout: () => true,
      }),
      configureRules: (rules: RoomRules) => engine.setRules(rules),
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
  impostor: () => defineGame(new ImpostorEngine(secureRandom)),
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
