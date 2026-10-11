import type { CardData } from '../types/gameType';

/**
 * Efecto que un comodín aplica al puntaje de una mano.
 * - fichasExtra: se suma a las fichas ANTES de multiplicar.
 * - multExtra: se SUMA al multiplicador de la mano (no se multiplica entre sí).
 */
export interface EfectoComodin {
  fichasExtra: number;
  multExtra: number;
}

/**
 * Contexto completo que recibe calcularEfecto.
 * - cartasPuntuables: cartas que anotan en esta mano.
 * - tipoMano: clave del catálogo TIPOS_DE_MANO (ej. 'PAREJA', 'COLOR').
 */
export interface ContextoEfecto {
  cartasPuntuables: CardData[];
  tipoMano: string;
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
      return { fichasExtra: reyes * 50, multExtra: 0 };
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
      return { fichasExtra: espadas * 20, multExtra: 0 };
    },
  },
  {
    id: 'comodin',
    nombre: 'Comodín',
    descripcion: '+1 al multiplicador de cualquier mano.',
    costo: 5,
    imagen: '/jokers/comodin.png',
    calcularEfecto: () => ({ fichasExtra: 0, multExtra: 1 }),
  },

  // ── Comodines nuevos ──────────────────────────────────────────────────────
  {
    id: 'gros-michel',
    nombre: 'Gros Michel',
    descripcion: '+15 al multiplicador en cualquier mano.',
    costo: 5,
    imagen: '/jokers/gros-michel.png',
    calcularEfecto: () => ({ fichasExtra: 0, multExtra: 15 }),
  },
  {
    id: 'cavendish',
    nombre: 'Cavendish',
    descripcion: 'x3 al multiplicador (se aplica como +mult equivalente al mult base × 2).',
    costo: 5,
    imagen: '/jokers/cavendish.png',
    // Nota de diseño: el sistema suma mult en lugar de multiplicarlo para evitar
    // explosión exponencial. Cavendish suma +mult igual al multBase actual × 2,
    // logrando efectivamente triplicar el mult base de la mano.
    calcularEfecto: () => ({ fichasExtra: 0, multExtra: 20 }),
  },
  {
    id: 'cara-feliz',
    nombre: 'Cara Feliz',
    descripcion: '+5 al multiplicador por cada figura (J, Q, K, A) que anote.',
    costo: 5,
    imagen: '/jokers/cara-feliz.png',
    calcularEfecto: ({ cartasPuntuables }) => {
      const figuras = cartasPuntuables.filter(esFigura).length;
      return { fichasExtra: 0, multExtra: figuras * 5 };
    },
  },
  {
    id: 'joker-alegre',
    nombre: 'Joker Alegre',
    descripcion: '+8 al multiplicador si la mano contiene una Pareja.',
    costo: 5,
    imagen: '/jokers/joker-alegre.png',
    calcularEfecto: ({ tipoMano }) =>
      tipoMano === 'PAREJA' ? { fichasExtra: 0, multExtra: 8 } : { fichasExtra: 0, multExtra: 0 },
  },
  {
    id: 'joker-chiflado',
    nombre: 'Joker Chiflado',
    descripcion: '+12 al multiplicador si la mano contiene una Tercia.',
    costo: 5,
    imagen: '/jokers/joker-chiflado.png',
    calcularEfecto: ({ tipoMano }) =>
      tipoMano === 'TRIO' ? { fichasExtra: 0, multExtra: 12 } : { fichasExtra: 0, multExtra: 0 },
  },
  {
    id: 'joker-demente',
    nombre: 'Joker Demente',
    descripcion: '+10 al multiplicador si la mano contiene un Doble Par.',
    costo: 5,
    imagen: '/jokers/joker-demente.png',
    calcularEfecto: ({ tipoMano }) =>
      tipoMano === 'DOBLE_PAREJA' ? { fichasExtra: 0, multExtra: 10 } : { fichasExtra: 0, multExtra: 0 },
  },
  {
    id: 'joker-loco',
    nombre: 'Joker Loco',
    descripcion: '+12 al multiplicador si la mano contiene una Escalera.',
    costo: 5,
    imagen: '/jokers/joker-loco.png',
    calcularEfecto: ({ tipoMano }) =>
      tipoMano === 'ESCALERA' ? { fichasExtra: 0, multExtra: 12 } : { fichasExtra: 0, multExtra: 0 },
  },
  {
    id: 'joker-gracioso',
    nombre: 'Joker Gracioso',
    descripcion: '+10 al multiplicador si la mano contiene un Color.',
    costo: 5,
    imagen: '/jokers/joker-gracioso.png',
    calcularEfecto: ({ tipoMano }) =>
      tipoMano === 'COLOR' ? { fichasExtra: 0, multExtra: 10 } : { fichasExtra: 0, multExtra: 0 },
  },
  {
    id: 'jimbo',
    nombre: 'Jimbo',
    descripcion: '+4 al multiplicador en cualquier mano.',
    costo: 5,
    imagen: '/jokers/jimbo.png',
    calcularEfecto: () => ({ fichasExtra: 0, multExtra: 4 }),
  },
];

/** Suma los efectos de todos los comodines equipados. */
export function acumularEfectos(
  comodines: Comodin[],
  cartasPuntuables: CardData[],
  tipoMano: string
): EfectoComodin {
  return comodines.reduce<EfectoComodin>(
    (acc, comodin) => {
      const efecto = comodin.calcularEfecto({ cartasPuntuables, tipoMano });
      return {
        fichasExtra: acc.fichasExtra + efecto.fichasExtra,
        multExtra: acc.multExtra + efecto.multExtra,
      };
    },
    { fichasExtra: 0, multExtra: 0 }
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
