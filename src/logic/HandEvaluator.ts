import type { CardData } from '../types/gameType';
import { TIPOS_DE_MANO, type HandTypeInfo } from '../utils/handRules';
import { acumularEfectos, type Comodin } from './jokers';

export interface ResultadoMano {
  nombreMano: string;
  fichasBase: number;
  fichasCartas: number;
  fichasComodines: number; // fichas aportadas por los comodines equipados
  fichasTotales: number;
  mult: number;            // multiplicador final (mano + comodines)
  multComodines: number;   // cuánto del multiplicador viene de los comodines
  puntajeFinal: number;
  cartasPuntuables: CardData[];
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
    fichasCartas: 0,
    fichasComodines: 0,
    fichasTotales: 0,
    mult: 0,
    multComodines: 0,
    puntajeFinal: 0,
    cartasPuntuables: [],
  };
}

export function evaluarMano(
  cartasSeleccionadas: CardData[],
  comodinesEquipados: Comodin[] = []
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

  // Efectos de los comodines equipados, calculados sobre las cartas que puntúan
  const efectoComodines = acumularEfectos(comodinesEquipados, cartasPuntuables, tipo);

  const fichasTotales = info.fichasBase + fichasCartas + efectoComodines.fichasExtra;
  const multFinal = info.multBase + efectoComodines.multExtra;
  const puntajeFinal = fichasTotales * multFinal;

  return {
    nombreMano: info.nombre,
    fichasBase: info.fichasBase,
    fichasCartas,
    fichasComodines: efectoComodines.fichasExtra,
    fichasTotales,
    mult: multFinal,
    multComodines: efectoComodines.multExtra,
    puntajeFinal,
    cartasPuntuables,
  };
}