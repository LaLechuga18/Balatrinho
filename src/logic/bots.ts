import type { CardData } from '../types/gameType';
import type { NetworkPlayer, RoundResolutionResult } from '../types/multiplayerType';
import { DeckManager } from './DeckManager';
import { evaluarMano, type ResultadoMano } from './HandEvaluator';
import { TIPOS_DE_MANO } from '../utils/handRules';
import {
  ajustarGanancia,
  costoFinDeRonda,
  datosComodin,
  generarOfertaTienda,
  type Comodin,
} from './jokers';

// Monedas base por posición al terminar la ronda (índice 0 = 1er lugar). Igual que en el servidor.
export const MONEDAS_POR_POSICION = [5, 4, 3, 1] as const;
// Monedas extra por cada 100 puntos de puntaje en la ronda
export const MONEDAS_POR_100_PUNTOS = 1;

/** Reglas de la partida que los bots necesitan conocer (las define useGameState). */
export interface ConfigBots {
  cartasPorRonda: number;
  maxDescartes: number;
  maxManos: number;
  maxSeleccion: number;
  maxComodines: number;
  comodinesEnOferta: number;
  /** Vida inicial en medios corazones. */
  vidaInicialHp: number;
}

export interface Bot {
  id: string;
  nombre: string;
  /** Probabilidad (0..1) de jugar la mejor mano disponible; si falla, elige entre las mejores. */
  habilidad: number;
  hp: number;
  monedas: number;
  vivo: boolean;
  puntajeTotal: number;
  comodines: Comodin[];
  /** Cartas descartadas en toda la partida (para Yorick). */
  descartadas: number;
  /** Puntaje de cada mano de la ronda, calculado al inicio de la ronda. */
  plan: number[];
  /** Cuántas manos del plan ya se "revelaron" (van al ritmo del jugador). */
  manosJugadas: number;
}

const PERFILES_BOT = [
  { nombre: '🤖 Chip', habilidad: 0.95 },
  { nombre: '🤖 Mult', habilidad: 0.8 },
  { nombre: '🤖 Jimbo', habilidad: 0.6 },
];

// ─── Jugadas ────────────────────────────────────────────────────────────────

interface Jugada {
  cartas: CardData[];
  resultado: ResultadoMano;
}

function subconjuntos(mano: CardData[], maximo: number): CardData[][] {
  const salida: CardData[][] = [];
  const actual: CardData[] = [];
  const recorrer = (inicio: number) => {
    if (actual.length > 0) salida.push([...actual]);
    if (actual.length === maximo) return;
    for (let i = inicio; i < mano.length; i++) {
      actual.push(mano[i]);
      recorrer(i + 1);
      actual.pop();
    }
  };
  recorrer(0);
  return salida;
}

function elegirJugada(mano: CardData[], bot: Bot, cfg: ConfigBots): Jugada {
  const opciones: Jugada[] = subconjuntos(mano, cfg.maxSeleccion)
    .map(cartas => ({
      cartas,
      resultado: evaluarMano(cartas, bot.comodines, {
        monedas: bot.monedas,
        totalDescartes: bot.descartadas,
      }),
    }))
    .sort((a, b) => b.resultado.puntajeFinal - a.resultado.puntajeFinal);

  if (Math.random() < bot.habilidad) return opciones[0];
  return opciones[Math.floor(Math.random() * Math.min(opciones.length, 6))];
}

const esManoDebil = (j: Jugada) =>
  j.resultado.nombreMano === TIPOS_DE_MANO.CARTA_ALTA.nombre ||
  j.resultado.nombreMano === TIPOS_DE_MANO.PAREJA.nombre;

// ─── Bots ───────────────────────────────────────────────────────────────────

/**
 * Juega una ronda completa de un bot (cartas, descartes y manos) y guarda
 * el puntaje de cada mano en `plan`.
 */
export function planearRonda(bot: Bot, cfg: ConfigBots): Bot {
  if (!bot.vivo) return { ...bot, plan: [], manosJugadas: 0 };

  const mazo = new DeckManager();
  let mano = mazo.robar(cfg.cartasPorRonda);
  let descartesRestantes = cfg.maxDescartes;
  let descartadas = bot.descartadas;
  const plan: number[] = [];

  for (let m = 0; m < cfg.maxManos; m++) {
    let jugada = elegirJugada(mano, { ...bot, descartadas }, cfg);

    // Con una mano débil, descarta lo que no puntúa e intenta mejorarla
    while (descartesRestantes > 0 && esManoDebil(jugada)) {
      const conservar = new Set(jugada.resultado.cartasPuntuables);
      const sobran = mano
        .filter(c => !conservar.has(c))
        .sort((a, b) => a.valor - b.valor)
        .slice(0, cfg.maxSeleccion);
      if (sobran.length === 0) break;

      mano = [...mano.filter(c => !sobran.includes(c)), ...mazo.robar(sobran.length)];
      descartesRestantes--;
      descartadas += sobran.length;
      jugada = elegirJugada(mano, { ...bot, descartadas }, cfg);
    }

    plan.push(jugada.resultado.puntajeFinal);
    const jugadas = new Set(jugada.cartas);
    mano = [...mano.filter(c => !jugadas.has(c)), ...mazo.robar(jugadas.size)];
  }

  return { ...bot, plan, descartadas, manosJugadas: 0 };
}

export function crearBots(cfg: ConfigBots): Bot[] {
  return PERFILES_BOT.map((perfil, i) =>
    planearRonda(
      {
        id: `bot-${i + 1}`,
        nombre: perfil.nombre,
        habilidad: perfil.habilidad,
        hp: cfg.vidaInicialHp,
        monedas: 0,
        vivo: true,
        puntajeTotal: 0,
        comodines: [],
        descartadas: 0,
        plan: [],
        manosJugadas: 0,
      },
      cfg
    )
  );
}

/** Puntaje de la ronda que el bot lleva "jugado" hasta ahora. */
export const puntajeRondaBot = (bot: Bot) =>
  bot.plan.slice(0, bot.manosJugadas).reduce((suma, p) => suma + p, 0);

/**
 * Compra de la tienda: el bot mira una oferta y compra lo que pueda pagar,
 * empezando por lo más caro. Evita los Cursed Jokers (no sabe usarlos).
 */
export function comprarComodinesBot(bot: Bot, cfg: ConfigBots): Bot {
  let monedas = bot.monedas;
  let comodines = bot.comodines;

  const oferta = generarOfertaTienda(comodines, cfg.comodinesEnOferta)
    .filter(c => !c.maldito)
    .sort((a, b) => b.costo - a.costo);

  for (const comodin of oferta) {
    if (comodines.length >= cfg.maxComodines) break;
    if (comodin.costo > monedas) continue;
    comodines = [...comodines, comodin];
    monedas -= comodin.costo;
  }

  return { ...bot, monedas, comodines };
}

export function botANetworkPlayer(bot: Bot): NetworkPlayer {
  return {
    id: bot.id,
    name: bot.nombre,
    isHost: false,
    hp: bot.hp,
    coins: bot.monedas,
    isAlive: bot.vivo,
    currentRoundScore: puntajeRondaBot(bot),
    totalScore: bot.puntajeTotal,
    roundFinished: bot.vivo && bot.plan.length > 0 && bot.manosJugadas >= bot.plan.length,
    shopReady: true,
    jokers: bot.comodines.map(datosComodin),
  };
}

// ─── Resolución de la ronda ─────────────────────────────────────────────────

export interface ParticipanteRonda {
  id: string;
  name: string;
  hp: number;
  monedas: number;
  vivo: boolean;
  puntajeRonda: number;
  comodines: Comodin[];
}

/**
 * Misma regla que `resolveRoundForRoom` del servidor: se ordena por puntaje
 * de la ronda; con 2 vivos pierde medio corazón el 2º; con 3 o más pierden
 * el último (1 corazón) y el penúltimo (medio corazón).
 */
export function resolverRonda(participantes: ParticipanteRonda[]): RoundResolutionResult[] {
  const activos = participantes
    .filter(p => p.vivo)
    .sort((a, b) => b.puntajeRonda - a.puntajeRonda);
  const total = activos.length;

  return activos.map((p, i) => {
    const rank = i + 1;
    let damage = 0;
    if (total === 2) {
      if (rank === 2) damage = 1;
    } else if (total >= 3) {
      if (rank === total) damage = 2;
      else if (rank === total - 1) damage = 1;
    }

    const newHp = Math.max(0, p.hp - damage);
    const monedasBase =
      MONEDAS_POR_POSICION[Math.min(rank - 1, MONEDAS_POR_POSICION.length - 1)] +
      Math.floor(p.puntajeRonda / 100) * MONEDAS_POR_100_PUNTOS;
    // Puede ser negativo (El Dado); las monedas nunca bajan de 0
    const coinsEarned = ajustarGanancia(p.comodines, monedasBase) - costoFinDeRonda(p.comodines);

    return {
      playerId: p.id,
      name: p.name,
      roundScore: p.puntajeRonda,
      rank,
      damage,
      newHp,
      coinsEarned,
      totalCoins: Math.max(0, p.monedas + coinsEarned),
      isAlive: newHp > 0,
      jokers: p.comodines.map(datosComodin),
    };
  });
}
