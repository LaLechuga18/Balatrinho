import { useState, useRef } from 'react';
import type { CardData, EntradaHistorial, Palo } from '../types/gameType';
import { DeckManager } from '../logic/DeckManager';
import { evaluarMano } from '../logic/HandEvaluator';
import { generarOfertaTienda, type Comodin } from '../logic/jokers';

// ─── Constantes de configuración ────────────────────────────────────────────
export const CARTAS_POR_RONDA = 8;
export const MAX_SELECCION = 5;
export const MAX_DESCARTES_POR_RONDA = 3;
export const MAX_MANOS_POR_RONDA = 4;
export const MAX_RONDAS = 5;
export const MAX_COMODINES = 3;
export const COMODINES_EN_OFERTA = 3;
export const VIDAS_INICIALES = 3; // Las vidas se miden en medios corazones (3 = 3 corazones = 6 hp)
export const TOTAL_JUGADORES = 1; // TODO multijugador: recibir esto como parámetro del servidor

// Monedas base por posición al terminar la ronda (índice 0 = 1er lugar)
const MONEDAS_POR_POSICION = [5, 4, 3, 1] as const;
// Monedas extra por cada 100 puntos de puntaje en la ronda
const MONEDAS_POR_100_PUNTOS = 1;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function conteoDesde(mazo: DeckManager): Record<Palo, number> {
  return mazo.conteoMazo();
}

function crearRonda() {
  const mazo = new DeckManager();
  const mano = mazo.robar(CARTAS_POR_RONDA);
  return { mazo, mano };
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useGameState() {
  const [rondaInicial] = useState(crearRonda);
  const mazoRef = useRef<DeckManager>(rondaInicial.mazo);

  const [mano, setMano] = useState<CardData[]>(rondaInicial.mano);
  const [cartasEnMazo, setCartasEnMazo] = useState<number>(rondaInicial.mazo.cartasRestantes());
  const [conteoMazo, setConteoMazo] = useState<Record<Palo, number>>(() => conteoDesde(rondaInicial.mazo));
  const [descartesRestantes, setDescartesRestantes] = useState<number>(MAX_DESCARTES_POR_RONDA);
  const [manosRestantes, setManosRestantes] = useState<number>(MAX_MANOS_POR_RONDA);
  const [rondaActual, setRondaActual] = useState<number>(1);
  const [puntajeRonda, setPuntajeRonda] = useState<number>(0);
  const [puntajeTotal, setPuntajeTotal] = useState<number>(0);
  const [monedas, setMonedas] = useState<number>(0);
  // vidas se almacenan en medios corazones (6 = 3 corazones llenos).
  // Medio corazón = 1, corazón completo = 2. Daño: penúltimo -1, último -2.
  // setVidasHp se activa en terminarRonda cuando llegue el multijugador.
  const [vidasHp, setVidasHp] = useState<number>(VIDAS_INICIALES * 2);
  void setVidasHp; // TODO multijugador
  const [comodinesEquipados, setComodinesEquipados] = useState<Comodin[]>([]);
  const [mostrarTienda, setMostrarTienda] = useState<boolean>(false);
  const [ofertaTienda, setOfertaTienda] = useState<Comodin[]>([]);
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);
  const [mostrarFinPartida, setMostrarFinPartida] = useState<boolean>(false);

  // ─── Derivados ──────────────────────────────────────────────────────────────
  // vidasHp en escala de medios corazones → convertir a corazones para la UI
  const vidasCorazones = vidasHp / 2;           // puede ser .5, 1, 1.5 … 3
  const juegoTerminado = rondaActual > MAX_RONDAS || vidasHp <= 0;
  const derrota = vidasHp <= 0;

  // ─── Helpers internos ───────────────────────────────────────────────────────
  const agregarHistorial = (descripcion: string, ronda: number) => {
    setHistorial(prev => [{ ronda, descripcion }, ...prev].slice(0, 20));
  };

  const repartirRonda = (): CardData[] => {
    const ronda = crearRonda();
    mazoRef.current = ronda.mazo;
    setCartasEnMazo(ronda.mazo.cartasRestantes());
    setConteoMazo(conteoDesde(ronda.mazo));
    return ronda.mano;
  };

  /**
   * Clona las cartas seleccionadas y las reemplaza por cartas nuevas del mazo.
   * Las cartas no seleccionadas se mantienen con sus objetos originales.
   */
  const reponerCartasSeleccionadas = (): CardData[] => {
    const cantidad = mano.filter(c => c.seleccionada).length;
    const nuevasCartas = mazoRef.current.robar(cantidad);
    let idx = 0;

    const nuevaMano = mano.map(carta => {
      if (carta.seleccionada) {
        // nuevasCartas ya vienen sin seleccionada=true desde DeckManager
        return { ...nuevasCartas[idx++] };
      }
      // Clonar para no mutar el objeto del estado anterior
      return { ...carta, seleccionada: false };
    });

    setCartasEnMazo(mazoRef.current.cartasRestantes());
    setConteoMazo(conteoDesde(mazoRef.current));
    return nuevaMano;
  };

  // ─── Acciones del jugador ───────────────────────────────────────────────────

  const alternarSeleccion = (index: number) => {
    const cantidadSeleccionada = mano.filter(c => c.seleccionada).length;
    if (!mano[index].seleccionada && cantidadSeleccionada >= MAX_SELECCION) return;

    setMano(prev =>
      prev.map((carta, i) =>
        i === index ? { ...carta, seleccionada: !carta.seleccionada } : carta
      )
    );
  };

  const descartarCartas = () => {
    if (descartesRestantes <= 0) return;
    if (!mano.some(c => c.seleccionada)) return;

    const cantidad = mano.filter(c => c.seleccionada).length;
    setMano(reponerCartasSeleccionadas());
    setDescartesRestantes(prev => prev - 1);
    agregarHistorial(`Descartaste ${cantidad} carta${cantidad > 1 ? 's' : ''}.`, rondaActual);
  };

  const confirmarMano = () => {
    if (juegoTerminado || manosRestantes <= 0) return;

    const cartasAJugar = mano.filter(carta => carta.seleccionada);
    if (cartasAJugar.length === 0) return;

    const calculo = evaluarMano(cartasAJugar, comodinesEquipados);
    const nuevoPuntajeTotal = puntajeTotal + calculo.puntajeFinal;

    setPuntajeRonda(prev => prev + calculo.puntajeFinal);
    setPuntajeTotal(nuevoPuntajeTotal);
    setMano(reponerCartasSeleccionadas());

    const manosQueQuedan = manosRestantes - 1;
    setManosRestantes(manosQueQuedan);

    agregarHistorial(
      `¡${calculo.nombreMano}! +${calculo.puntajeFinal} pts (${calculo.fichasTotales}🟦 × ${calculo.mult}🟥)`,
      rondaActual
    );

    if (manosQueQuedan === 0) {
      terminarRonda(nuevoPuntajeTotal);
    }
  };

  const terminarRonda = (puntajeDeRonda: number) => {
    // ── Posición del jugador ──────────────────────────────────────────────────
    // En modo 1-jugador siempre es 1er lugar. Con multijugador, este valor vendrá
    // del servidor tras comparar el puntajeRonda de todos los jugadores.
    const posicion: 1 | 2 | 3 | 4 = 1; // TODO multijugador

    // ── Monedas ───────────────────────────────────────────────────────────────
    const monedasPosicion = MONEDAS_POR_POSICION[posicion - 1];
    const monedasPuntos = Math.floor(puntajeDeRonda / 100) * MONEDAS_POR_100_PUNTOS;
    const monedasGanadas = monedasPosicion + monedasPuntos;
    setMonedas(prev => prev + monedasGanadas);

    // ── Daño a vidas ─────────────────────────────────────────────────────────
    // Regla: los últimos 2 jugadores reciben daño. Si solo hay 2 jugadores,
    // únicamente el último recibe daño.
    // En modo 1-jugador nadie recibe daño (no hay comparación de puntajes).
    // TODO multijugador: recibir 'posicion' y 'totalJugadores' del servidor y aplicar:
    //   if (totalJugadores > 2 && posicion === totalJugadores - 1) → -1 hp (medio corazón)
    //   if (posicion === totalJugadores) → -2 hp (un corazón completo)
    //   if (totalJugadores === 2 && posicion === 2) → -1 hp (medio corazón)

    const siguienteRonda = rondaActual + 1;
    setRondaActual(siguienteRonda);

    const detalle = `+${monedasPosicion}🪙 pos. +${monedasPuntos}🪙 pts = +${monedasGanadas}🪙`;
    agregarHistorial(
      `Fin de ronda ${rondaActual}. Puntaje: ${puntajeDeRonda}. ${detalle}`,
      rondaActual
    );

    if (siguienteRonda <= MAX_RONDAS) {
      setOfertaTienda(generarOfertaTienda(comodinesEquipados, COMODINES_EN_OFERTA));
      setMostrarTienda(true);
    } else {
      agregarHistorial(`¡Partida terminada! Puntaje final: ${puntajeDeRonda}`, rondaActual);
      setMostrarFinPartida(true);
    }
  };

  const comprarComodin = (comodin: Comodin) => {
    if (monedas < comodin.costo) return;
    if (comodinesEquipados.length >= MAX_COMODINES) return;
    if (comodinesEquipados.some(c => c.id === comodin.id)) return;

    setMonedas(prev => prev - comodin.costo);
    setComodinesEquipados(prev => [...prev, comodin]);
    agregarHistorial(`Compraste el comodín "${comodin.nombre}".`, rondaActual - 1);
  };

  const continuarTrasTienda = () => {
    setMostrarTienda(false);
    setMano(repartirRonda());
    setDescartesRestantes(MAX_DESCARTES_POR_RONDA);
    setManosRestantes(MAX_MANOS_POR_RONDA);
    setPuntajeRonda(0);
  };

  /** Reinicia toda la partida desde cero (nueva ronda 1, sin comodines ni monedas). */
  const reiniciarJuego = () => {
    const ronda = crearRonda();
    mazoRef.current = ronda.mazo;
    setMano(ronda.mano);
    setCartasEnMazo(ronda.mazo.cartasRestantes());
    setConteoMazo(conteoDesde(ronda.mazo));
    setDescartesRestantes(MAX_DESCARTES_POR_RONDA);
    setManosRestantes(MAX_MANOS_POR_RONDA);
    setRondaActual(1);
    setPuntajeRonda(0);
    setPuntajeTotal(0);
    setMonedas(0);
    setVidasHp(VIDAS_INICIALES * 2);
    setComodinesEquipados([]);
    setMostrarTienda(false);
    setOfertaTienda([]);
    setHistorial([]);
    setMostrarFinPartida(false);
  };

  // ─── Retorno público ────────────────────────────────────────────────────────
  return {
    // Estado
    mano,
    cartasEnMazo,
    conteoMazo,
    descartesRestantes,
    manosRestantes,
    rondaActual,
    puntajeRonda,
    puntajeTotal,
    monedas,
    vidasCorazones,
    vidasHp,
    comodinesEquipados,
    mostrarTienda,
    ofertaTienda,
    historial,
    mostrarFinPartida,
    juegoTerminado,
    derrota,
    // Acciones
    alternarSeleccion,
    descartarCartas,
    confirmarMano,
    comprarComodin,
    continuarTrasTienda,
    reiniciarJuego,
  };
}
