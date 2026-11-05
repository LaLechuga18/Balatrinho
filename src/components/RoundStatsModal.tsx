import { ComodinImagen } from './JokersImage';
import type { Comodin } from '../logic/jokers';
import './RoundStatsModal.css';

export interface PlayerRoundStat {
  id: string;
  name: string;
  isHost?: boolean;
  roundScore: number;
  totalScore: number;
  rank: number;
  damage: number;
  hp: number;
  coinsEarned: number;
  totalCoins: number;
  isAlive: boolean;
  eresTu: boolean;
  jokers: Array<{
    id: string;
    nombre: string;
    imagen?: string;
  }>;
}

export interface RoundStatsInfo {
  ronda: number;
  stats: PlayerRoundStat[];
  tuDanio: number;
  tuPuntaje: number;
  tusMonedasGanadas: number;
  tusMonedasTotales: number;
  tusVidasRestantes: number;
  esFinJuego?: boolean;
}

interface RoundStatsModalProps {
  info: RoundStatsInfo;
  onContinuar: () => void;
}

function Corazones({ hp }: { hp: number }) {
  const totalCorazones = 3;
  const vidas = hp / 2;
  return (
    <span className="stats-corazones">
      {Array.from({ length: totalCorazones }, (_, i) => {
        const umbral = i + 1;
        if (vidas >= umbral) return <span key={i} className="corazon-lleno">♥</span>;
        if (vidas >= umbral - 0.5) return <span key={i} className="corazon-medio">♥</span>;
        return <span key={i} className="corazon-vacio">♡</span>;
      })}
    </span>
  );
}

function medalla(pos: number): string {
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return `${pos}º`;
}

export function RoundStatsModal({ info, onContinuar }: RoundStatsModalProps) {
  const ordenados = [...info.stats].sort((a, b) => a.rank - b.rank || b.roundScore - a.roundScore);

  return (
    <div className="roundstats-overlay">
      <div className="roundstats-modal">
        {/* Encabezado */}
        <div className="roundstats-header">
          <span className="roundstats-badge">RONDA {info.ronda}</span>
          <h2 className="roundstats-titulo">RESUMEN DE LA RONDA</h2>
        </div>

        {/* Tarjetas resumen del jugador */}
        <div className="roundstats-kpis">
          <div className="roundstats-kpi">
            <span className="kpi-label">Tu Puntaje</span>
            <span className="kpi-value kpi-value--pts">{info.tuPuntaje.toLocaleString()}</span>
          </div>

          <div className="roundstats-kpi">
            <span className="kpi-label">Daño Recibido</span>
            <span className={`kpi-value ${info.tuDanio > 0 ? 'kpi-value--danio' : 'kpi-value--salvado'}`}>
              {info.tuDanio > 0 ? `-${info.tuDanio} HP` : '¡0 HP!'}
            </span>
          </div>

          <div className="roundstats-kpi">
            <span className="kpi-label">Monedas Ganadas</span>
            <span className="kpi-value kpi-value--oro">
              +{info.tusMonedasGanadas} 🪙
              <small className="kpi-sub">Total: {info.tusMonedasTotales}</small>
            </span>
          </div>
        </div>

        {/* Tabla comparativa de la ronda */}
        <div className="roundstats-seccion">
          <div className="roundstats-seccion-titulo">Resultados y Comodines de los Jugadores</div>
          <div className="roundstats-tabla-wrap">
            <table className="roundstats-tabla">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Jugador</th>
                  <th>Puntos</th>
                  <th>Daño</th>
                  <th>Vidas</th>
                  <th>Monedas</th>
                  <th>Comodines Equipados</th>
                </tr>
              </thead>
              <tbody>
                {ordenados.map((p) => (
                  <tr key={p.id} className={p.eresTu ? 'fila-yo' : ''}>
                    <td className="col-pos">{medalla(p.rank)}</td>
                    <td className="col-nombre">
                      <div className="nombre-wrap">
                        <span>{p.isHost && '👑 '}{p.name}</span>
                        {p.eresTu && <span className="tag-yo">TÚ</span>}
                        {!p.isAlive && <span className="tag-muerto">💀</span>}
                      </div>
                    </td>
                    <td className="col-pts">{p.roundScore.toLocaleString()}</td>
                    <td className={`col-danio ${p.damage > 0 ? 'danio-rojo' : 'danio-verde'}`}>
                      {p.damage > 0 ? `-${p.damage} HP` : '0'}
                    </td>
                    <td className="col-vidas">
                      <Corazones hp={p.hp} />
                    </td>
                    <td className="col-monedas">+{p.coinsEarned} 🪙</td>
                    <td className="col-jokers">
                      {p.jokers && p.jokers.length > 0 ? (
                        <div className="jokers-mini-lista">
                          {p.jokers.map((j, idx) => {
                            const mockComodin: Comodin = {
                              id: j.id,
                              nombre: j.nombre,
                              descripcion: '',
                              costo: 0,
                              imagen: j.imagen,
                              calcularEfecto: () => ({ fichasExtra: 0, multExtra: 0 }),
                            };
                            return (
                              <div
                                key={`${j.id}-${idx}`}
                                className="joker-mini-item"
                                title={j.nombre}
                              >
                                <ComodinImagen
                                  comodin={mockComodin}
                                  ancho={34}
                                  alto={48}
                                />
                                <span className="joker-mini-nombre">{j.nombre}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="sin-jokers">Sin comodines</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botón de acción */}
        <div className="roundstats-footer">
          <button className="roundstats-btn" onClick={onContinuar}>
            {info.esFinJuego ? 'VER RESULTADOS FINALES 🏆' : 'CONTINUAR A LA TIENDA 🛍️'}
          </button>
        </div>
      </div>
    </div>
  );
}
