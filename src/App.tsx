import { useMemo, useState } from 'react';
import { Card } from './components/Card';
import { ComodinImagen } from './components/JokersImage';
import { MazoContador } from './components/MazoContador';
import { PantallaFin } from './components/PantallaFin';
import { Tienda } from './components/Store';
import { Lobby } from './components/Lobby';
import { PlayedHandAnimation } from './components/PlayedHandAnimation';
import { CursedEventOverlay } from './components/CursedEventOverlay';
import { RoundStatsModal } from './components/RoundStatsModal';
import { getSocket } from './services/socketService';
import { JokerTip } from './components/JokerTip';
import { etiquetasEfectoComodin } from './logic/HandEvaluator';
import type { GameMode, NetworkPlayer } from './types/multiplayerType';
import {
  useGameState,
  MAX_SELECCION,
  MAX_COMODINES,
  VIDAS_INICIALES,
  PORCENTAJE_VENTA,
} from './hooks/useGameState';
import './App.css';
import '@fontsource/jersey-10/400.css';
import './GameTable.css';

// Orden de palos para el modo "ordenar por palo" (Espadas → Corazones → Diamantes → Tréboles)
const ORDEN_PALOS: Record<string, number> = { Espadas: 0, Corazones: 1, Diamantes: 2, Treboles: 3 };

type OrdenMano = 'original' | 'valor' | 'palo';

function CorazonVida({ estado }: { estado: 'lleno' | 'medio' | 'vacio' }) {
  if (estado === 'lleno') return <span className="vida-llena">♥</span>;
  if (estado === 'medio') return <span className="vida-media">♡</span>;
  return <span className="vida-vacia">♡</span>;
}

/**
 * Convierte vidasCorazones (0..3, puede ser .5) a un array de estados por corazón.
 * Ejemplo: 2.5 → ['lleno','lleno','medio']
 */
function estadosCorazones(vidasCorazones: number, total: number): Array<'lleno' | 'medio' | 'vacio'> {
  return Array.from({ length: total }, (_, i) => {
    const umbral = i + 1;
    if (vidasCorazones >= umbral) return 'lleno';
    if (vidasCorazones >= umbral - 0.5) return 'medio';
    return 'vacio';
  });
}

interface AppProps {
  /** Pantalla con la que arranca: 'solo' (juego local) o 'lobby' (crear / unirse a una sala en red). */
  modoInicial?: GameMode;
  /** Tipo de servidor que usa el lobby: red local (LAN) o servidor online. */
  modoRed?: 'lan' | 'online';
  /** Se llama al pulsar "Menú" o al terminar la partida, para volver al menú principal. */
  onVolverAlMenu?: () => void;
}

function App({ modoInicial = 'lobby', modoRed = 'lan', onVolverAlMenu }: AppProps) {
  const [modoJuego, setModoJuego] = useState<GameMode>(modoInicial);
  const [codigoSala, setCodigoSala] = useState<string>('');
  const [miNombre, setMiNombre] = useState<string>('TÚ');
  const [esHost, setEsHost] = useState<boolean>(false);

  const gameState = useGameState({
    modo: modoJuego === 'multiplayer' ? 'multiplayer' : 'solo',
    codigoSala,
    nombreJugador: miNombre,
    esHost,
  });

  const {
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
    comodinesEquipados,
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
    alternarSeleccion,
    descartarCartas,
    confirmarMano,
    comprarComodin,
    venderComodin,
    continuarTrasTienda,
    continuarTrasResumenRonda,
    rerollTienda,
    reiniciarJuego,
    abandonarPartida,
    setOponentes,
  } = gameState;

  const [ordenMano, setOrdenMano] = useState<OrdenMano>('original');
  // ID del comodín seleccionado para vender (null = ninguno)
  const [comodinSeleccionadoId, setComodinSeleccionadoId] = useState<string | null>(null);

  const toggleSeleccionVenta = (id: string) =>
    setComodinSeleccionadoId(prev => (prev === id ? null : id));

  const confirmarVenta = (id: string) => {
    venderComodin(id);
    setComodinSeleccionadoId(null);
  };

  // Orden visual de la mano — no muta el estado del hook, solo reordena para el render
  const manoOrdenada = useMemo(() => {
    const copia = [...mano];
    if (ordenMano === 'valor') {
      copia.sort((a, b) => b.valor - a.valor);
    } else if (ordenMano === 'palo') {
      copia.sort((a, b) => ORDEN_PALOS[a.palo] - ORDEN_PALOS[b.palo] || b.valor - a.valor);
    }
    return copia;
  }, [mano, ordenMano]);

  const cartasSeleccionadas = mano.filter(c => c.seleccionada);
  const cartasSeleccionadasCount = cartasSeleccionadas.length;

  const faseLabel = derrota
    ? '💀 DERROTA'
    : juegoTerminado
    ? '🏁 JUEGO TERMINADO'
    : esperandoOponentes
    ? '⏳ ESPERANDO OPONENTES'
    : 'INTERCAMBIO';

  // Paso de la animación que está activo ahora mismo (si hay jugada animándose)
  const pasoActivo =
    jugadaAnimada && !jugadaAnimada.mostrarTotal
      ? jugadaAnimada.resultado.pasos[jugadaAnimada.pasoActual]
      : undefined;
  const pasoComodin = pasoActivo?.tipo === 'comodin' ? pasoActivo : undefined;
  const pasoFallo = pasoActivo?.tipo === 'fallo' ? pasoActivo : undefined;
  const esMultijugador = modoJuego === 'multiplayer';

  const handleStartSolo = () => {
    setMiNombre('TÚ');
    setModoJuego('solo');
  };

  const handleStartMultiplayer = (
    roomCode: string,
    playerName: string,
    hostStatus: boolean,
    initialPlayers: NetworkPlayer[]
  ) => {
    setCodigoSala(roomCode);
    setMiNombre(playerName || 'TÚ');
    setEsHost(hostStatus);
    const miSocketId = getSocket().id;
    setOponentes(
      initialPlayers.filter(p => (miSocketId ? p.id !== miSocketId : p.name !== playerName))
    );
    setModoJuego('multiplayer');
  };

  // Sale de la partida: abandona la sala en el servidor y vuelve al menú principal o lobby
  const handleSalirAlMenu = () => {
    abandonarPartida();
    if (onVolverAlMenu) {
      onVolverAlMenu();
    } else {
      setModoJuego('lobby');
    }
  };

  if (modoJuego === 'lobby') {
    return (
      <Lobby
        modoRed={modoRed}
        onStartSolo={handleStartSolo}
        onStartMultiplayer={handleStartMultiplayer}
        onVolver={onVolverAlMenu}
      />
    );
  }

  return (
    <div className="mesa">
      {eventoMaldito && <CursedEventOverlay key={eventoMaldito.clave} evento={eventoMaldito} />}

      {/* OVERLAY DE ESPERA DE OPONENTES AL TERMINAR MANOS */}
      {esperandoOponentes && !mostrarResumenRonda && (
        <div className="espera-overlay">
          <div className="espera-modal">
            <div className="espera-icono">⏳</div>
            <h2 className="espera-titulo">¡Completaste tus manos de la ronda {rondaActual}!</h2>
            <p className="espera-texto">Tu puntaje en esta ronda: <b>{puntajeRonda} pts</b></p>
            <p className="espera-subtexto">
              Esperando a que los demás jugadores terminen sus jugadas...
            </p>
          </div>
        </div>
      )}

      {/* MODAL DE ESTADÍSTICAS Y RESUMEN DE LA RONDA */}
      {mostrarResumenRonda && resumenRondaData && (
        <RoundStatsModal
          info={resumenRondaData}
          onContinuar={continuarTrasResumenRonda}
        />
      )}

      {/* PANTALLA DE FIN DE PARTIDA */}
      {mostrarFinPartida && (
        <PantallaFin
          resultados={
            resultadosTablaFin.length > 0
              ? resultadosTablaFin.map(r => ({
                  ...r,
                  rematchReady: r.eresTu
                    ? rematchListo
                    : (oponentes.find(op => op.name === r.nombre)?.rematchReady ?? false),
                }))
              : [{ nombre: miNombre, puntaje: puntajeTotal, eresTu: true, rematchReady: rematchListo }]
          }
          derrota={derrota}
          rondasJugadas={rondaActual}
          monedas={monedas}
          comodines={comodinesEquipados.length}
          maxComodines={MAX_COMODINES}
          vidas={vidasCorazones}
          vidasMax={VIDAS_INICIALES}
          codigoSala={codigoSala || undefined}
          rematchListo={rematchListo}
          onJugarOtraVez={reiniciarJuego}
          onFinalizar={handleSalirAlMenu}
        />
      )}

      {/* TIENDA (se muestra al terminar cada ronda tras el resumen) */}
      {mostrarTienda && (
        <Tienda
          oferta={ofertaTienda}
          monedas={monedas}
          comodinesEquipados={comodinesEquipados}
          maxComodines={MAX_COMODINES}
          costoReroll={costoRerollActual}
          esperandoSiguienteRonda={esperandoSiguienteRonda}
          onComprar={comprarComodin}
          onVender={venderComodin}
          onReroll={rerollTienda}
          onContinuar={continuarTrasTienda}
        />
      )}

      {/* ── PANEL LATERAL: ronda, jugada actual, contadores, jugadores y registro ── */}
      <aside className="mesa-lateral">
        <div className="mesa-ronda">
          <span className="mesa-ronda-titulo">RONDA {rondaActual}</span>
          <span className="mesa-ronda-fase">{faseLabel}</span>
          {codigoSala && <span className="mesa-ronda-sala">Sala {codigoSala}</span>}
        </div>

        <div className="mesa-bloque">
          <div className="mesa-bloque-titulo">Puntaje de la ronda</div>
          <div className="mesa-bloque-valor">{puntajeRonda}</div>
        </div>

        <div className="mesa-bloque mesa-jugada">
          <div className="mesa-jugada-nombre">
            {jugadaAnimada ? jugadaAnimada.resultado.nombreMano : '—'}
          </div>
          <div className="mesa-formula">
            <span className="mesa-formula-fichas">{jugadaAnimada ? jugadaAnimada.fichas : 0}</span>
            <span className="mesa-formula-x">×</span>
            <span className="mesa-formula-mult">{jugadaAnimada ? jugadaAnimada.mult : 0}</span>
          </div>
          <div className="mesa-jugada-total">
            {jugadaAnimada?.mostrarTotal ? `= ${jugadaAnimada.resultado.puntajeFinal}` : '='}
          </div>
        </div>

        <div className="mesa-fichas">
          <div className="mesa-ficha mesa-ficha--azul">
            <span className="mesa-ficha-etiqueta">Manos</span>
            <span className="mesa-ficha-valor">{manosRestantes}</span>
          </div>
          <div className="mesa-ficha mesa-ficha--roja">
            <span className="mesa-ficha-etiqueta">Descartes</span>
            <span className="mesa-ficha-valor">{descartesRestantes}</span>
          </div>
          <div className="mesa-ficha mesa-ficha--oro">
            <span className="mesa-ficha-etiqueta">Monedas</span>
            <span className="mesa-ficha-valor">🪙 {monedas}</span>
          </div>
          <div className="mesa-ficha mesa-ficha--gris">
            <span className="mesa-ficha-etiqueta">Acumulado</span>
            <span className="mesa-ficha-valor">{puntajeTotal}</span>
          </div>
        </div>

        {/* JUGADORES: tú y, en partida en red, tus oponentes con sus vidas y puntaje */}
        <div className="mesa-bloque mesa-jugadores">
          <div className="mesa-jugador mesa-jugador--yo">
            <span>{miNombre}</span>
            <span className="jugador-vidas">
              {estadosCorazones(vidasCorazones, VIDAS_INICIALES).map((estado, i) => (
                <CorazonVida key={i} estado={estado} />
              ))}
            </span>
            {esMultijugador && <span className="mesa-jugador-pts">{puntajeRonda} pts</span>}
          </div>

          {esMultijugador && oponentes.length > 0 ? (
            oponentes.map((op) => (
              <div
                key={op.id}
                className={`mesa-jugador mesa-jugador--oponente${!op.isAlive ? ' mesa-jugador--eliminado' : ''}`}
              >
                <span>{op.isHost && '👑 '}{op.name}</span>
                <span className="oponente-vidas">
                  {estadosCorazones(op.hp / 2, VIDAS_INICIALES).map((estado, i) => (
                    <CorazonVida key={i} estado={estado} />
                  ))}
                </span>
                <span className="mesa-jugador-pts">{op.currentRoundScore} pts</span>
                {op.roundFinished && <span className="mesa-jugador-listo">✓</span>}
              </div>
            ))
          ) : (
            <div className="mesa-jugador mesa-jugador--mock">Modo solitario</div>
          )}
        </div>

        <div className="mesa-bloque mesa-registro">
          <div className="mesa-bloque-titulo">Registro de partida</div>
          <div className="registro-lista">
            {historial.length === 0 ? (
              <div className="registro-vacio">Esperando acción del jugador...</div>
            ) : (
              historial.map((entrada, i) => (
                <div key={i} className="registro-entrada">
                  <span className="registro-ronda">R{entrada.ronda}</span>
                  {entrada.descripcion}
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* ── TABLERO: comodines arriba, centro libre, acciones y mano abajo ── */}
      <main className="mesa-tablero">
        <button className="mesa-btn-salir" onClick={handleSalirAlMenu} title="Salir al menú">
          🏠 Menú
        </button>

        <section className="mesa-comodines" aria-label="Comodines">
          <div className="mesa-seccion-titulo">COMODINES {comodinesEquipados.length}/{MAX_COMODINES}</div>
          <div className="mesa-comodines-fila">
            {Array.from({ length: MAX_COMODINES }).map((_, index) => {
              const comodin = comodinesEquipados[index];

              if (!comodin) {
                return (
                  <div key={`vacio-${index}`} className="mesa-slot">
                    <div className="mesa-joker mesa-joker--vacio">Vacío</div>
                    <span className="mesa-joker-nombre">&nbsp;</span>
                  </div>
                );
              }

              const seleccionado = comodin.id === comodinSeleccionadoId;
              const valorVenta = Math.floor(comodin.costo * PORCENTAJE_VENTA);
              const activo = pasoComodin?.comodinId === comodin.id;
              const fallo = pasoFallo?.comodinId === comodin.id;

              return (
                <div key={comodin.id} className="mesa-slot joker-tip-anclaje">
                  {fallo && (
                    <div className="joker-popups">
                      <span className="joker-popup joker-popup--fallo">¡FALLÓ!</span>
                    </div>
                  )}
                  {activo && pasoComodin && (
                    <div className="joker-popups">
                      {etiquetasEfectoComodin(pasoComodin).map((e) => (
                        <span key={e.texto} className={`joker-popup joker-popup--${e.tipo}`}>
                          {e.texto}
                        </span>
                      ))}
                    </div>
                  )}
                  <div
                    className={`mesa-joker mesa-joker--lleno${seleccionado ? ' mesa-joker--seleccionado' : ''}${activo ? ' mesa-joker--activo' : ''}${fallo ? ' mesa-joker--fallo' : ''}${comodin.maldito ? ' joker-maldito' : ''}`}
                    onClick={() => toggleSeleccionVenta(comodin.id)}
                  >
                    <ComodinImagen comodin={comodin} ancho="100%" alto="100%" />
                  </div>
                  {seleccionado ? (
                    <button className="mesa-btn-vender" data-sonido="ninguno" onClick={() => confirmarVenta(comodin.id)}>
                      Vender 🪙 {valorVenta}
                    </button>
                  ) : (
                    <span className="mesa-joker-nombre">{comodin.nombre}</span>
                  )}
                  <JokerTip comodin={comodin} extra={`Clic para vender · 🪙 ${valorVenta}`} />
                </div>
              );
            })}
          </div>
        </section>

        {/* Centro: animación de cartas jugadas y desglose de puntos */}
        <section className="mesa-centro">
          {jugadaAnimada ? (
            <PlayedHandAnimation jugada={jugadaAnimada} />
          ) : juegoTerminado || esperandoOponentes ? (
            <p className="mesa-pista mesa-pista--fin">{faseLabel}</p>
          ) : (
            <p className="mesa-pista">Selecciona hasta {MAX_SELECCION} cartas para jugarlas o descartarlas</p>
          )}
        </section>

        <section className="mesa-acciones">
          <button
            onClick={confirmarMano}
            disabled={
              juegoTerminado ||
              manosRestantes === 0 ||
              cartasSeleccionadasCount === 0 ||
              esperandoOponentes ||
              Boolean(jugadaAnimada)
            }
            className="mesa-btn mesa-btn--azul"
          >
            JUGAR MANO
          </button>

          <div className="mesa-ordenar">
            <span className="mesa-ordenar-label">ORDENAR</span>
            <button
              className={`mesa-btn-orden${ordenMano === 'valor' ? ' activo' : ''}`}
              onClick={() => setOrdenMano(prev => (prev === 'valor' ? 'original' : 'valor'))}
            >
              Valor
            </button>
            <button
              className={`mesa-btn-orden${ordenMano === 'palo' ? ' activo' : ''}`}
              onClick={() => setOrdenMano(prev => (prev === 'palo' ? 'original' : 'palo'))}
            >
              Palo
            </button>
          </div>

          <button
            onClick={descartarCartas}
            disabled={
              juegoTerminado ||
              descartesRestantes === 0 ||
              cartasSeleccionadasCount === 0 ||
              esperandoOponentes ||
              Boolean(jugadaAnimada)
            }
            className="mesa-btn mesa-btn--roja"
          >
            DESCARTAR
          </button>
        </section>

        <section className="mesa-mano-fila">
          <div className="mesa-cartas">
            {manoOrdenada.map((carta) => {
              const estaSiendoJugada = Boolean(jugadaAnimada && carta.seleccionada);
              return (
                <Card
                  key={`${carta.valor}-${carta.palo}`}
                  data={carta}
                  className={estaSiendoJugada ? 'carta-en-vuelo' : ''}
                  onClick={() => !jugadaAnimada && alternarSeleccion(mano.indexOf(carta))}
                />
              );
            })}
          </div>
          <div className="mesa-mazo">
            <MazoContador total={cartasEnMazo} conteo={conteoMazo} />
          </div>
        </section>
      </main>

    </div>
  );
}

export default App;
