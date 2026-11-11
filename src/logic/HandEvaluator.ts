import type { CardData } from '../types/gameType';
import { TIPOS_DE_MANO, type HandTypeInfo } from '../utils/handRules';
import { type Comodin } from './jokers';

export type PasoCarta = {
  tipo: 'carta';
  indiceCarta: number;
  fichas: number;
  fichasDespues: number;
  multDespues: number;
};

export type PasoComodin = {
  tipo: 'comodin';
  comodinId: string;
  fichasExtra: number;
  multExtra: number;
  xMult: number;
  fichasDespues: number;
  multDespues: number;
};

export type PasoPuntuacion = PasoCarta | PasoComodin;

export interface ResultadoMano {
  nombreMano: string;
  fichasBase: number;
  multBase: number;
  fichasCartas: number;
  fichasComodines: number; // fichas aportadas por los comodines equipados
  fichasTotales: number;
  mult: number;            // multiplicador final (mano + comodines escalado por xMult)
  multComodines: number;   // cuánto del multiplicador viene de la suma de comodines
  xMultComodines?: number; // factor multiplicador de comodines
  puntajeFinal: number;
  cartasPuntuables: CardData[];
  pasos: PasoPuntuacion[];
}

/** Textos que se muestran flotando sobre un comodín cuando se activa. */
export function etiquetasEfectoComodin(p: PasoComodin) {
  const out: { texto: string; tipo: 'fichas' | 'mult' | 'xmult' }[] = [];
  if (p.fichasExtra) out.push({ texto: `${p.fichasExtra > 0 ? '+' : ''}${p.fichasExtra} FICHAS`, tipo: 'fichas' });
  if (p.multExtra) out.push({ texto: `${p.multExtra > 0 ? '+' : ''}${p.multExtra} MULT`, tipo: 'mult' });
  if (p.xMult > 1) out.push({ texto: `×${p.xMult} MULT`, tipo: 'xmult' });
  return out;
}

export function obtenerFichasDeCarta(valor: number): number {
  if (valor === 14) return 11; // As
  if (valor >= 10) return 10;  // J, Q, K
  return valor;
}

function resultadoVacio(): ResultadoMano {
  return {
    nombreMano: 'Ninguna',
    fichasBase: 0,
    multBase: 0,
    fichasCartas: 0,
    fichasComodines: 0,
    fichasTotales: 0,
    mult: 0,
    multComodines: 0,
    xMultComodines: 1,
    puntajeFinal: 0,
    cartasPuntuables: [],
    pasos: [],
  };
}

export function evaluarMano(
  cartasSeleccionadas: CardData[],
  comodinesEquipados: Comodin[] = [],
  extraCtx?: { monedas?: number; totalDescartes?: number }
): ResultadoMano {
  if (cartasSeleccionadas.length === 0) return resultadoVacio();

  // 1. Agrupar por valor y por palo
  const cartasPorValor: Record<number, CardData[]> = {};
  const cartasPorPalo: Record<string, CardData[]> = {};

  cartasSeleccionadas.forEach((carta) => {
    (cartasPorValor[carta.valor] ??= []).push(carta);
    (cartasPorPalo[carta.palo] ??= []).push(carta);
  });

  const conteoValores: Record<number, number> = {};
  cartasSeleccionadas.forEach((c) => {
    conteoValores[c.valor] = (conteoValores[c.valor] || 0) + 1;
  });

  // Grupos ordenados de mayor a menor repetición (y valor más alto en empate)
  const gruposValores = Object.values(cartasPorValor).sort(
    (a, b) => b.length - a.length || b[0].valor - a[0].valor
  );
  const repeticiones = gruposValores.map((g) => g.length);

  // 2. Color: exactamente 5 cartas seleccionadas, todas del mismo palo
  const hayColor =
    cartasSeleccionadas.length === 5 &&
    Object.values(cartasPorPalo).some((g) => g.length >= 5);

  // 3. Escalera: exactamente 5 valores únicos y consecutivos (o As-2-3-4-5)
  const verificarEscalera = (): boolean => {
    if (cartasSeleccionadas.length !== 5) return false;
    const valoresUnicos = Array.from(new Set(cartasSeleccionadas.map((c) => c.valor))).sort(
      (a, b) => a - b
    );
    if (valoresUnicos.length !== 5) return false;
    if (valoresUnicos[4] - valoresUnicos[0] === 4) return true;
    // Escalera baja: A,2,3,4,5 (As guardado como 14)
    return valoresUnicos.join(',') === '2,3,4,5,14';
  };
  const hayEscalera = verificarEscalera();

  // 4. Determinar el tipo de mano (de mayor a menor jerarquía)
  let tipo: keyof typeof TIPOS_DE_MANO = 'CARTA_ALTA';

  if (repeticiones[0] >= 5 && hayColor) tipo = 'POKER_DE_COLOR';
  else if (repeticiones[0] >= 5) tipo = 'REPOKER';
  else if (repeticiones[0] >= 3 && repeticiones[1] >= 2 && hayColor) tipo = 'FULL_DE_COLOR';
  else if (hayEscalera && hayColor) tipo = 'ESCALERA_COLOR';
  else if (repeticiones[0] >= 4) tipo = 'POKER';
  else if (repeticiones[0] >= 3 && repeticiones[1] >= 2) tipo = 'FULL_HOUSE';
  else if (hayColor) tipo = 'COLOR';
  else if (hayEscalera) tipo = 'ESCALERA';
  else if (repeticiones[0] === 3) tipo = 'TRIO';
  else if (repeticiones[0] === 2 && repeticiones[1] >= 2) tipo = 'DOBLE_PAREJA';
  else if (repeticiones[0] === 2) tipo = 'PAREJA';

  const info: HandTypeInfo = TIPOS_DE_MANO[tipo];

  // 5. Filtrar qué cartas puntúan según el tipo de mano
  const cartasOrdenadas = [...cartasSeleccionadas].sort((a, b) => b.valor - a.valor);
  let cartasPuntuables: CardData[];

  switch (tipo) {
    case 'CARTA_ALTA':
      cartasPuntuables = [cartasOrdenadas[0]];
      break;
    case 'PAREJA':
    case 'DOBLE_PAREJA':
      cartasPuntuables = cartasOrdenadas.filter((c) => conteoValores[c.valor] === 2);
      break;
    case 'TRIO':
      cartasPuntuables = cartasOrdenadas.filter((c) => conteoValores[c.valor] === 3);
      break;
    case 'POKER':
      cartasPuntuables = cartasOrdenadas.filter((c) => conteoValores[c.valor] === 4);
      break;
    case 'REPOKER':
    case 'POKER_DE_COLOR':
      cartasPuntuables = cartasOrdenadas.filter((c) => conteoValores[c.valor] >= 5);
      break;
    default:
      // Color, Escalera, Escalera de Color y Full House/Full de Color puntúan las 5 cartas
      cartasPuntuables = cartasOrdenadas;
  }

  const fichasCartas = cartasPuntuables.reduce(
    (suma, c) => suma + obtenerFichasDeCarta(c.valor),
    0
  );

  // ── Pasos de puntuación (para la animación) ──
  let fichasAcum = info.fichasBase;
  let multAcum = info.multBase;
  const pasos: PasoPuntuacion[] = [];

  // 1) Cartas que puntúan, de izquierda a derecha (como en Balatro)
  cartasSeleccionadas.forEach((carta, indiceCarta) => {
    if (!cartasPuntuables.includes(carta)) return;
    const fichas = obtenerFichasDeCarta(carta.valor);
    fichasAcum += fichas;
    pasos.push({ tipo: 'carta', indiceCarta, fichas, fichasDespues: fichasAcum, multDespues: multAcum });
  });

  // 2) Comodines, en el orden en que están equipados
  let fichasComodines = 0;
  let multComodines = 0;
  let xMultTotal = 1;
  for (const comodin of comodinesEquipados) {
    const ef = comodin.calcularEfecto({
      cartasPuntuables,
      tipoMano: tipo,
      monedas: extraCtx?.monedas ?? 0,
      totalDescartes: extraCtx?.totalDescartes ?? 0,
    });
    const fichasExtra = ef.fichasExtra || 0;
    const multExtra = ef.multExtra || 0;
    const xMult = ef.xMult ?? 1;
    if (fichasExtra === 0 && multExtra === 0 && xMult === 1) continue; // no se activó

    fichasAcum = Math.max(0, fichasAcum + fichasExtra);
    multAcum = (multAcum + multExtra) * xMult;
    fichasComodines += fichasExtra;
    multComodines += multExtra;
    xMultTotal *= xMult;
    pasos.push({
      tipo: 'comodin',
      comodinId: comodin.id,
      fichasExtra,
      multExtra,
      xMult,
      fichasDespues: fichasAcum,
      multDespues: multAcum,
    });
  }

  const multFinal = Math.max(1, Math.round(multAcum));

  return {
    nombreMano: info.nombre,
    fichasBase: info.fichasBase,
    multBase: info.multBase,
    fichasCartas,
    fichasComodines,
    fichasTotales: fichasAcum,
    mult: multFinal,
    multComodines,
    xMultComodines: xMultTotal,
    puntajeFinal: fichasAcum * multFinal,
    cartasPuntuables,
    pasos,
  };
}
