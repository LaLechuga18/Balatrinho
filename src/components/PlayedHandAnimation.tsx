import type { CardData } from '../types/gameType';
import { obtenerFichasDeCarta, type ResultadoMano } from '../logic/HandEvaluator';
import { Card } from './Card';

export type FaseAnimacionJugada = 'revelar' | 'puntuando' | 'desvanecer';

export interface JugadaAnimadaState {
  cartas: CardData[];
  resultado: ResultadoMano;
  fase: FaseAnimacionJugada;
}

interface PlayedHandAnimationProps {
  jugada: JugadaAnimadaState;
}

export function PlayedHandAnimation({ jugada }: PlayedHandAnimationProps) {
  const { cartas, resultado, fase } = jugada;

  return (
    <div className={`animacion-jugada animacion-jugada--${fase}`}>
      {/* Banner central con el tipo de mano y los puntos obtenidos */}
      <div className="animacion-jugada-banner">
        <div className="animacion-jugada-nombre">
          {resultado.nombreMano}
        </div>

        <div className="animacion-jugada-puntos">
          +{resultado.puntajeFinal} <span className="animacion-jugada-pts-label">PTS</span>
        </div>
      </div>

      {/* Cartas jugadas que vuelan al centro con brillo en las puntuables */}
      <div className="animacion-jugada-cartas">
        {cartas.map((carta, index) => {
          const esPuntuable = resultado.cartasPuntuables.some(
            (cp) => cp.valor === carta.valor && cp.palo === carta.palo
          );
          const fichasCarta = obtenerFichasDeCarta(carta.valor);

          return (
            <div
              key={`${carta.valor}-${carta.palo}-${index}`}
              className={`animacion-carta-slot ${esPuntuable ? 'es-puntuable' : 'no-puntuable'}`}
              style={{
                animationDelay: `${index * 80}ms`,
              }}
            >
              <Card data={{ ...carta, seleccionada: false }} />
              {esPuntuable && (
                <div className="animacion-carta-chip-badge">
                  +{fichasCarta}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
