import type { CardData } from '../types/gameType';
import { TIPOS_DE_MANO, type HandTypeInfo } from './handRules';

export function obtenerFichasDeCarta(valor: number): number {
  if (valor === 14) return 11; 
  if (valor >= 10) return 10;  
  return valor;                
}

export function evaluarMano(cartasSeleccionadas: CardData[]) {
  if (cartasSeleccionadas.length === 0) {
    return {
      nombreMano: 'Ninguna',
      fichasBase: 0,
      fichasCartas: 0,
      fichasTotales: 0,
      mult: 0,
      puntajeFinal: 0,
    };
  }

  const conteoValores: Record<number, number> = {};
  cartasSeleccionadas.forEach((c) => {
    conteoValores[c.valor] = (conteoValores[c.valor] || 0) + 1;
  });

  const repeticiones = Object.values(conteoValores).sort((a, b) => b - a);

  // ==========================================
  // NUEVO: DETECCIÓN DE COLOR Y ESCALERA
  // ==========================================
  // ¿Son 5 cartas y todas del mismo palo?
  const esColor = cartasSeleccionadas.length === 5 && 
                  cartasSeleccionadas.every(c => c.palo === cartasSeleccionadas[0].palo);

  // ¿Son 5 cartas y son consecutivas?
  const valoresUnicos = Array.from(new Set(cartasSeleccionadas.map(c => c.valor))).sort((a, b) => a - b);
  let esEscalera = false;
  if (valoresUnicos.length === 5) {
    esEscalera = (valoresUnicos[4] - valoresUnicos[0] === 4);
    // Caso especial: Escalera baja (As, 2, 3, 4, 5) donde el As vale 14
    if (!esEscalera && valoresUnicos.join(',') === '2,3,4,5,14') {
      esEscalera = true;
    }
  }

  // Asignamos la mano correcta con jerarquía
  let infoMano: HandTypeInfo = TIPOS_DE_MANO.CARTA_ALTA;

  if (esEscalera && esColor) {
    infoMano = TIPOS_DE_MANO.ESCALERA_COLOR;
  } else if (repeticiones[0] === 4) {
    infoMano = TIPOS_DE_MANO.POKER;
  } else if (repeticiones[0] === 3 && repeticiones[1] === 2) {
    infoMano = TIPOS_DE_MANO.FULL_HOUSE;
  } else if (esColor) {
    infoMano = TIPOS_DE_MANO.COLOR;
  } else if (esEscalera) {
    infoMano = TIPOS_DE_MANO.ESCALERA;
  } else if (repeticiones[0] === 3) {
    infoMano = TIPOS_DE_MANO.TRIO;
  } else if (repeticiones[0] === 2 && repeticiones[1] === 2) {
    infoMano = TIPOS_DE_MANO.DOBLE_PAREJA;
  } else if (repeticiones[0] === 2) {
    infoMano = TIPOS_DE_MANO.PAREJA;
  }

  // ==========================================
  // FILTRAR CARTAS PUNTUABLES
  // ==========================================
  const cartasOrdenadas = [...cartasSeleccionadas].sort((a, b) => b.valor - a.valor);

  let cartasPuntuables: CardData[];
  if (infoMano.nombre === 'Carta Alta') {
    cartasPuntuables = [cartasOrdenadas[0]];
  } else if (infoMano.nombre === 'Pareja' || infoMano.nombre === 'Doble Pareja') {
    cartasPuntuables = cartasOrdenadas.filter(c => conteoValores[c.valor] === 2);
  } else if (infoMano.nombre === 'Trío') {
    cartasPuntuables = cartasOrdenadas.filter(c => conteoValores[c.valor] === 3);
  } else if (infoMano.nombre === 'Póker') {
    cartasPuntuables = cartasOrdenadas.filter(c => conteoValores[c.valor] === 4);
  } else {
    // Color, Escalera, Escalera de Color y Full House: puntúan todas las 5 cartas
    cartasPuntuables = cartasOrdenadas;
  }

  const fichasCartas = cartasPuntuables.reduce(
    (suma, c) => suma + obtenerFichasDeCarta(c.valor),
    0
  );

  const fichasTotales = infoMano.fichasBase + fichasCartas;
  const puntajeFinal = fichasTotales * infoMano.multBase;

  return {
    nombreMano: infoMano.nombre,
    fichasBase: infoMano.fichasBase,
    fichasCartas,
    fichasTotales,
    mult: infoMano.multBase,
    puntajeFinal,
  };
}