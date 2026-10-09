import { useMemo, useState } from 'react';
import { Card } from './components/Card';
import { ComodinImagen } from './components/JokersImage';
import { MazoContador } from './components/MazoContador';
import { PantallaFin } from './components/PantallaFin';
import { Tienda } from './components/Store';
import { evaluarMano } from './logic/HandEvaluator';
import {
  useGameState,
  MAX_SELECCION,
  MAX_DESCARTES_POR_RONDA,
  MAX_MANOS_POR_RONDA,
  MAX_RONDAS,
  MAX_COMODINES,
  COMODINES_EN_OFERTA,
  VIDAS_INICIALES,
} from './hooks/useGameState';
import './App.css';

// Re-exportamos para que el comentario siga documentando los límites del mazo
// CARTAS_POR_RONDA(8) + MAX_MANOS*MAX_SELECCION(20) + MAX_DESCARTES*MAX_SELECCION(15) = 43 ≤ 52 ✓
void MAX_DESCARTES_POR_RONDA;
void MAX_MANOS_POR_RONDA;
void COMODINES_EN_OFERTA;
void VIDAS_INICIALES;

// Orden de palos para el modo "ordenar por palo" (Espadas → Corazones → Diamantes → Tréboles)
const ORDEN_PALOS: Record<string, number> = { Espadas: 0, Corazones: 1, Diamantes: 2, Treboles: 3 };

type OrdenMano = 'original' | 'valor' | 'palo';

// estado: 'lleno' | 'medio' | 'vacio'
function CorazonVida({ estado }: { estado: 'lleno' | 'medio' | 'vacio' }) {
  if (estado === 'lleno')  return <span className="vida-llena">♥</span>;
  if (estado === 'medio')  return <span className="vida-media">♡</span>;
  return <span className="vida-vacia">♡</span>;
}

/**
 * Convierte vidasCorazones (0..3, puede ser .5) a un array de estados por corazón.
 * Ejemplo: 2.5 → ['lleno','lleno','medio']
 */
function estadosCorazones(vidasCorazones: number, total: number): Array<'lleno' | 'medio' | 'vacio'> {
  return Array.from({ length: total }, (_, i) => {
    const umbral = i + 1;          // corazón i+1 se llena cuando vidasCorazones >= umbral
    if (vidasCorazones >= umbral)  return 'lleno';
    if (vidasCorazones >= umbral - 0.5) return 'medio';
    return 'vacio';
  });
}

function App() {
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
    alternarSeleccion,
    descartarCartas,
    confirmarMano,
    comprarComodin,
    continuarTrasTienda,
    reiniciarJuego,
  } = useGameState();

  const [ordenMano, setOrdenMano] = useState<OrdenMano>('original');

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

  // Clave estable basada en los valores de las cartas seleccionadas.
  // Usamos esta cadena como dependencia del useMemo para evitar recomputar en
  // cada render si la selección no cambió.
  const seleccionKey = cartasSeleccionadas.map(c => `${c.valor}${c.palo}`).join(',');

  // evaluarMano es pura y determinista: con la misma seleccionKey y los mismos
  // comodines siempre devuelve el mismo resultado, así que es seguro omitir
  // 'cartasSeleccionadas' del array de dependencias.
  const resultadoScoring = useMemo(
    () => evaluarMano(cartasSeleccionadas, comodinesEquipados),
    [seleccionKey, comodinesEquipados] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const faseLabel = derrota
    ? '💀 DERROTA'
    : juegoTerminado
    ? '🏁 JUEGO TERMINADO'
    : 'INTERCAMBIO';

  return (
    <div className="pantalla-juego">

      {/* PANTALLA DE FIN DE PARTIDA */}
      {mostrarFinPartida && (
        <PantallaFin
          resultados={[
            { nombre: 'TÚ', puntaje: puntajeTotal, eresTu: true },
            // TODO multijugador: reemplazar con datos reales del servidor
            { nombre: 'Jugador 2', puntaje: 0, eresTu: false },
            { nombre: 'Jugador 3', puntaje: 0, eresTu: false },
            { nombre: 'Jugador 4', puntaje: 0, eresTu: false },
          ]}
          onJugarOtraVez={reiniciarJuego}
          onFinalizar={() => window.close()}
        />
      )}

      {/* TIENDA (se muestra al terminar cada ronda) */}
      {mostrarTienda && (
        <Tienda
          oferta={ofertaTienda}
          monedas={monedas}
          comodinesEquipados={comodinesEquipados}
          maxComodines={MAX_COMODINES}
          onComprar={comprarComodin}
          onContinuar={continuarTrasTienda}
        />
      )}

      {/* 1. BARRA SUPERIOR */}
      <div className="barra-superior">
        <div className="jugador-activo">
          <span className="jugador-nombre">TÚ</span>
          <span className="jugador-vidas">
            {estadosCorazones(vidasCorazones, VIDAS_INICIALES).map((estado, i) => (
              <CorazonVida key={i} estado={estado} />
            ))}
          </span>
          <span className="jugador-monedas">🪙 {monedas}</span>
        </div>
        <div className="jugador-mockup" style={{ opacity: 0.4 }}>Jugador 2 ♥♥ | 🪙 —</div>
        <div className="jugador-mockup" style={{ opacity: 0.4 }}>Jugador 3 ♥♥♥ | 🪙 —</div>
        <div className="jugador-mockup" style={{ opacity: 0.4 }}>Jugador 4 ♥ | 🪙 —</div>
      </div>

      {/* 2. ZONA CENTRAL (3 Columnas) */}
      <div className="zona-central">

        {/* COLUMNA IZQUIERDA: COMODINES EQUIPADOS */}
        <div className="panel panel-comodines">
          <h3 className="panel-titulo titulo-comodines">COMODINES</h3>
          {Array.from({ length: MAX_COMODINES }).map((_, index) => {
            const comodin = comodinesEquipados[index];
            const esUltimo = index === MAX_COMODINES - 1;

            return comodin ? (
              <div key={comodin.id} className={`slot-comodin slot-comodin-lleno${esUltimo ? ' sin-margen' : ''}`}>
                <ComodinImagen comodin={comodin} />
                <div>
                  <div className="comodin-nombre">{comodin.nombre}</div>
                  <div className="comodin-descripcion">{comodin.descripcion}</div>
                </div>
              </div>
            ) : (
              <div key={`vacio-${index}`} className={`slot-comodin slot-comodin-vacio${esUltimo ? ' sin-margen' : ''}`}>
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
          </div>

          <MazoContador total={cartasEnMazo} conteo={conteoMazo} />

          {/* CARTAS */}
          <div className="zona-cartas">
            {manoOrdenada.map((carta) => (
              <Card key={`${carta.valor}-${carta.palo}`} data={carta} onClick={() => alternarSeleccion(mano.indexOf(carta))} />
            ))}
          </div>

          {/* BOTONES DE ORDEN */}
          <div className="botones-orden">
            <span className="orden-label">Ordenar:</span>
            <button
              className={`btn-orden${ordenMano === 'valor' ? ' activo' : ''}`}
              onClick={() => setOrdenMano(prev => prev === 'valor' ? 'original' : 'valor')}
            >
              Por valor  A→2
            </button>
            <button
              className={`btn-orden${ordenMano === 'palo' ? ' activo' : ''}`}
              onClick={() => setOrdenMano(prev => prev === 'palo' ? 'original' : 'palo')}
            >
              Por palo  ♠♥♦♣
            </button>
          </div>

          <p className="ayuda-seleccion">Selecciona hasta {MAX_SELECCION} cartas para descartarlas o jugarlas</p>

          {/* BOTONERA */}
          <div className="botonera">
            <div className="fase-label">
              Fase: <b>{faseLabel}</b>
            </div>
            <div className="botones-accion">
              <button
                onClick={descartarCartas}
                disabled={juegoTerminado || descartesRestantes === 0 || cartasSeleccionadasCount === 0}
                className="btn btn-descartar"
              >
                DESCARTAR ({descartesRestantes})
              </button>
              <button
                onClick={confirmarMano}
                disabled={juegoTerminado || manosRestantes === 0 || cartasSeleccionadasCount === 0}
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
            <div>Mejor mano: <span className="valor-blanco">{resultadoScoring.nombreMano}</span></div>
            <div>Base: <span className="valor-fichas">{resultadoScoring.fichasBase} 🟦</span></div>
            <div>Bonos cartas: <span className="valor-cartas">+{resultadoScoring.fichasCartas}</span></div>
            <div>Bonos comodines: <span className="valor-comodines">+{resultadoScoring.fichasComodines}</span></div>
            <div>
              Mult.: <span className="valor-mult">x{resultadoScoring.mult} 🟥</span>
              {resultadoScoring.multComodines > 0 && (
                <span className="valor-mult-comodines"> (+{resultadoScoring.multComodines} comodines)</span>
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
