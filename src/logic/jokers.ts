import type { CardData } from '../types/gameType';

/**
 * Efecto que un comodín aplica al puntaje de una mano.
 * - fichasExtra: se suma a las fichas ANTES de multiplicar.
 * - multExtra: se SUMA al multiplicador de la mano.
 * - xMult: factor multiplicador (X Mult) que escala el multiplicador final (ej. x2, x3).
 */
export interface EfectoComodin {
  fichasExtra: number;
  multExtra: number;
  xMult?: number;
}

/**
 * Contexto completo que recibe calcularEfecto.
 * - cartasPuntuables: cartas que anotan en esta mano.
 * - tipoMano: clave del catálogo TIPOS_DE_MANO (ej. 'PAREJA', 'COLOR').
 * - monedas: cantidad actual de monedas del jugador.
 * - totalDescartes: total de cartas descartadas acumuladas en la partida.
 */
export interface ContextoEfecto {
  cartasPuntuables: CardData[];
  tipoMano: string;
  monedas?: number;
  totalDescartes?: number;
}

export interface Comodin {
  id: string;
  nombre: string;
  descripcion: string;
  costo: number;
  imagen?: string;
  calcularEfecto: (ctx: ContextoEfecto) => EfectoComodin;
}

// Figuras: J(11), Q(12), K(13), A(14)
const esFigura = (c: CardData) => c.valor >= 11;

export const CATALOGO_COMODINES: Comodin[] = [
  // ── Comodines originales ──────────────────────────────────────────────────
  {
    id: 'rey',
    nombre: 'El Rey',
    descripcion: 'Cada Rey que puntúe otorga +50 fichas.',
    costo: 5,
    imagen: '/jokers/rey.png',
    calcularEfecto: ({ cartasPuntuables }) => {
      const reyes = cartasPuntuables.filter((c) => c.valor === 13).length;
      return { fichasExtra: reyes * 50, multExtra: 0, xMult: 1 };
    },
  },
  {
    id: 'maestro-espadas',
    nombre: 'Maestro de Espadas',
    descripcion: 'Cada carta de Espadas que puntúe otorga +20 fichas.',
    costo: 5,
    imagen: '/jokers/maestro-espadas.png',
    calcularEfecto: ({ cartasPuntuables }) => {
      const espadas = cartasPuntuables.filter((c) => c.palo === 'Espadas').length;
      return { fichasExtra: espadas * 20, multExtra: 0, xMult: 1 };
    },
  },
  {
    id: 'comodin',
    nombre: 'Comodín',
    descripcion: '+1 al multiplicador de cualquier mano.',
    costo: 5,
    imagen: '/jokers/comodin.png',
    calcularEfecto: () => ({ fichasExtra: 0, multExtra: 1, xMult: 1 }),
  },

  // ── Comodines nuevos ──────────────────────────────────────────────────────
  {
    id: 'gros-michel',
    nombre: 'Gros Michel',
    descripcion: '+15 al multiplicador en cualquier mano.',
    costo: 5,
    imagen: '/frames/jokers/GrosMichel.png',
    calcularEfecto: () => ({ fichasExtra: 0, multExtra: 15, xMult: 1 }),
  },
  {
    id: 'cavendish',
    nombre: 'Cavendish',
    descripcion: 'x3 al multiplicador.',
    costo: 5,
    imagen: '/jokers/cavendish.png',
    calcularEfecto: () => ({ fichasExtra: 0, multExtra: 0, xMult: 3 }),
  },
  {
    id: 'cara-feliz',
    nombre: 'Cara Feliz',
    descripcion: '+5 al multiplicador por cada figura (J, Q, K, A) que anote.',
    costo: 5,
    imagen: '/jokers/cara-feliz.png',
    calcularEfecto: ({ cartasPuntuables }) => {
      const figuras = cartasPuntuables.filter(esFigura).length;
      return { fichasExtra: 0, multExtra: figuras * 5, xMult: 1 };
    },
  },
  {
    id: 'joker-alegre',
    nombre: 'Joker Alegre',
    descripcion: '+8 al multiplicador si la mano contiene una Pareja.',
    costo: 5,
    imagen: '/jokers/joker-alegre.png',
    calcularEfecto: ({ tipoMano }) =>
      tipoMano === 'PAREJA' ? { fichasExtra: 0, multExtra: 8, xMult: 1 } : { fichasExtra: 0, multExtra: 0, xMult: 1 },
  },
  {
    id: 'joker-chiflado',
    nombre: 'Joker Chiflado',
    descripcion: '+12 al multiplicador si la mano contiene una Tercia.',
    costo: 5,
    imagen: '/jokers/joker-chiflado.png',
    calcularEfecto: ({ tipoMano }) =>
      tipoMano === 'TRIO' ? { fichasExtra: 0, multExtra: 12, xMult: 1 } : { fichasExtra: 0, multExtra: 0, xMult: 1 },
  },
  {
    id: 'joker-demente',
    nombre: 'Joker Demente',
    descripcion: '+10 al multiplicador si la mano contiene un Doble Par.',
    costo: 5,
    imagen: '/jokers/joker-demente.png',
    calcularEfecto: ({ tipoMano }) =>
      tipoMano === 'DOBLE_PAREJA' ? { fichasExtra: 0, multExtra: 10, xMult: 1 } : { fichasExtra: 0, multExtra: 0, xMult: 1 },
  },
  {
    id: 'joker-loco',
    nombre: 'Joker Loco',
    descripcion: '+12 al multiplicador si la mano contiene una Escalera.',
    costo: 5,
    imagen: '/jokers/joker-loco.png',
    calcularEfecto: ({ tipoMano }) =>
      tipoMano === 'ESCALERA' ? { fichasExtra: 0, multExtra: 12, xMult: 1 } : { fichasExtra: 0, multExtra: 0, xMult: 1 },
  },
  {
    id: 'joker-gracioso',
    nombre: 'Joker Gracioso',
    descripcion: '+10 al multiplicador si la mano contiene un Color.',
    costo: 5,
    imagen: '/jokers/joker-gracioso.png',
    calcularEfecto: ({ tipoMano }) =>
      tipoMano === 'COLOR' ? { fichasExtra: 0, multExtra: 10, xMult: 1 } : { fichasExtra: 0, multExtra: 0, xMult: 1 },
  },
  {
    id: 'jimbo',
    nombre: 'Jimbo',
    descripcion: '+4 al multiplicador en cualquier mano.',
    costo: 5,
    imagen: '/jokers/jimbo.png',
    calcularEfecto: () => ({ fichasExtra: 0, multExtra: 4, xMult: 1 }),
  },

  // ── Nuevos Comodines Solicitados ──────────────────────────────────────────
  {
    id: 'sebas-modo-horny',
    nombre: 'Sebas Modo Horny',
    descripcion: 'x2 al multiplicador por cada Rey y Reina que puntúe.',
    costo: 6,
    imagen: '/jokers/sebas-modo-horny.png',
    calcularEfecto: ({ cartasPuntuables }) => {
      const reyesYReinas = cartasPuntuables.filter((c) => c.valor === 12 || c.valor === 13).length;
      return {
        fichasExtra: 0,
        multExtra: 0,
        xMult: reyesYReinas > 0 ? Math.pow(2, reyesYReinas) : 1,
      };
    },
  },
  {
    id: 'yorick',
    nombre: 'Yorick',
    descripcion: '+x1 al multiplicador por cada 15 cartas descartadas en la partida.',
    costo: 8,
    imagen: '/jokers/yorick.png',
    calcularEfecto: ({ totalDescartes }) => {
      const descartadas = totalDescartes ?? 0;
      const bonusXMult = Math.floor(descartadas / 15);
      return {
        fichasExtra: 0,
        multExtra: 0,
        xMult: 1 + bonusXMult,
      };
    },
  },
  {
    id: 'la-bota-wey',
    nombre: 'La Bota Wey',
    descripcion: '+2 al multiplicador por cada moneda que tengas.',
    costo: 5,
    imagen: '/jokers/la-bota-wey.png',
    calcularEfecto: ({ monedas }) => {
      const m = monedas ?? 0;
      return {
        fichasExtra: 0,
        multExtra: m * 2,
        xMult: 1,
      };
    },
  },
  {
    id: 'fibonacci',
    nombre: 'Fibonacci',
    descripcion: 'Cada As, 2, 3, 5 u 8 que anote otorga +8 al multiplicador.',
    costo: 6,
    imagen: '/jokers/fibonacci.png',
    calcularEfecto: ({ cartasPuntuables }) => {
      const match = cartasPuntuables.filter((c) =>
        [14, 1, 2, 3, 5, 8].includes(c.valor)
      ).length;
      return {
        fichasExtra: 0,
        multExtra: match * 8,
        xMult: 1,
      };
    },
  },
  {
    id: 'erudito',
    nombre: 'Erudito',
    descripcion: 'Cada As que anote otorga +20 fichas y +4 al multiplicador.',
    costo: 5,
    imagen: '/jokers/erudito.png',
    calcularEfecto: ({ cartasPuntuables }) => {
      const ases = cartasPuntuables.filter((c) => c.valor === 14 || c.valor === 1).length;
      return {
        fichasExtra: ases * 20,
        multExtra: ases * 4,
        xMult: 1,
      };
    },
  },
];

/** Suma los efectos de todos los comodines equipados. */
export function acumularEfectos(
  comodines: Comodin[],
  cartasPuntuables: CardData[],
  tipoMano: string,
  extraCtx?: { monedas?: number; totalDescartes?: number }
): EfectoComodin {
  return comodines.reduce<EfectoComodin>(
    (acc, comodin) => {
      const efecto = comodin.calcularEfecto({
        cartasPuntuables,
        tipoMano,
        monedas: extraCtx?.monedas ?? 0,
        totalDescartes: extraCtx?.totalDescartes ?? 0,
      });
      return {
        fichasExtra: acc.fichasExtra + (efecto.fichasExtra || 0),
        multExtra: acc.multExtra + (efecto.multExtra || 0),
        xMult: (acc.xMult ?? 1) * (efecto.xMult ?? 1),
      };
    },
    { fichasExtra: 0, multExtra: 0, xMult: 1 }
  );
}

/**
 * Genera una oferta aleatoria de `cantidad` comodines que el jugador no tiene
 * equipados. Recibe un `semilla` (offset) para el re-roll: cicla el catálogo
 * disponible en lugar de quedarse sin opciones.
 */
export function generarOfertaTienda(
  comodinesEquipados: Comodin[],
  cantidad: number,
  semilla = 0
): Comodin[] {
  const idsEquipados = new Set(comodinesEquipados.map((c) => c.id));
  const disponibles = CATALOGO_COMODINES.filter((c) => !idsEquipados.has(c.id));

  if (disponibles.length === 0) return [];

  // Fisher-Yates sobre una copia
  const mezclados = [...disponibles];
  for (let i = mezclados.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mezclados[i], mezclados[j]] = [mezclados[j], mezclados[i]];
  }

  // El re-roll desplaza la ventana. Si se acaba el catálogo, cicla desde el principio.
  const total = mezclados.length;
  const inicio = (semilla * cantidad) % total;
  const resultado: Comodin[] = [];
  for (let i = 0; i < cantidad; i++) {
    resultado.push(mezclados[(inicio + i) % total]);
  }
  return resultado;
}
