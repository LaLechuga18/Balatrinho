import { useMemo, useState } from 'react';
import { Card } from './components/Card';
import { ComodinImagen } from './components/JokersImage';
import { MazoContador } from './components/MazoContador';
import { PantallaFin } from './components/PantallaFin';
import { Tienda } from './components/Store';
import { Lobby } from './components/Lobby';
import { evaluarMano } from './logic/HandEvaluator';
import type { GameMode, NetworkPlayer } from './types/multiplayerType';
import {
  useGameState,
  MAX_SELECCION,
  MAX_RONDAS,
  MAX_COMODINES,
  VIDAS_INICIALES,
  COSTO_REROLL,
  PORCENTAJE_VENTA,
} from './hooks/useGameState';
import './App.css';

// Orden de palos para el modo "ordenar por palo" (Espadas → Corazones → Diamantes → Tréboles)
const ORDEN_PALOS: Record<string, number> = { Espadas: 0, Corazones: 1, Diamantes: 2, Treboles: 3 };

type OrdenMano = 'original' | 'valor' | 'palo';

function CorazonVida({ estado }: { estado: 'lleno' | 'medio' | 'vacio' }) {
  if (estado === 'lleno') return <span className="vida-llena">♥</span>;
  if (estado === 'medio') return <span className="vida-media">♡</span>;
  return <span className="vida-vacia">♡</span>;
}

function estadosCorazones(vidasCorazones: number, total: number): Array<'lleno' | 'medio' | 'vacio'> {
  return Array.from({ length: total }, (_, i) => {
    const umbral = i + 1;
    if (vidasCorazones >= umbral) return 'lleno';
    if (vidasCorazones >= umbral - 0.5) return 'medio';
    return 'vacio';
  });
}

function App() {
  const [modoJuego, setModoJuego] = useState<GameMode>('lobby');
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
    ofertaTienda,
    historial,
    mostrarFinPartida,
    juegoTerminado,
    derrota,
    oponentes,
    esperandoOponentes,
    esperandoSiguienteRonda,
    resultadosTablaFin,
    alternarSeleccion,
    descartarCartas,
    confirmarMano,
    comprarComodin,
    venderComodin,
    continuarTrasTienda,
    rerollTienda,
    reiniciarJuego,
    setOponentes,
  } = gameState;

  const [ordenMano, setOrdenMano] = useState<OrdenMano>('original');
  const [comodinSeleccionadoId, setComodinSeleccionadoId] = useState<string | null>(null);

  const toggleSeleccionVenta = (id: string) =>
    setComodinSeleccionadoId(prev => (prev === id ? null : id));

  const confirmarVenta = (id: string) => {
    venderComodin(id);
    setComodinSeleccionadoId(null);
  };

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

  const seleccionKey = cartasSeleccionadas.map(c => `${c.valor}${c.palo}`).join(',');

  const resultadoScoring = useMemo(
    () => evaluarMano(cartasSeleccionadas, comodinesEquipados),
    [seleccionKey, comodinesEquipados] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const faseLabel = derrota
    ? '💀 DERROTA'
    : juegoTerminado
    ? '🏁 JUEGO TERMINADO'
    : esperandoOponentes
    ? '⏳ ESPERANDO OPONENTES'
    : 'INTERCAMBIO';

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
    setOponentes(initialPlayers.filter(p => p.name !== playerName));
    setModoJuego('multiplayer');
  };

  const handleVolverAlLobby = () => {
    reiniciarJuego();
    setModoJuego('lobby');
  };

  if (modoJuego === 'lobby') {
    return (
      <Lobby
        onStartSolo={handleStartSolo}
        onStartMultiplayer={handleStartMultiplayer}
      />
    );
  }

  return (
    <div className="pantalla-juego">

      {/* OVERLAY DE ESPERA DE OPONENTES AL TERMINAR MANOS */}
      {esperandoOponentes && (
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

      {/* PANTALLA DE FIN DE PARTIDA */}
      {mostrarFinPartida && (
        <PantallaFin
          resultados={
            resultadosTablaFin.length > 0
              ? resultadosTablaFin
              : [{ nombre: miNombre, puntaje: puntajeTotal, eresTu: true }]
          }
          onJugarOtraVez={reiniciarJuego}
          onFinalizar={handleVolverAlLobby}
        />
      )}

      {/* TIENDA (se muestra al terminar cada ronda) */}
      {mostrarTienda && (
        <Tienda
          oferta={ofertaTienda}
          monedas={monedas}
          comodinesEquipados={comodinesEquipados}
          maxComodines={MAX_COMODINES}
          costoReroll={COSTO_REROLL}
          esperandoSiguienteRonda={esperandoSiguienteRonda}
          onComprar={comprarComodin}
          onReroll={rerollTienda}
          onContinuar={continuarTrasTienda}
        />
      )}

      {/* 1. BARRA SUPERIOR */}
      <div className="barra-superior">
        {/* JUGADOR LOCAL */}
        <div className="jugador-activo">
          <span className="jugador-nombre">{miNombre}</span>
          <span className="jugador-vidas">
            {estadosCorazones(vidasCorazones, VIDAS_INICIALES).map((estado, i) => (
              <CorazonVida key={i} estado={estado} />
            ))}
          </span>
          <span className="jugador-monedas">🪙 {monedas}</span>
          {modoJuego === 'multiplayer' && (
            <span className="jugador-pts-ronda">({puntajeRonda} pts)</span>
          )}
        </div>

        {/* OPONENTES */}
        {modoJuego === 'multiplayer' && oponentes.length > 0 ? (
          oponentes.map((op) => (
            <div
              key={op.id}
              className={`jugador-oponente${!op.isAlive ? ' jugador-eliminado' : ''}`}
            >
              <span className="oponente-nombre">
                {op.isHost && '👑 '}{op.name}
              </span>
              <span className="oponente-vidas">
                {estadosCorazones(op.hp / 2, VIDAS_INICIALES).map((estado, i) => (
                  <CorazonVida key={i} estado={estado} />
                ))}
              </span>
              <span className="oponente-score">
                R{rondaActual}: {op.currentRoundScore} pts
              </span>
              {op.roundFinished && <span className="oponente-listo">✓ Listo</span>}
            </div>
          ))
        ) : (
          <>
            <div className="jugador-mockup" style={{ opacity: 0.3 }}>
              Modo Solitario
            </div>
            {codigoSala && (
              <div className="jugador-mockup" style={{ color: '#00ffcc' }}>
                Sala: {codigoSala}
              </div>
            )}
          </>
        )}

        <button className="btn-salir-partida" onClick={handleVolverAlLobby} title="Salir al menú">
          🏠 Menú
        </button>
      </div>

      {/* 2. ZONA CENTRAL (3 Columnas) */}
      <div className="zona-central">

        {/* COLUMNA IZQUIERDA: COMODINES EQUIPADOS */}
        <div className="panel panel-comodines">
          <h3 className="panel-titulo titulo-comodines">COMODINES</h3>
          {Array.from({ length: MAX_COMODINES }).map((_, index) => {
            const comodin = comodinesEquipados[index];
            const esUltimo = index === MAX_COMODINES - 1;
            const seleccionado = comodin?.id === comodinSeleccionadoId;
            const valorVenta = comodin ? Math.floor(comodin.costo * PORCENTAJE_VENTA) : 0;

            return comodin ? (
              <div
                key={comodin.id}
                className={`slot-comodin slot-comodin-lleno${esUltimo ? ' sin-margen' : ''}${
                  seleccionado ? ' slot-comodin-seleccionado' : ''
                }`}
                onClick={() => toggleSeleccionVenta(comodin.id)}
              >
                <ComodinImagen comodin={comodin} />
                <div className="comodin-info">
                  <div className="comodin-nombre">{comodin.nombre}</div>
                  <div className="comodin-descripcion">{comodin.descripcion}</div>
                  {seleccionado && (
                    <button
                      className="btn-vender"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmarVenta(comodin.id);
                      }}
                    >
                      Vender 🪙 {valorVenta}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                key={`vacio-${index}`}
                className={`slot-comodin slot-comodin-vacio${esUltimo ? ' sin-margen' : ''}`}
              >
                Vacío
              </div>
            );
          })}
        </div>

        {/* COLUMNA CENTRAL: TU MANO */}
        <div className="panel panel-mano">
          <h3 className="panel-titulo titulo-mano">TU MANO</h3>

          <div className="info-mano">
            Ronda: {Math.min(rondaActual, MAX_RONDAS)} / {MAX_RONDAS}
            {' | '}Seleccionadas: {cartasSeleccionadasCount} / {MAX_SELECCION}
            {codigoSala && ` | Sala: ${codigoSala}`}
          </div>

          <MazoContador total={cartasEnMazo} conteo={conteoMazo} />

          {/* CARTAS */}
          <div className="zona-cartas">
            {manoOrdenada.map((carta) => (
              <Card
                key={`${carta.valor}-${carta.palo}`}
                data={carta}
                onClick={() => alternarSeleccion(mano.indexOf(carta))}
              />
            ))}
          </div>

          {/* BOTONES DE ORDEN */}
          <div className="botones-orden">
            <span className="orden-label">Ordenar:</span>
            <button
              className={`btn-orden${ordenMano === 'valor' ? ' activo' : ''}`}
              onClick={() => setOrdenMano(prev => (prev === 'valor' ? 'original' : 'valor'))}
            >
              Por valor A→2
            </button>
            <button
              className={`btn-orden${ordenMano === 'palo' ? ' activo' : ''}`}
              onClick={() => setOrdenMano(prev => (prev === 'palo' ? 'original' : 'palo'))}
            >
              Por palo ♠♥♦♣
            </button>
          </div>

          <p className="ayuda-seleccion">
            Selecciona hasta {MAX_SELECCION} cartas para descartarlas o jugarlas
          </p>

          {/* BOTONERA */}
          <div className="botonera">
            <div className="fase-label">
              Fase: <b>{faseLabel}</b>
            </div>
            <div className="botones-accion">
              <button
                onClick={descartarCartas}
                disabled={
                  juegoTerminado ||
                  descartesRestantes === 0 ||
                  cartasSeleccionadasCount === 0 ||
                  esperandoOponentes
                }
                className="btn btn-descartar"
              >
                DESCARTAR ({descartesRestantes})
              </button>
              <button
                onClick={confirmarMano}
                disabled={
                  juegoTerminado ||
                  manosRestantes === 0 ||
                  cartasSeleccionadasCount === 0 ||
                  esperandoOponentes
                }
                className="btn btn-confirmar"
              >
                CONFIRMAR MANO ({manosRestantes})
              </button>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: PUNTUACIÓN */}
        <div className="panel panel-puntuacion">
          <h3 className="panel-titulo titulo-puntuacion">PUNTUACIÓN</h3>

          <div className="desglose-puntos">
            <div>
              Mejor mano: <span className="valor-blanco">{resultadoScoring.nombreMano}</span>
            </div>
            <div>
              Base: <span className="valor-fichas">{resultadoScoring.fichasBase} 🟦</span>
            </div>
            <div>
              Bonos cartas:{' '}
              <span className="valor-cartas">+{resultadoScoring.fichasCartas}</span>
            </div>
            <div>
              Bonos comodines:{' '}
              <span className="valor-comodines">+{resultadoScoring.fichasComodines}</span>
            </div>
            <div>
              Mult.: <span className="valor-mult">x{resultadoScoring.mult} 🟥</span>
              {resultadoScoring.multComodines > 0 && (
                <span className="valor-mult-comodines">
                  {' '}
                  (+{resultadoScoring.multComodines} comodines)
                </span>
              )}
            </div>
          </div>

          <div className="caja-total-puntos">
            <div className="caja-total-label">Score aproximado:</div>
            {resultadoScoring.puntajeFinal}
          </div>

          <div className="resumen-puntajes">
            <p className="resumen-etiqueta">Puntaje de la ronda:</p>
            <h3 className="resumen-valor resumen-ronda">{puntajeRonda}</h3>
            <p className="resumen-etiqueta">Puntaje acumulado:</p>
            <h3 className="resumen-valor resumen-total">{puntajeTotal}</h3>
            <p className="resumen-etiqueta">Monedas:</p>
            <h3 className="resumen-valor resumen-monedas">🪙 {monedas}</h3>
          </div>
        </div>

      </div>

      {/* 3. REGISTRO DE PARTIDA */}
      <div className="registro-partida">
        <h4 className="registro-titulo">REGISTRO DE PARTIDA</h4>
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

    </div>
  );
}

export default App;
