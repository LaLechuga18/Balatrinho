import { useState, useRef, useEffect, useCallback } from 'react';
import type { CardData, EntradaHistorial, Palo } from '../types/gameType';
import type { NetworkPlayer, RoundResolutionResult, FinalLeaderboardEntry } from '../types/multiplayerType';
import type { ResultadoJugador } from '../components/PantallaFin';
import type { JugadaAnimadaState } from '../components/PlayedHandAnimation';
import type { EventoVisual } from '../components/CursedEventOverlay';
import type { RoundStatsInfo, PlayerRoundStat } from '../components/RoundStatsModal';
import { DeckManager } from '../logic/DeckManager';
import { evaluarMano } from '../logic/HandEvaluator';
import {
  generarOfertaTienda,
  generarEventoSolo,
  ajustarGanancia,
  datosComodin,
  PORCENTAJE_VENTA,
  CATALOGO_COMODINES,
  type Comodin,
  type EventoMaldito,
  type SubEventoMano,
} from '../logic/jokers';
import {
  crearBots,
  planearRonda,
  comprarComodinesBot,
  botANetworkPlayer,
  puntajeRondaBot,
  resolverRonda,
  type Bot,
  type ConfigBots,
} from '../logic/bots';
import { sonidoJugar, sonidoPunto, sonidoCarta, sonidoDescartar, sonidoMonedas, sonidoFallo } from '../services/Sounds';
import { getSocket } from '../services/socketService';

// ─── Constantes de configuración ────────────────────────────────────────────
export const CARTAS_POR_RONDA = 8;
export const MAX_SELECCION = 5;
export const MAX_DESCARTES_POR_RONDA = 3;
export const MAX_MANOS_POR_RONDA = 4;
export const MAX_COMODINES = 3;
export const COMODINES_EN_OFERTA = 3;
export const VIDAS_INICIALES = 3; // Las vidas se miden en medios corazones (3 = 3 corazones = 6 hp)
export const COSTO_REROLL_BASE = 3;
export const INCREMENTO_REROLL = 2;
export const COSTO_REROLL = 3;
export { PORCENTAJE_VENTA };

// Reglas que usan los bots del modo local
const CONFIG_BOTS: ConfigBots = {
  cartasPorRonda: CARTAS_POR_RONDA,
  maxDescartes: MAX_DESCARTES_POR_RONDA,
  maxManos: MAX_MANOS_POR_RONDA,
  maxSeleccion: MAX_SELECCION,
  maxComodines: MAX_COMODINES,
  comodinesEnOferta: COMODINES_EN_OFERTA,
  vidaInicialHp: VIDAS_INICIALES * 2,
};

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
  const nombreJugador = props?.nombreJugador || 'TÚ';
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
  const [totalCartasDescartadas, setTotalCartasDescartadas] = useState<number>(0);
  const totalDescartesRef = useRef<number>(0);

  const [mostrarTienda, setMostrarTienda] = useState<boolean>(false);
  const [ofertaTienda, setOfertaTienda] = useState<Comodin[]>([]);
  const semillaTiendaRef = useRef<number>(0);
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);
  const [mostrarFinPartida, setMostrarFinPartida] = useState<boolean>(false);

  // ─── Modal de estadísticas de la ronda ─────────────────────────────────────
  const [mostrarResumenRonda, setMostrarResumenRonda] = useState<boolean>(false);
  const [resumenRondaData, setResumenRondaData] = useState<RoundStatsInfo | null>(null);

  // ─── Bots (solo modo local) ──────────────────────────────────────────────────
  const [botsInicial] = useState<Bot[]>(() => (esMultiplayer ? [] : crearBots(CONFIG_BOTS)));
  const botsRef = useRef<Bot[]>(botsInicial);

  // ─── Estado multijugador ─────────────────────────────────────────────────────
  // En modo local los oponentes son los bots.
  const [oponentes, setOponentes] = useState<NetworkPlayer[]>(() => botsInicial.map(botANetworkPlayer));
  const [esperandoOponentes, setEsperandoOponentes] = useState<boolean>(false);
  const [esperandoSiguienteRonda, setEsperandoSiguienteRonda] = useState<boolean>(false);
  const [costoRerollActual, setCostoRerollActual] = useState<number>(COSTO_REROLL_BASE);
  const [rematchListo, setRematchListo] = useState<boolean>(false);
  const [resultadosTablaFin, setResultadosTablaFin] = useState<ResultadoJugador[]>([]);

  // ─── Estado de animación de jugada ──────────────────────────────────────────
  const [jugadaAnimada, setJugadaAnimada] = useState<JugadaAnimadaState | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const [eventoMaldito, setEventoMaldito] = useState<EventoVisual | null>(null);
  const eventoTimeoutsRef = useRef<number[]>([]);

  // Limpiar temporizadores al desmontar
  useEffect(() => {
    const eventoTimeouts = eventoTimeoutsRef.current;
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      eventoTimeouts.forEach(clearTimeout);
    };
  }, []);

  // ─── Derivados ──────────────────────────────────────────────────────────────
  const vidasCorazones = vidasHp / 2;
  const juegoTerminado = vidasHp <= 0;
  const derrota = vidasHp <= 0;

  // ─── Helpers internos ───────────────────────────────────────────────────────
  const sincronizarBots = useCallback((bots: Bot[]) => {
    botsRef.current = bots;
    setOponentes(bots.map(botANetworkPlayer));
  }, []);

  const agregarHistorial = useCallback((descripcion: string, ronda: number) => {
    setHistorial(prev => [{ ronda, descripcion }, ...prev].slice(0, 20));
  }, []);

  const procesarEventoMaldito = useCallback(
    (ev: EventoMaldito, miId: string) => {
      const clave = Date.now();
      const programar = (ms: number, fn: () => void) => {
        eventoTimeoutsRef.current.push(window.setTimeout(fn, ms));
      };

      if (ev.efecto === 'evento-aleatorio') {
        setEventoMaldito({ ...ev, miId, clave });
        programar(6700, () => setEventoMaldito(prev => (prev?.clave === clave ? null : prev)));

        const nombres: Record<SubEventoMano, string> = {
          revolucion: 'Revolución', bancarrota: 'Bancarrota', jackpot: 'Jackpot',
          sacrificio: 'Sacrificio', caos: 'Caos',
        };
        agregarHistorial(`🖐️ ${ev.vendedorNombre} vendió La Mano: ¡${nombres[ev.evento]}!`, rondaActual);

        const APLICA: Record<SubEventoMano, number> = {
          revolucion: 1600, bancarrota: 1000, jackpot: 1100, caos: 1300, sacrificio: 1500,
        };

        programar(3750 + APLICA[ev.evento], () => {
          switch (ev.evento) {
            case 'bancarrota':
              setMonedas(m => Math.floor(m * 0.75));
              break;
            case 'jackpot':
              if (ev.ganador?.playerId === miId) {
                setMonedas(m => m + ajustarGanancia(comodinesEquipados, 10));
              }
              break;
            case 'sacrificio': {
              const a = ev.afectados ?? [];
              const mio = a.find(x => x.playerId === miId);
              if (mio) setComodinesEquipados(prev => prev.filter(c => c.id !== mio.jokerId));
              setOponentes(prev =>
                prev.map(p => {
                  const x = a.find(y => y.playerId === p.id);
                  return x ? { ...p, jokers: (p.jokers ?? []).filter(j => j.id !== x.jokerId) } : p;
                })
              );
              break;
            }
            case 'revolucion': {
              const x = ev.intercambio;
              if (!x) break;
              if (miId === x.primeroId) {
                setPuntajeTotal(x.totalUltimo);
                if (x.cambiaRonda) setPuntajeRonda(x.rondaUltimo);
              } else if (miId === x.ultimoId) {
                setPuntajeTotal(x.totalPrimero);
                if (x.cambiaRonda) setPuntajeRonda(x.rondaPrimero);
              }
              setOponentes(prev =>
                prev.map(p => {
                  if (p.id === x.primeroId) {
                    return { ...p, totalScore: x.totalUltimo, ...(x.cambiaRonda ? { currentRoundScore: x.rondaUltimo } : {}) };
                  }
                  if (p.id === x.ultimoId) {
                    return { ...p, totalScore: x.totalPrimero, ...(x.cambiaRonda ? { currentRoundScore: x.rondaPrimero } : {}) };
                  }
                  return p;
                })
              );
              break;
            }
            case 'caos': {
              const r = ev.reparto ?? [];
              const mio = r.find(x => x.playerId === miId);
              if (mio) {
                setComodinesEquipados(
                  mio.jokers
                    .map(j => CATALOGO_COMODINES.find(c => c.id === j.id))
                    .filter((c): c is Comodin => Boolean(c))
                );
              }
              setOponentes(prev =>
                prev.map(p => {
                  const x = r.find(y => y.playerId === p.id);
                  return x ? { ...p, jokers: x.jokers } : p;
                })
              );
              break;
            }
          }
        });
        return;
      }

      setEventoMaldito({ ...ev, miId, clave });
      const duracion = ev.efecto === 'tirar-dado' ? 4300 : 3900;
      programar(duracion, () => setEventoMaldito(prev => (prev?.clave === clave ? null : prev)));

      if (ev.efecto === 'tirar-dado') {
        agregarHistorial(
          `🎲 ${ev.vendedorNombre} vendió El Dado: ${ev.resultados.map(r => `${r.name} sacó ${r.tirada}`).join(' · ')}`,
          rondaActual
        );
        programar(1700, () => {
          const mia = ev.resultados.find(r => r.playerId === miId);
          if (mia) {
            const t = mia.tirada;
            if (t <= 2) setMonedas(m => Math.floor(m / 2));
            else if (t <= 4) setVidasHp(h => Math.max(1, h - 1));
            else if (t === 5) setMonedas(m => m + ajustarGanancia(comodinesEquipados, 5));
            else setMonedas(m => m * 2);
          }
          setOponentes(prev =>
            prev.map(p => {
              const r = ev.resultados.find(x => x.playerId === p.id);
              return r && r.tirada >= 3 && r.tirada <= 4 ? { ...p, hp: Math.max(1, p.hp - 1) } : p;
            })
          );
        });
        return;
      }

      const nombreEfecto = ev.efecto === 'destruir-joker-oponentes' ? 'La Muerte' : 'Joker Espacial';
      const detalle = ev.afectados.map(a => `${a.jugador} perdió ${a.nombre}`).join(' · ') || 'sin víctimas';
      agregarHistorial(`☠️ ${ev.vendedorNombre} vendió ${nombreEfecto}: ${detalle}`, rondaActual);

      programar(1500, () => {
        const mio = ev.afectados.find(a => a.playerId === miId);
        if (mio) setComodinesEquipados(prev => prev.filter(c => c.id !== mio.jokerId));
        setOponentes(prev =>
          prev.map(p => {
            const a = ev.afectados.find(x => x.playerId === p.id);
            return a ? { ...p, jokers: (p.jokers ?? []).filter(j => j.id !== a.jokerId) } : p;
          })
        );
      });
    },
    [agregarHistorial, rondaActual, comodinesEquipados]
  );

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
      jokers,
    }: {
      playerId: string;
      currentRoundScore: number;
      totalScore: number;
      jokers?: Array<{ id: string; nombre: string; imagen?: string }>;
    }) => {
      setOponentes(prev =>
        prev.map(p =>
          p.id === playerId
            ? { ...p, currentRoundScore, totalScore, ...(jokers ? { jokers } : {}) }
            : p
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
      players,
    }: {
      round: number;
      results: RoundResolutionResult[];
      isGameOver: boolean;
      finalLeaderboard?: FinalLeaderboardEntry[];
      players?: NetworkPlayer[];
      abandonedWin?: boolean;
    }) => {
      setEsperandoOponentes(false);

      const miResultado = results.find(r => r.playerId === socket.id);
      const miDanio = miResultado?.damage ?? 0;
      const misMonedasGanadas = miResultado?.coinsEarned ?? 0;

      if (miResultado) {
        setVidasHp(miResultado.newHp);
        setMonedas(prev => Math.max(0, prev + misMonedasGanadas));

        const detalleDaño = miResultado.damage > 0
          ? ` 💔 Recibiste -${miResultado.damage / 2} corazón`
          : ' 🛡️ ¡Sin daño!';
        const detalleMonedas = ` ${miResultado.coinsEarned >= 0 ? '+' : ''}${miResultado.coinsEarned}🪙`;

        agregarHistorial(
          `Fin ronda ${round}. Puesto #${miResultado.rank}.${detalleMonedas}.${detalleDaño}`,
          round
        );
      }

      const allPlayersList = players || oponentes;

      // Actualizar vidas y monedas de oponentes
      setOponentes(prev =>
        prev.map(p => {
          const res = results.find(r => r.playerId === p.id);
          const fromPlayers = allPlayersList.find(pl => pl.id === p.id);
          if (res) {
            return {
              ...p,
              hp: res.newHp,
              isAlive: res.isAlive,
              roundFinished: false,
              shopReady: false,
              coins: res.totalCoins ?? p.coins,
              jokers: res.jokers || fromPlayers?.jokers || p.jokers,
            };
          }
          return fromPlayers ? { ...p, ...fromPlayers } : p;
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
      }

      if (results.length > 0) {
        const statsMulti: PlayerRoundStat[] = results.map(r => {
          const matchedPlayer = allPlayersList.find(p => p.id === r.playerId);
          return {
            id: r.playerId,
            name: r.name,
            isHost: matchedPlayer?.isHost,
            roundScore: r.roundScore,
            totalScore: matchedPlayer?.totalScore ?? r.roundScore,
            rank: r.rank,
            damage: r.damage,
            hp: r.newHp,
            coinsEarned: r.coinsEarned,
            totalCoins: r.totalCoins ?? matchedPlayer?.coins ?? 0,
            isAlive: r.isAlive,
            eresTu: r.playerId === socket.id,
            jokers: r.jokers || matchedPlayer?.jokers || (r.playerId === socket.id ? comodinesEquipados.map(datosComodin) : []),
          };
        });

        setResumenRondaData({
          ronda: round,
          stats: statsMulti,
          tuDanio: miDanio,
          tuPuntaje: miResultado?.roundScore ?? puntajeRonda,
          tusMonedasGanadas: misMonedasGanadas,
          tusMonedasTotales: Math.max(0, monedas + misMonedasGanadas),
          tusVidasRestantes: (miResultado?.newHp ?? vidasHp) / 2,
          esFinJuego: isGameOver,
        });
        setMostrarResumenRonda(true);
      } else if (isGameOver) {
        // En caso de victoria directa por abandono de los demás jugadores
        setMostrarFinPartida(true);
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

    const handleRematchStatus = ({ players }: { players: NetworkPlayer[] }) => {
      setOponentes(players.filter(p => p.id !== socket.id));
    };

    const handleGameStarted = ({ round, players }: { round: number; players: NetworkPlayer[] }) => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      const ronda = crearRonda();
      mazoRef.current = ronda.mazo;
      setMano(ronda.mano);
      setCartasEnMazo(ronda.mazo.cartasRestantes());
      setConteoMazo(conteoDesde(ronda.mazo));
      setDescartesRestantes(MAX_DESCARTES_POR_RONDA);
      setManosRestantes(MAX_MANOS_POR_RONDA);
      setRondaActual(round || 1);
      setPuntajeRonda(0);
      setPuntajeTotal(0);
      setMonedas(0);
      setVidasHp(VIDAS_INICIALES * 2);
      setComodinesEquipados([]);
      setTotalCartasDescartadas(0);
      totalDescartesRef.current = 0;
      setMostrarTienda(false);
      setMostrarResumenRonda(false);
      setResumenRondaData(null);
      setOfertaTienda([]);
      semillaTiendaRef.current = 0;
      setCostoRerollActual(COSTO_REROLL_BASE);
      setHistorial([]);
      setEsperandoOponentes(false);
      setEsperandoSiguienteRonda(false);
      setJugadaAnimada(null);
      setRematchListo(false);
      setMostrarFinPartida(false);
      setOponentes(players.filter(p => p.id !== socket.id));
    };

    const handleCursedEffect = (ev: EventoMaldito) => procesarEventoMaldito(ev, socket.id ?? '');
    socket.on('opponent_score_updated', handleOpponentScore);
    socket.on('opponent_finished_round', handleOpponentFinished);
    socket.on('round_resolved', handleRoundResolved);
    socket.on('all_shop_ready', handleAllShopReady);
    socket.on('room_updated', handleRoomUpdated);
    socket.on('rematch_status_updated', handleRematchStatus);
    socket.on('game_started', handleGameStarted);
    socket.on('cursed_effect', handleCursedEffect);

    return () => {
      socket.off('opponent_score_updated', handleOpponentScore);
      socket.off('opponent_finished_round', handleOpponentFinished);
      socket.off('round_resolved', handleRoundResolved);
      socket.off('all_shop_ready', handleAllShopReady);
      socket.off('room_updated', handleRoomUpdated);
      socket.off('rematch_status_updated', handleRematchStatus);
      socket.off('game_started', handleGameStarted);
      socket.off('cursed_effect', handleCursedEffect);
    };
  }, [esMultiplayer, comodinesEquipados, puntajeRonda, monedas, vidasHp, oponentes, repartirRonda, agregarHistorial, procesarEventoMaldito]);

  // ─── Acciones del jugador ───────────────────────────────────────────────────

  const alternarSeleccion = (index: number) => {
    const cantidadSeleccionada = mano.filter(c => c.seleccionada).length;
    if (!mano[index].seleccionada && cantidadSeleccionada >= MAX_SELECCION) return;

    sonidoCarta(!mano[index].seleccionada);
    setMano(prev =>
      prev.map((carta, i) =>
        i === index ? { ...carta, seleccionada: !carta.seleccionada } : carta
      )
    );
  };

  const descartarCartas = () => {
    if (descartesRestantes <= 0 || esperandoOponentes) return;
    if (!mano.some(c => c.seleccionada)) return;

    sonidoDescartar();
    const cantidad = mano.filter(c => c.seleccionada).length;
    setTotalCartasDescartadas(prev => {
      const nuevo = prev + cantidad;
      totalDescartesRef.current = nuevo;
      return nuevo;
    });

    setMano(reponerCartasSeleccionadas());
    setDescartesRestantes(prev => prev - 1);
    agregarHistorial(`Descartaste ${cantidad} carta${cantidad > 1 ? 's' : ''}.`, rondaActual);
  };

  const confirmarMano = () => {
    if (juegoTerminado || manosRestantes <= 0 || esperandoOponentes || jugadaAnimada) return;

    const cartasAJugar = mano.filter(carta => carta.seleccionada);
    if (cartasAJugar.length === 0) return;

    const calculo = evaluarMano(cartasAJugar, comodinesEquipados, {
      monedas,
      totalDescartes: totalDescartesRef.current,
    });

    // ── Línea de tiempo de la animación ──
    const INICIO_MS = 450;        // cartas entran y se revelan
    const PASO_CARTA_MS = 420;    // tiempo por carta que puntúa
    const PASO_COMODIN_MS = 600;  // tiempo por comodín que se activa
    const PAUSA_TOTAL_MS = 1100;  // se queda mostrando el total
    const DESVANECER_MS = 400;

    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    const programar = (ms: number, fn: () => void) => {
      timeoutsRef.current.push(window.setTimeout(fn, ms));
    };

    sonidoJugar();
    setJugadaAnimada({
      cartas: cartasAJugar,
      resultado: calculo,
      fase: 'revelar',
      pasoActual: -1,
      fichas: calculo.fichasBase,
      mult: calculo.multBase,
      mostrarTotal: false,
    });

    programar(INICIO_MS - 50, () => {
      setJugadaAnimada(prev => (prev ? { ...prev, fase: 'puntuando' } : null));
    });

    let t = INICIO_MS;
    let nSonido = 0;
    calculo.pasos.forEach((paso, i) => {
      const n = paso.tipo === 'fallo' ? nSonido : nSonido++;
      programar(t, () => {
        setJugadaAnimada(prev =>
          prev
            ? { ...prev, pasoActual: i, fichas: paso.fichasDespues, mult: paso.multDespues }
            : null
        );
        if (paso.tipo === 'fallo') sonidoFallo();
        else sonidoPunto(n, paso.tipo);
      });
      t += paso.tipo === 'carta' ? PASO_CARTA_MS : PASO_COMODIN_MS;
    });

    // Mostrar el total
    programar(t, () => {
      setJugadaAnimada(prev => (prev ? { ...prev, mostrarTotal: true } : null));
    });
    t += PAUSA_TOTAL_MS;

    // Desvanecer
    programar(t, () => {
      setJugadaAnimada(prev => (prev ? { ...prev, fase: 'desvanecer' } : null));
    });
    t += DESVANECER_MS;

    const finalizar = () => {
      const nuevoPuntajeRonda = puntajeRonda + calculo.puntajeFinal;
      const nuevoPuntajeTotal = puntajeTotal + calculo.puntajeFinal;

      setPuntajeRonda(nuevoPuntajeRonda);
      setPuntajeTotal(nuevoPuntajeTotal);
      setMano(reponerCartasSeleccionadas());
      setJugadaAnimada(null);

      const manosQueQuedan = manosRestantes - 1;
      setManosRestantes(manosQueQuedan);

      agregarHistorial(
        `¡${calculo.nombreMano}! +${calculo.puntajeFinal} pts (${calculo.fichasTotales}🟦 × ${calculo.mult}🟥)`,
        rondaActual
      );

      if (esMultiplayer) {
        const socket = getSocket();
        const jokersData = comodinesEquipados.map(datosComodin);
        socket.emit('update_live_score', {
          currentRoundScore: nuevoPuntajeRonda,
          totalScore: nuevoPuntajeTotal,
          jokers: jokersData,
        });

        if (manosQueQuedan === 0) {
          setEsperandoOponentes(true);
          socket.emit('finish_round', {
            roundScore: nuevoPuntajeRonda,
            totalScore: nuevoPuntajeTotal,
            jokers: jokersData,
          });
        }
      } else {
        // Los bots avanzan una mano al ritmo del jugador
        sincronizarBots(
          botsRef.current.map(b =>
            b.vivo ? { ...b, manosJugadas: Math.min(b.manosJugadas + 1, b.plan.length) } : b
          )
        );
        if (manosQueQuedan === 0) {
          terminarRondaSolo(nuevoPuntajeRonda, nuevoPuntajeTotal);
        }
      }
    };

    // Fin: sumar puntaje, reponer cartas y avanzar
    programar(t, finalizar);
  };

  /** Resuelve la ronda del modo local contra los bots (mismas reglas que el servidor). */
  const terminarRondaSolo = (puntajeDeRonda: number, nuevoTotal: number) => {
    const bots = botsRef.current;
    const nombre = nombreJugador || 'TÚ';

    const resultados = resolverRonda([
      {
        id: 'local',
        name: nombre,
        hp: vidasHp,
        monedas,
        vivo: true,
        puntajeRonda: puntajeDeRonda,
        comodines: comodinesEquipados,
      },
      ...bots.map(b => ({
        id: b.id,
        name: b.nombre,
        hp: b.hp,
        monedas: b.monedas,
        vivo: b.vivo,
        puntajeRonda: puntajeRondaBot(b),
        comodines: b.comodines,
      })),
    ]);

    const mio = resultados.find(r => r.playerId === 'local')!;
    const nuevosBots = bots.map(b => {
      const r = resultados.find(x => x.playerId === b.id);
      if (!r) return b;
      return {
        ...b,
        hp: r.newHp,
        vivo: r.isAlive,
        monedas: r.totalCoins ?? b.monedas,
        puntajeTotal: b.puntajeTotal + r.roundScore,
      };
    });
    sincronizarBots(nuevosBots);

    const nuevoTotalMonedas = mio.totalCoins ?? monedas;
    setVidasHp(mio.newHp);
    setMonedas(nuevoTotalMonedas);

    const esFinJuego = !mio.isAlive || nuevosBots.every(b => !b.vivo);
    if (esFinJuego) {
      setResultadosTablaFin([
        { nombre, puntaje: nuevoTotal, eresTu: true },
        ...nuevosBots.map(b => ({ nombre: b.nombre, puntaje: b.puntajeTotal, eresTu: false })),
      ]);
    }

    const detalleDanio = mio.damage > 0 ? ` 💔 Recibiste -${mio.damage / 2} corazón` : ' 🛡️ ¡Sin daño!';
    agregarHistorial(
      `Fin ronda ${rondaActual}. Puesto #${mio.rank}. ${mio.coinsEarned >= 0 ? '+' : ''}${mio.coinsEarned}🪙.${detalleDanio}`,
      rondaActual
    );

    const stats: PlayerRoundStat[] = resultados.map(r => ({
      id: r.playerId,
      name: r.name,
      roundScore: r.roundScore,
      totalScore: r.playerId === 'local'
        ? nuevoTotal
        : (nuevosBots.find(b => b.id === r.playerId)?.puntajeTotal ?? r.roundScore),
      rank: r.rank,
      damage: r.damage,
      hp: r.newHp,
      coinsEarned: r.coinsEarned,
      totalCoins: r.totalCoins ?? 0,
      isAlive: r.isAlive,
      eresTu: r.playerId === 'local',
      jokers: r.jokers ?? [],
    }));

    setResumenRondaData({
      ronda: rondaActual,
      stats,
      tuDanio: mio.damage,
      tuPuntaje: puntajeDeRonda,
      tusMonedasGanadas: mio.coinsEarned,
      tusMonedasTotales: nuevoTotalMonedas,
      tusVidasRestantes: mio.newHp / 2,
      esFinJuego,
    });
    setMostrarResumenRonda(true);
  };

  const continuarTrasResumenRonda = () => {
    setMostrarResumenRonda(false);
    if (resumenRondaData?.esFinJuego || vidasHp <= 0) {
      setMostrarFinPartida(true);
    } else {
      setRondaActual(prev => (esMultiplayer ? prev : prev + 1));
      semillaTiendaRef.current = 0;
      setCostoRerollActual(COSTO_REROLL_BASE);
      setOfertaTienda(generarOfertaTienda(comodinesEquipados, COMODINES_EN_OFERTA, 0));
      setMostrarTienda(true);
    }
  };

  const venderComodin = (comodinId: string) => {
    const comodin = comodinesEquipados.find(c => c.id === comodinId);
    if (!comodin) return;
    sonidoMonedas();
    const reembolso = Math.floor(comodin.costo * PORCENTAJE_VENTA);
    const nuevosComodines = comodinesEquipados.filter(c => c.id !== comodinId);
    setMonedas(prev => prev + reembolso);
    setComodinesEquipados(nuevosComodines);
    agregarHistorial(`Vendiste "${comodin.nombre}" por 🪙 ${reembolso}.`, rondaActual);

    if (esMultiplayer) {
      const socket = getSocket();
      socket.emit('update_jokers', {
        jokers: nuevosComodines.map(datosComodin),
      });
      if (comodin.alVender) socket.emit('cursed_sell', { efecto: comodin.alVender });
    } else if (comodin.alVender) {
      procesarEventoMaldito(generarEventoSolo(comodin.alVender, nuevosComodines, nombreJugador), 'local');
    }
  };

  const comprarComodin = (comodin: Comodin) => {
    if (monedas < comodin.costo) return;
    if (comodinesEquipados.length >= MAX_COMODINES) return;
    if (comodinesEquipados.some(c => c.id === comodin.id)) return;

    sonidoMonedas();
    const nuevosComodines = [...comodinesEquipados, comodin];
    setMonedas(prev => prev - comodin.costo);
    setComodinesEquipados(nuevosComodines);
    agregarHistorial(`Compraste el comodín "${comodin.nombre}".`, rondaActual - 1);

    if (esMultiplayer) {
      const socket = getSocket();
      socket.emit('update_jokers', {
        jokers: nuevosComodines.map(datosComodin),
      });
    }
  };

  const continuarTrasTienda = () => {
    if (esMultiplayer) {
      setEsperandoSiguienteRonda(true);
      const socket = getSocket();
      socket.emit('shop_ready', {
        jokers: comodinesEquipados.map(datosComodin),
      });
    } else {
      // Los bots compran en la tienda y planean su siguiente ronda
      sincronizarBots(
        botsRef.current.map(b =>
          b.vivo ? planearRonda(comprarComodinesBot(b, CONFIG_BOTS), CONFIG_BOTS) : b
        )
      );
      setMostrarTienda(false);
      setMano(repartirRonda());
      setDescartesRestantes(MAX_DESCARTES_POR_RONDA);
      setManosRestantes(MAX_MANOS_POR_RONDA);
      setPuntajeRonda(0);
    }
  };

  const rerollTienda = () => {
    if (monedas < costoRerollActual) return;
    semillaTiendaRef.current += 1;
    setMonedas(prev => prev - costoRerollActual);
    setCostoRerollActual(prev => prev + INCREMENTO_REROLL);
    setOfertaTienda(generarOfertaTienda(comodinesEquipados, COMODINES_EN_OFERTA, semillaTiendaRef.current));
  };

  const reiniciarJuegoLocal = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
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
    setTotalCartasDescartadas(0);
    totalDescartesRef.current = 0;
    setMostrarTienda(false);
    setMostrarResumenRonda(false);
    setResumenRondaData(null);
    setOfertaTienda([]);
    semillaTiendaRef.current = 0;
    setCostoRerollActual(COSTO_REROLL_BASE);
    setHistorial([]);
    setEsperandoOponentes(false);
    setEsperandoSiguienteRonda(false);
    setJugadaAnimada(null);
    setRematchListo(false);
    setMostrarFinPartida(false);
    setResultadosTablaFin([]);
    sincronizarBots(crearBots(CONFIG_BOTS));
  }, [sincronizarBots]);

  const pedirRevancha = () => {
    if (esMultiplayer) {
      setRematchListo(true);
      const socket = getSocket();
      socket.emit('rematch_ready');
    } else {
      reiniciarJuegoLocal();
    }
  };

  const abandonarPartida = () => {
    if (esMultiplayer) {
      const socket = getSocket();
      socket.emit('leave_room');
    }
    reiniciarJuegoLocal();
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
    totalCartasDescartadas,
    mostrarTienda,
    mostrarResumenRonda,
    resumenRondaData,
    ofertaTienda,
    historial,
    mostrarFinPartida,
    juegoTerminado,
    derrota,
    oponentes,
    esperandoOponentes,
    esperandoSiguienteRonda,
    costoRerollActual,
    rematchListo,
    jugadaAnimada,
    eventoMaldito,
    resultadosTablaFin,
    // Acciones
    alternarSeleccion,
    descartarCartas,
    confirmarMano,
    comprarComodin,
    venderComodin,
    continuarTrasTienda,
    continuarTrasResumenRonda,
    rerollTienda,
    pedirRevancha,
    abandonarPartida,
    reiniciarJuego: pedirRevancha,
    setOponentes,
  };
}
