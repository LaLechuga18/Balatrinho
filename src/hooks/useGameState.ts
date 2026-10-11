import { useState, useRef, useEffect, useCallback } from 'react';
import type { CardData, EntradaHistorial, Palo } from '../types/gameType';
import type { NetworkPlayer, RoundResolutionResult, FinalLeaderboardEntry } from '../types/multiplayerType';
import type { ResultadoJugador } from '../components/PantallaFin';
import { DeckManager } from '../logic/DeckManager';
import { evaluarMano } from '../logic/HandEvaluator';
import { generarOfertaTienda, type Comodin } from '../logic/jokers';
import { getSocket } from '../services/socketService';

// ─── Constantes de configuración ────────────────────────────────────────────
export const CARTAS_POR_RONDA = 8;
export const MAX_SELECCION = 5;
export const MAX_DESCARTES_POR_RONDA = 3;
export const MAX_MANOS_POR_RONDA = 4;
export const MAX_RONDAS = 5;
export const MAX_COMODINES = 3;
export const COMODINES_EN_OFERTA = 3;
export const VIDAS_INICIALES = 3; // Las vidas se miden en medios corazones (3 = 3 corazones = 6 hp)
export const COSTO_REROLL = 3;
export const PORCENTAJE_VENTA = 0.4; // 40% del costo original

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

interface UseGameStateProps {
  modo?: 'solo' | 'multiplayer';
  codigoSala?: string;
  nombreJugador?: string;
  esHost?: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useGameState(props?: UseGameStateProps) {
  const modo = props?.modo || 'solo';
  const esMultiplayer = modo === 'multiplayer';

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
  const [vidasHp, setVidasHp] = useState<number>(VIDAS_INICIALES * 2);
  const [comodinesEquipados, setComodinesEquipados] = useState<Comodin[]>([]);
  const [mostrarTienda, setMostrarTienda] = useState<boolean>(false);
  const [ofertaTienda, setOfertaTienda] = useState<Comodin[]>([]);
  const semillaTiendaRef = useRef<number>(0);
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);
  const [mostrarFinPartida, setMostrarFinPartida] = useState<boolean>(false);

  // ─── Estado multijugador ─────────────────────────────────────────────────────
  const [oponentes, setOponentes] = useState<NetworkPlayer[]>([]);
  const [esperandoOponentes, setEsperandoOponentes] = useState<boolean>(false);
  const [esperandoSiguienteRonda, setEsperandoSiguienteRonda] = useState<boolean>(false);
  const [resultadosTablaFin, setResultadosTablaFin] = useState<ResultadoJugador[]>([]);

  // ─── Derivados ──────────────────────────────────────────────────────────────
  const vidasCorazones = vidasHp / 2;
  const juegoTerminado = rondaActual > MAX_RONDAS || vidasHp <= 0;
  const derrota = vidasHp <= 0;

  // ─── Helpers internos ───────────────────────────────────────────────────────
  const agregarHistorial = useCallback((descripcion: string, ronda: number) => {
    setHistorial(prev => [{ ronda, descripcion }, ...prev].slice(0, 20));
  }, []);

  const repartirRonda = useCallback((): CardData[] => {
    const ronda = crearRonda();
    mazoRef.current = ronda.mazo;
    setCartasEnMazo(ronda.mazo.cartasRestantes());
    setConteoMazo(conteoDesde(ronda.mazo));
    return ronda.mano;
  }, []);

  const reponerCartasSeleccionadas = (): CardData[] => {
    const cantidad = mano.filter(c => c.seleccionada).length;
    const nuevasCartas = mazoRef.current.robar(cantidad);
    let idx = 0;

    const nuevaMano = mano.map(carta => {
      if (carta.seleccionada) {
        return { ...nuevasCartas[idx++] };
      }
      return { ...carta, seleccionada: false };
    });

    setCartasEnMazo(mazoRef.current.cartasRestantes());
    setConteoMazo(conteoDesde(mazoRef.current));
    return nuevaMano;
  };

  // ─── Suscripción Socket.IO para multijugador ────────────────────────────────
  useEffect(() => {
    if (!esMultiplayer) return;

    const socket = getSocket();

    const handleOpponentScore = ({
      playerId,
      currentRoundScore,
      totalScore,
    }: {
      playerId: string;
      currentRoundScore: number;
      totalScore: number;
    }) => {
      setOponentes(prev =>
        prev.map(p =>
          p.id === playerId ? { ...p, currentRoundScore, totalScore } : p
        )
      );
    };

    const handleOpponentFinished = ({
      playerId,
      currentRoundScore,
    }: {
      playerId: string;
      currentRoundScore: number;
    }) => {
      setOponentes(prev =>
        prev.map(p =>
          p.id === playerId
            ? { ...p, currentRoundScore, roundFinished: true }
            : p
        )
      );
    };

    const handleRoundResolved = ({
      round,
      results,
      isGameOver,
      finalLeaderboard,
    }: {
      round: number;
      results: RoundResolutionResult[];
      isGameOver: boolean;
      finalLeaderboard?: FinalLeaderboardEntry[];
    }) => {
      setEsperandoOponentes(false);

      const miResultado = results.find(r => r.playerId === socket.id);
      if (miResultado) {
        setVidasHp(miResultado.newHp);
        setMonedas(prev => prev + miResultado.coinsEarned);

        const detalleDaño = miResultado.damage > 0
          ? ` 💔 Recibiste -${miResultado.damage / 2} corazón`
          : ' 🛡️ ¡Sin daño!';
        const detalleMonedas = ` +${miResultado.coinsEarned}🪙`;

        agregarHistorial(
          `Fin ronda ${round}. Puesto #${miResultado.rank}.${detalleMonedas}.${detalleDaño}`,
          round
        );
      }

      // Actualizar vidas y monedas de oponentes
      setOponentes(prev =>
        prev.map(p => {
          const res = results.find(r => r.playerId === p.id);
          if (res) {
            return {
              ...p,
              hp: res.newHp,
              isAlive: res.isAlive,
              roundFinished: false,
              shopReady: false,
            };
          }
          return p;
        })
      );

      if (isGameOver) {
        if (finalLeaderboard) {
          const formatResultados: ResultadoJugador[] = finalLeaderboard.map(entry => ({
            nombre: entry.name,
            puntaje: entry.totalScore,
            eresTu: entry.playerId === socket.id,
          }));
          setResultadosTablaFin(formatResultados);
        }
        setMostrarFinPartida(true);
      } else {
        setRondaActual(round + 1);
        semillaTiendaRef.current = 0;
        setOfertaTienda(generarOfertaTienda(comodinesEquipados, COMODINES_EN_OFERTA, 0));
        setMostrarTienda(true);
      }
    };

    const handleAllShopReady = ({
      nextRound,
      players,
    }: {
      nextRound: number;
      players: NetworkPlayer[];
    }) => {
      setMostrarTienda(false);
      setEsperandoSiguienteRonda(false);
      setMano(repartirRonda());
      setDescartesRestantes(MAX_DESCARTES_POR_RONDA);
      setManosRestantes(MAX_MANOS_POR_RONDA);
      setPuntajeRonda(0);
      setRondaActual(nextRound);
      setOponentes(players.filter(p => p.id !== socket.id));
    };

    const handleRoomUpdated = ({ players }: { players: NetworkPlayer[] }) => {
      setOponentes(players.filter(p => p.id !== socket.id));
    };

    socket.on('opponent_score_updated', handleOpponentScore);
    socket.on('opponent_finished_round', handleOpponentFinished);
    socket.on('round_resolved', handleRoundResolved);
    socket.on('all_shop_ready', handleAllShopReady);
    socket.on('room_updated', handleRoomUpdated);

    return () => {
      socket.off('opponent_score_updated', handleOpponentScore);
      socket.off('opponent_finished_round', handleOpponentFinished);
      socket.off('round_resolved', handleRoundResolved);
      socket.off('all_shop_ready', handleAllShopReady);
      socket.off('room_updated', handleRoomUpdated);
    };
  }, [esMultiplayer, comodinesEquipados, repartirRonda, agregarHistorial]);

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
    if (descartesRestantes <= 0 || esperandoOponentes) return;
    if (!mano.some(c => c.seleccionada)) return;

    const cantidad = mano.filter(c => c.seleccionada).length;
    setMano(reponerCartasSeleccionadas());
    setDescartesRestantes(prev => prev - 1);
    agregarHistorial(`Descartaste ${cantidad} carta${cantidad > 1 ? 's' : ''}.`, rondaActual);
  };

  const confirmarMano = () => {
    if (juegoTerminado || manosRestantes <= 0 || esperandoOponentes) return;

    const cartasAJugar = mano.filter(carta => carta.seleccionada);
    if (cartasAJugar.length === 0) return;

    const calculo = evaluarMano(cartasAJugar, comodinesEquipados);
    const nuevoPuntajeRonda = puntajeRonda + calculo.puntajeFinal;
    const nuevoPuntajeTotal = puntajeTotal + calculo.puntajeFinal;

    setPuntajeRonda(nuevoPuntajeRonda);
    setPuntajeTotal(nuevoPuntajeTotal);
    setMano(reponerCartasSeleccionadas());

    const manosQueQuedan = manosRestantes - 1;
    setManosRestantes(manosQueQuedan);

    agregarHistorial(
      `¡${calculo.nombreMano}! +${calculo.puntajeFinal} pts (${calculo.fichasTotales}🟦 × ${calculo.mult}🟥)`,
      rondaActual
    );

    if (esMultiplayer) {
      const socket = getSocket();
      socket.emit('update_live_score', {
        currentRoundScore: nuevoPuntajeRonda,
        totalScore: nuevoPuntajeTotal,
      });

      if (manosQueQuedan === 0) {
        setEsperandoOponentes(true);
        socket.emit('finish_round', {
          roundScore: nuevoPuntajeRonda,
          totalScore: nuevoPuntajeTotal,
        });
      }
    } else {
      if (manosQueQuedan === 0) {
        terminarRondaSolo(nuevoPuntajeTotal);
      }
    }
  };

  const terminarRondaSolo = (puntajeDeRonda: number) => {
    const posicion: 1 | 2 | 3 | 4 = 1;
    const monedasPosicion = MONEDAS_POR_POSICION[posicion - 1];
    const monedasPuntos = Math.floor(puntajeDeRonda / 100) * MONEDAS_POR_100_PUNTOS;
    const monedasGanadas = monedasPosicion + monedasPuntos;
    setMonedas(prev => prev + monedasGanadas);

    const siguienteRonda = rondaActual + 1;
    setRondaActual(siguienteRonda);

    const detalle = `+${monedasPosicion}🪙 pos. +${monedasPuntos}🪙 pts = +${monedasGanadas}🪙`;
    agregarHistorial(
      `Fin de ronda ${rondaActual}. Puntaje: ${puntajeDeRonda}. ${detalle}`,
      rondaActual
    );

    if (siguienteRonda <= MAX_RONDAS) {
      semillaTiendaRef.current = 0;
      setOfertaTienda(generarOfertaTienda(comodinesEquipados, COMODINES_EN_OFERTA, 0));
      setMostrarTienda(true);
    } else {
      agregarHistorial(`¡Partida terminada! Puntaje final: ${puntajeDeRonda}`, rondaActual);
      setResultadosTablaFin([
        { nombre: 'TÚ', puntaje: puntajeDeRonda, eresTu: true },
      ]);
      setMostrarFinPartida(true);
    }
  };

  const venderComodin = (comodinId: string) => {
    const comodin = comodinesEquipados.find(c => c.id === comodinId);
    if (!comodin) return;
    const reembolso = Math.floor(comodin.costo * PORCENTAJE_VENTA);
    setMonedas(prev => prev + reembolso);
    setComodinesEquipados(prev => prev.filter(c => c.id !== comodinId));
    agregarHistorial(`Vendiste "${comodin.nombre}" por 🪙 ${reembolso}.`, rondaActual);
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
    if (esMultiplayer) {
      setEsperandoSiguienteRonda(true);
      const socket = getSocket();
      socket.emit('shop_ready');
    } else {
      setMostrarTienda(false);
      setMano(repartirRonda());
      setDescartesRestantes(MAX_DESCARTES_POR_RONDA);
      setManosRestantes(MAX_MANOS_POR_RONDA);
      setPuntajeRonda(0);
    }
  };

  const rerollTienda = () => {
    if (monedas < COSTO_REROLL) return;
    semillaTiendaRef.current += 1;
    setMonedas(prev => prev - COSTO_REROLL);
    setOfertaTienda(generarOfertaTienda(comodinesEquipados, COMODINES_EN_OFERTA, semillaTiendaRef.current));
  };

  const reiniciarJuego = () => {
    if (esMultiplayer) {
      const socket = getSocket();
      socket.emit('play_again');
    }
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
    semillaTiendaRef.current = 0;
    setHistorial([]);
    setEsperandoOponentes(false);
    setEsperandoSiguienteRonda(false);
    setMostrarFinPartida(false);
  };

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
    oponentes,
    esperandoOponentes,
    esperandoSiguienteRonda,
    resultadosTablaFin,
    // Acciones
    alternarSeleccion,
    descartarCartas,
    confirmarMano,
    comprarComodin,
    venderComodin,
    continuarTrasTienda,
    rerollTienda,
    reiniciarJuego,
    setOponentes,
  };
}
