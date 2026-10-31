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
import '@fontsource/jersey-10/400.css';
import './GameTable.css';

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

  const hayJugada = cartasSeleccionadasCount > 0;

  return (
    <div className="mesa">

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

      {/* ── PANEL LATERAL: ronda, jugada actual, contadores, jugadores y registro ── */}
      <aside className="mesa-lateral">
        <div className="mesa-ronda">
          <span className="mesa-ronda-titulo">RONDA {Math.min(rondaActual, MAX_RONDAS)}/{MAX_RONDAS}</span>
          <span className="mesa-ronda-fase">{faseLabel}</span>
        </div>

        <div className="mesa-bloque">
          <div className="mesa-bloque-titulo">Puntaje de la ronda</div>
          <div className="mesa-bloque-valor">{puntajeRonda}</div>
        </div>

        <div className="mesa-bloque mesa-jugada">
          <div className="mesa-jugada-nombre">{hayJugada ? resultadoScoring.nombreMano : '—'}</div>
          <div className="mesa-formula">
            <span className="mesa-formula-fichas">{resultadoScoring.fichasTotales}</span>
            <span className="mesa-formula-x">×</span>
            <span className="mesa-formula-mult">{resultadoScoring.mult}</span>
          </div>
          <div className="mesa-jugada-total">= {resultadoScoring.puntajeFinal}</div>
          <div className="mesa-jugada-detalle">
            Base {resultadoScoring.fichasBase} · Cartas +{resultadoScoring.fichasCartas} · Comodines +{resultadoScoring.fichasComodines}
            {resultadoScoring.multComodines > 0 && ` · Mult +${resultadoScoring.multComodines}`}
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

        <div className="mesa-bloque mesa-jugadores">
          <div className="mesa-jugador mesa-jugador--yo">
            <span>TÚ</span>
            <span className="jugador-vidas">
              {estadosCorazones(vidasCorazones, VIDAS_INICIALES).map((estado, i) => (
                <CorazonVida key={i} estado={estado} />
              ))}
            </span>
          </div>
          <div className="mesa-jugador mesa-jugador--mock">Jugador 2 ♥♥ | 🪙 —</div>
          <div className="mesa-jugador mesa-jugador--mock">Jugador 3 ♥♥♥ | 🪙 —</div>
          <div className="mesa-jugador mesa-jugador--mock">Jugador 4 ♥ | 🪙 —</div>
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
        <section className="mesa-comodines" aria-label="Comodines">
          <div className="mesa-seccion-titulo">COMODINES {comodinesEquipados.length}/{MAX_COMODINES}</div>
          <div className="mesa-comodines-fila">
            {Array.from({ length: MAX_COMODINES }).map((_, index) => {
              const comodin = comodinesEquipados[index];

              return comodin ? (
                <div key={comodin.id} className="mesa-slot">
                  <div className="mesa-joker" title={`${comodin.nombre}: ${comodin.descripcion}`}>
                    <ComodinImagen comodin={comodin} ancho="100%" alto="100%" />
                  </div>
                  <span className="mesa-joker-nombre">{comodin.nombre}</span>
                </div>
              ) : (
                <div key={`vacio-${index}`} className="mesa-slot">
                  <div className="mesa-joker mesa-joker--vacio">Vacío</div>
                  <span className="mesa-joker-nombre">&nbsp;</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Centro: más adelante aquí aparecerán las cartas jugadas */}
        <section className="mesa-centro">
          {juegoTerminado ? (
            <p className="mesa-pista mesa-pista--fin">{faseLabel}</p>
          ) : (
            <p className="mesa-pista">Selecciona hasta {MAX_SELECCION} cartas para jugarlas o descartarlas</p>
          )}
        </section>

        <section className="mesa-acciones">
          <button
            onClick={confirmarMano}
            disabled={juegoTerminado || manosRestantes === 0 || cartasSeleccionadasCount === 0}
            className="mesa-btn mesa-btn--azul"
          >
            JUGAR MANO
          </button>

          <div className="mesa-ordenar">
            <span className="mesa-ordenar-label">ORDENAR</span>
            <button
              className={`mesa-btn-orden${ordenMano === 'valor' ? ' activo' : ''}`}
              onClick={() => setOrdenMano(prev => prev === 'valor' ? 'original' : 'valor')}
            >
              Valor
            </button>
            <button
              className={`mesa-btn-orden${ordenMano === 'palo' ? ' activo' : ''}`}
              onClick={() => setOrdenMano(prev => prev === 'palo' ? 'original' : 'palo')}
            >
              Palo
            </button>
          </div>

          <button
            onClick={descartarCartas}
            disabled={juegoTerminado || descartesRestantes === 0 || cartasSeleccionadasCount === 0}
            className="mesa-btn mesa-btn--roja"
          >
            DESCARTAR
          </button>
        </section>

        <section className="mesa-mano-fila">
          <div className="mesa-cartas">
            {manoOrdenada.map((carta) => (
              <Card key={`${carta.valor}-${carta.palo}`} data={carta} onClick={() => alternarSeleccion(mano.indexOf(carta))} />
            ))}
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