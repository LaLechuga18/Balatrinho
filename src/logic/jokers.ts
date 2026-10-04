import type { CardData } from '../types/gameType';

// Catálogo de comodines — MVP (ver Contexto maestro del videojuego, secciones 9-11).
// Solo se implementan 3 de los 7 propuestos en el documento: los que son puros
// modificadores de puntuación y funcionan sin depender de vidas ni de comparar
// contra otros jugadores (eso llega con el multijugador). Los demás se pueden
// agregar después sin cambiar esta estructura.
//
// Los valores son PROVISIONALES y están pensados para balancearse con pruebas.

/**
 * Efecto que un comodín aplica al puntaje de una mano.
 * - fichasExtra: se suma a las fichas ANTES de multiplicar.
 * - multExtra: se SUMA al multiplicador de la mano (no se multiplica entre sí),
 *   para que varios comodines no disparen el puntaje exponencialmente.
 */
export interface EfectoComodin {
  fichasExtra: number;
  multExtra: number;
}

export interface Comodin {
  id: string;
  nombre: string;
  descripcion: string;
  costo: number; // en monedas
  /**
   * Ruta de la imagen del joker, relativa a la carpeta public/ (ej. '/jokers/rey.png').
   * Es opcional: si falta o el archivo no existe, se muestra un recuadro provisional.
   */
  imagen?: string;
  /**
   * Calcula el efecto del comodín según las cartas que PUNTÚAN en la mano
   * (no todas las jugadas), para que premie lo que realmente anotó.
   */
  calcularEfecto: (cartasPuntuables: CardData[]) => EfectoComodin;
}

export const CATALOGO_COMODINES: Comodin[] = [
  {
    id: 'rey',
    nombre: 'El Rey',
    descripcion: 'Cada Rey que puntúe otorga +50 fichas.',
    costo: 8,
    imagen: '/jokers/rey.png',
    calcularEfecto: (cartasPuntuables) => {
      const reyes = cartasPuntuables.filter((c) => c.valor === 13).length;
      return { fichasExtra: reyes * 50, multExtra: 0 };
    },
  },
  {
    // El documento lo llama "Maestro de Picas"; aquí usamos "Espadas" para ser
    // consistentes con el tipo Palo del código (mismo palo ♠).
    id: 'maestro-espadas',
    nombre: 'Maestro de Espadas',
    descripcion: 'Cada carta de Espadas que puntúe otorga +20 fichas.',
    costo: 8,
    imagen: '/jokers/maestro-espadas.png',
    calcularEfecto: (cartasPuntuables) => {
      const espadas = cartasPuntuables.filter((c) => c.palo === 'Espadas').length;
      return { fichasExtra: espadas * 20, multExtra: 0 };
    },
  },
  {
    id: 'comodin',
    nombre: 'Comodín',
    descripcion: 'Comodín generalista: +1 al multiplicador de cualquier mano.',
    costo: 10,
    imagen: '/jokers/comodin.png',
    calcularEfecto: () => ({ fichasExtra: 0, multExtra: 1 }),
  },
];

/** Suma los efectos de todos los comodines equipados. */
export function acumularEfectos(
  comodines: Comodin[],
  cartasPuntuables: CardData[]
): EfectoComodin {
  return comodines.reduce<EfectoComodin>(
    (acc, comodin) => {
      const efecto = comodin.calcularEfecto(cartasPuntuables);
      return {
        fichasExtra: acc.fichasExtra + efecto.fichasExtra,
        multExtra: acc.multExtra + efecto.multExtra,
      };
    },
    { fichasExtra: 0, multExtra: 0 }
  );
}

/** Elige al azar `cantidad` comodines que el jugador todavía NO tiene equipados. */
export function generarOfertaTienda(
  comodinesEquipados: Comodin[],
  cantidad: number
): Comodin[] {
  const idsEquipados = new Set(comodinesEquipados.map((c) => c.id));
  const disponibles = CATALOGO_COMODINES.filter((c) => !idsEquipados.has(c.id));

  // Fisher-Yates sobre una copia, para no mutar el catálogo
  const mezclados = [...disponibles];
  for (let i = mezclados.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mezclados[i], mezclados[j]] = [mezclados[j], mezclados[i]];
  }

  return mezclados.slice(0, cantidad);
}