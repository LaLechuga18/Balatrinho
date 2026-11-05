import '@fontsource/pixelify-sans/700.css';
import '@fontsource/jersey-10/400.css';
import './PantallaFin.css';

/** Resultado de un jugador para mostrar en la tabla final. */
export interface ResultadoJugador {
  nombre: string;
  puntaje: number;
  eresTu: boolean;
  rematchReady?: boolean;
}

interface PantallaFinProps {
  resultados: ResultadoJugador[];
  /** Te quedaste sin vidas. */
  derrota?: boolean;
  /** Datos de tu partida (cada fila solo se muestra si se pasa su dato). */
  rondasJugadas?: number;
  maxRondas?: number;
  monedas?: number;
  comodines?: number;
  maxComodines?: number;
  /** Vidas restantes (puede ser .5) y vidas con las que se empieza. */
  vidas?: number;
  vidasMax?: number;
  /** Código de sala, solo en partidas en red. */
  codigoSala?: string;
  rematchListo?: boolean;
  onJugarOtraVez: () => void;
  onFinalizar: () => void;
}

function medalla(pos: number): string {
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return `${pos}º`;
}

function Vidas({ vidas, max }: { vidas: number; max: number }) {
  return (
    <span className="gameover-vidas">
      {Array.from({ length: max }, (_, i) => {
        const umbral = i + 1;
        if (vidas >= umbral) return <span key={i} className="gameover-vida--llena">♥</span>;
        if (vidas >= umbral - 0.5) return <span key={i} className="gameover-vida--media">♥</span>;
        return <span key={i} className="gameover-vida--vacia">♡</span>;
      })}
    </span>
  );
}

export function PantallaFin({
  resultados,
  derrota = false,
  rondasJugadas,
  maxRondas,
  monedas,
  comodines,
  maxComodines,
  vidas,
  vidasMax = 3,
  codigoSala,
  rematchListo = false,
  onJugarOtraVez,
  onFinalizar,
}: PantallaFinProps) {
  // Ordenar de mayor a menor puntaje
  const clasificacion = [...resultados].sort((a, b) => b.puntaje - a.puntaje);
  const ganador = clasificacion[0];
  const juegoSolo = clasificacion.length === 1;
  const ganaste = !derrota && !juegoSolo && ganador.eresTu;

  // Título, tono y subtítulo según cómo terminó la partida
  let titulo = '¡PARTIDA TERMINADA!';
  let tono: 'victoria' | 'derrota' | 'neutro' = 'neutro';
  let subtitulo = juegoSolo
    ? `Puntaje final: ${ganador.puntaje.toLocaleString()}`
    : `${ganador.nombre} gana la partida`;

  if (derrota) {
    titulo = '¡DERROTA!';
    tono = 'derrota';
    subtitulo = 'Te quedaste sin vidas';
  } else if (ganaste) {
    titulo = '¡GANASTE!';
    tono = 'victoria';
    subtitulo = '¡Eres el ganador!';
  }

  const hayEstadisticas =
    rondasJugadas !== undefined ||
    monedas !== undefined ||
    comodines !== undefined ||
    vidas !== undefined ||
    Boolean(codigoSala);

  return (
    <div className="gameover-overlay">
      <div className="gameover-panel">

        {/* Título */}
        <div className="gameover-encabezado">
          <h1 className={`gameover-titulo gameover-titulo--${tono}`}>{titulo}</h1>
          <p className="gameover-subtitulo">{subtitulo}</p>
        </div>

        {/* Ranking */}
        <div className="gameover-bloque">
          <div className="gameover-seccion-titulo">Resultados</div>
          {clasificacion.map((jugador, i) => (
            <div
              key={jugador.nombre}
              className={`gameover-fila${jugador.eresTu ? ' gameover-fila--yo' : ''}`}
            >
              <span className="gameover-etiqueta">
                <span className="gameover-pos">{medalla(i + 1)}</span>
                <span className="gameover-nombre">{jugador.nombre}</span>
                {jugador.eresTu && <span className="gameover-tu">TÚ</span>}
                {Boolean(codigoSala) && (
                  jugador.rematchReady ? (
                    <span className="gameover-rematch-listo">LISTO ✓</span>
                  ) : (
                    <span className="gameover-rematch-esperando" title="Esperando confirmación">⏳</span>
                  )
                )}
              </span>
              <span className="gameover-valor">{jugador.puntaje.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Datos de tu partida */}
        {hayEstadisticas && (
          <div className="gameover-bloque">
            <div className="gameover-seccion-titulo">Tu partida</div>
            <div className="gameover-estadisticas">
              {rondasJugadas !== undefined && (
                <div className="gameover-fila">
                  <span className="gameover-etiqueta">Rondas jugadas</span>
                  <span className="gameover-valor">
                    {rondasJugadas}{maxRondas !== undefined ? `/${maxRondas}` : ''}
                  </span>
                </div>
              )}
              {vidas !== undefined && (
                <div className="gameover-fila">
                  <span className="gameover-etiqueta">Vidas</span>
                  <span className="gameover-valor"><Vidas vidas={vidas} max={vidasMax} /></span>
                </div>
              )}
              {monedas !== undefined && (
                <div className="gameover-fila">
                  <span className="gameover-etiqueta">Monedas</span>
                  <span className="gameover-valor">🪙 {monedas}</span>
                </div>
              )}
              {comodines !== undefined && (
                <div className="gameover-fila">
                  <span className="gameover-etiqueta">Comodines</span>
                  <span className="gameover-valor">
                    {comodines}{maxComodines !== undefined ? `/${maxComodines}` : ''}
                  </span>
                </div>
              )}
              {codigoSala && (
                <div className="gameover-fila">
                  <span className="gameover-etiqueta">Sala</span>
                  <span className="gameover-valor">{codigoSala}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="gameover-acciones">
          <button
            className={`gameover-btn gameover-btn--azul${rematchListo ? ' gameover-btn--esperando' : ''}`}
            onClick={onJugarOtraVez}
            disabled={rematchListo}
          >
            {rematchListo ? 'LISTO (ESPERANDO...)' : 'JUGAR OTRA VEZ'}
          </button>
          <button className="gameover-btn gameover-btn--roja" onClick={onFinalizar}>
            MENÚ PRINCIPAL
          </button>
        </div>

      </div>
    </div>
  );
}