import type { CardData } from '../types/gameType';

export const PORCENTAJE_VENTA = 0.4; // 40% del costo original
const PESO_MALDITO = 0.25; // probabilidad relativa en la tienda (1 = normal)

export type EfectoAlVender = 'destruir-joker-oponentes' | 'tirar-dado' | 'destruir-mas-barato';

export type EventoMaldito =
  | {
      efecto: 'tirar-dado';
      vendedorNombre: string;
      resultados: { playerId: string; name: string; tirada: number }[];
    }
  | {
      efecto: 'destruir-joker-oponentes' | 'destruir-mas-barato';
      vendedorNombre: string;
      afectados: { playerId: string; jugador: string; jokerId: string; nombre: string }[];
    };

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
  /** Texto del efecto al venderlo (se muestra en el tooltip). */
  descripcionVenta?: string;
  /** Es un Cursed Joker: aura roja y poca probabilidad en la tienda. */
  maldito?: boolean;
  /** Peso en el sorteo de la tienda (por defecto 1). */
  peso?: number;
  /** Factor sobre las ganancias de monedas (0.5 = la mitad). */
  multiplicadorGanancias?: number;
  /** Monedas que pierdes al terminar cada ronda. */
  costoFinRonda?: number;
  /** Efecto al venderlo. */
  alVender?: EfectoAlVender;
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
    imagen: '/frames/jokers/Baron.webp',
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
    imagen: '/frames/jokers/Arrowhead.png',
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
    imagen: '/frames/jokers/Joker.webp',
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
    imagen: '/frames/jokers/Cavendish.webp',
    calcularEfecto: () => ({ fichasExtra: 0, multExtra: 0, xMult: 3 }),
  },
  {
    id: 'cara-feliz',
    nombre: 'Cara Feliz',
    descripcion: '+5 al multiplicador por cada figura (J, Q, K, A) que anote.',
    costo: 5,
    imagen: '/frames/jokers/Smiley_Face.webp',
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
    imagen: '/frames/jokers/Jolly_Joker.webp',
    calcularEfecto: ({ tipoMano }) =>
      tipoMano === 'PAREJA' ? { fichasExtra: 0, multExtra: 8, xMult: 1 } : { fichasExtra: 0, multExtra: 0, xMult: 1 },
  },
  {
    id: 'joker-chiflado',
    nombre: 'Joker Chiflado',
    descripcion: '+12 al multiplicador si la mano contiene una Tercia.',
    costo: 5,
    imagen: '/frames/jokers/Zany_Joker.webp',
    calcularEfecto: ({ tipoMano }) =>
      tipoMano === 'TRIO' ? { fichasExtra: 0, multExtra: 12, xMult: 1 } : { fichasExtra: 0, multExtra: 0, xMult: 1 },
  },
  {
    id: 'joker-demente',
    nombre: 'Joker Demente',
    descripcion: '+10 al multiplicador si la mano contiene un Doble Par.',
    costo: 5,
    imagen: '/frames/jokers/Mad_Joker.webp',
    calcularEfecto: ({ tipoMano }) =>
      tipoMano === 'DOBLE_PAREJA' ? { fichasExtra: 0, multExtra: 10, xMult: 1 } : { fichasExtra: 0, multExtra: 0, xMult: 1 },
  },
  {
    id: 'joker-loco',
    nombre: 'Joker Loco',
    descripcion: '+12 al multiplicador si la mano contiene una Escalera.',
    costo: 5,
    imagen: '/frames/jokers/Crazy_Joker.webp',
    calcularEfecto: ({ tipoMano }) =>
      tipoMano === 'ESCALERA' ? { fichasExtra: 0, multExtra: 12, xMult: 1 } : { fichasExtra: 0, multExtra: 0, xMult: 1 },
  },
  {
    id: 'joker-gracioso',
    nombre: 'Joker Gracioso',
    descripcion: '+10 al multiplicador si la mano contiene un Color.',
    costo: 5,
    imagen: '/frames/jokers/Droll_Joker.webp',
    calcularEfecto: ({ tipoMano }) =>
      tipoMano === 'COLOR' ? { fichasExtra: 0, multExtra: 10, xMult: 1 } : { fichasExtra: 0, multExtra: 0, xMult: 1 },
  },
  {
    id: 'jimbo',
    nombre: 'Jimbo',
    descripcion: '+4 al multiplicador en cualquier mano.',
    costo: 5,
    imagen: '/frames/jokers/joker.webp',
    calcularEfecto: () => ({ fichasExtra: 0, multExtra: 4, xMult: 1 }),
  },

  // ── Nuevos Comodines Solicitados ──────────────────────────────────────────
  {
    id: 'sebas-modo-horny',
    nombre: 'Triboulet',
    descripcion: 'x2 al multiplicador por cada Rey y Reina que puntúe.',
    costo: 6,
    imagen: '/frames/jokers/Triboulet.webp',
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
    imagen: '/frames/jokers/Yorick.webp',
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
    imagen: '/frames/jokers/Bootstraps.webp',
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
    imagen: '/frames/jokers/Fibonacci.webp',
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
    imagen: '/frames/jokers/Scholar.webp',
    calcularEfecto: ({ cartasPuntuables }) => {
      const ases = cartasPuntuables.filter((c) => c.valor === 14 || c.valor === 1).length;
      return {
        fichasExtra: ases * 20,
        multExtra: ases * 4,
        xMult: 1,
      };
    },
  },
  // ── Cursed Jokers ─────────────────────────────────────────────────────────
  {
    id: 'la-muerte',
    nombre: 'La Muerte',
    descripcion: 'Tus manos obtienen -10 fichas.',
    descripcionVenta: 'Destruye un Joker aleatorio de cada oponente.',
    costo: 8,
    imagen: '/frames/cursed_jokers/Mr._Bones.jpg',
    maldito: true,
    peso: PESO_MALDITO,
    alVender: 'destruir-joker-oponentes',
    calcularEfecto: () => ({ fichasExtra: -10, multExtra: 0, xMult: 1 }),
  },
  {
    id: 'el-dado',
    nombre: 'El Dado',
    descripcion: 'Pierdes 🪙 2 al finalizar cada ronda.',
    descripcionVenta:
      'Todos tiran un dado. 1-2: pierden 50% de sus monedas. 3-4: pierden medio corazón. 5: ganan 🪙 5. 6: duplican sus monedas.',
    costo: 6,
    imagen: '/frames/cursed_jokers/D6.png',
    maldito: true,
    peso: PESO_MALDITO,
    costoFinRonda: 2,
    alVender: 'tirar-dado',
    calcularEfecto: () => ({ fichasExtra: 0, multExtra: 0, xMult: 1 }),
  },
  {
    id: 'joker-espacial',
    nombre: 'Joker Espacial',
    descripcion: 'Tus ganancias de monedas se reducen a la mitad.',
    descripcionVenta: 'Todos pierden el Joker con menor precio de venta (empate: al azar).',
    costo: 6,
    imagen: '/frames/cursed_jokers/Space_joker.png',
    maldito: true,
    peso: PESO_MALDITO,
    multiplicadorGanancias: 0.5,
    alVender: 'destruir-mas-barato',
    calcularEfecto: () => ({ fichasExtra: 0, multExtra: 0, xMult: 1 }),
  },
];

export const precioVentaComodin = (c: Comodin) => Math.floor(c.costo * PORCENTAJE_VENTA);

/** Lo que se manda al servidor de cada comodín equipado. */
export function datosComodin(c: Comodin) {
  return {
    id: c.id,
    nombre: c.nombre,
    imagen: c.imagen,
    costo: c.costo,
    precioVenta: precioVentaComodin(c),
    multiplicadorGanancias: c.multiplicadorGanancias,
    costoFinRonda: c.costoFinRonda,
  };
}

/** Aplica los comodines que modifican las ganancias (Joker Espacial). */
export function ajustarGanancia(equipados: Comodin[], monto: number): number {
  const factor = equipados.reduce((acc, c) => acc * (c.multiplicadorGanancias ?? 1), 1);
  return Math.floor(monto * factor);
}

/** Monedas que se pierden al final de cada ronda (El Dado). */
export function costoFinDeRonda(equipados: Comodin[]): number {
  return equipados.reduce((s, c) => s + (c.costoFinRonda ?? 0), 0);
}

/** Versión local (modo solo) de lo que en red decide el servidor. */
export function generarEventoSolo(
  efecto: EfectoAlVender,
  restantes: Comodin[],
  nombre: string
): EventoMaldito {
  if (efecto === 'tirar-dado') {
    return {
      efecto,
      vendedorNombre: nombre,
      resultados: [{ playerId: 'local', name: nombre, tirada: 1 + Math.floor(Math.random() * 6) }],
    };
  }
  if (efecto === 'destruir-mas-barato' && restantes.length > 0) {
    const min = Math.min(...restantes.map(precioVentaComodin));
    const candidatos = restantes.filter((c) => precioVentaComodin(c) === min);
    const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
    return {
      efecto,
      vendedorNombre: nombre,
      afectados: [{ playerId: 'local', jugador: nombre, jokerId: elegido.id, nombre: elegido.nombre }],
    };
  }
  return { efecto, vendedorNombre: nombre, afectados: [] };
}

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

export function generarOfertaTienda(
  comodinesEquipados: Comodin[],
  cantidad: number,
  _semilla = 0
): Comodin[] {
  void _semilla;
  const idsEquipados = new Set(comodinesEquipados.map((c) => c.id));
  const pool = CATALOGO_COMODINES.filter((c) => !idsEquipados.has(c.id));
  const oferta: Comodin[] = [];

  while (oferta.length < cantidad && pool.length > 0) {
    const total = pool.reduce((s, c) => s + (c.peso ?? 1), 0);
    let r = Math.random() * total;
    let idx = pool.findIndex((c) => (r -= c.peso ?? 1) <= 0);
    if (idx < 0) idx = pool.length - 1;
    oferta.push(pool.splice(idx, 1)[0]);
  }
  return oferta;
}
