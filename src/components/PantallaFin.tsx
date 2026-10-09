/** Resultado de un jugador para mostrar en la tabla final. */
export interface ResultadoJugador {
  nombre: string;
  puntaje: number;
  eresTu: boolean;
}

interface PantallaFinProps {
  resultados: ResultadoJugador[];
  onJugarOtraVez: () => void;
  onFinalizar: () => void;
}

function medalla(pos: number): string {
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return `${pos}º`;
}

export function PantallaFin({ resultados, onJugarOtraVez, onFinalizar }: PantallaFinProps) {
  // Ordenar de mayor a menor puntaje
  const clasificacion = [...resultados].sort((a, b) => b.puntaje - a.puntaje);
  const ganador = clasificacion[0];

  return (
    <div className="fin-overlay">
      <div className="fin-modal">

        {/* Encabezado */}
        <div className="fin-encabezado">
          <div className="fin-trofeo">🏆</div>
          <h1 className="fin-titulo">¡Partida terminada!</h1>
          <p className="fin-ganador">
            <span className="fin-ganador-nombre">{ganador.nombre}</span>
            {ganador.eresTu ? ' — ¡Eres el ganador!' : ' gana la partida'}
          </p>
        </div>

        {/* Tabla de resultados */}
        <table className="fin-tabla">
          <thead>
            <tr>
              <th className="fin-th fin-th-pos">Pos.</th>
              <th className="fin-th fin-th-nombre">Jugador</th>
              <th className="fin-th fin-th-pts">Puntaje total</th>
            </tr>
          </thead>
          <tbody>
            {clasificacion.map((jugador, i) => (
              <tr
                key={jugador.nombre}
                className={`fin-tr${jugador.eresTu ? ' fin-tr-yo' : ''}`}
              >
                <td className="fin-td fin-td-pos">{medalla(i + 1)}</td>
                <td className="fin-td fin-td-nombre">
                  {jugador.nombre}
                  {jugador.eresTu && <span className="fin-yo-badge"> (tú)</span>}
                </td>
                <td className="fin-td fin-td-pts">{jugador.puntaje.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Botones — solo el host verá "Jugar otra vez" en multijugador */}
        <div className="fin-botones">
          <button className="fin-btn fin-btn-reiniciar" onClick={onJugarOtraVez}>
            🔄 Jugar otra vez
          </button>
          <button className="fin-btn fin-btn-salir" onClick={onFinalizar}>
            ✖ Finalizar partida
          </button>
        </div>

      </div>
    </div>
  );
}
