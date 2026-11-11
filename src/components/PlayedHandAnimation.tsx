import { useEffect, useState } from 'react';
import type { CardData } from '../types/gameType';
import type { ResultadoMano } from '../logic/HandEvaluator';
import { sonidoTick, sonidoTotal } from '../services/Sounds';
import { Card } from './Card';

export type FaseAnimacionJugada = 'revelar' | 'puntuando' | 'desvanecer';

export interface JugadaAnimadaState {
  cartas: CardData[];
  resultado: ResultadoMano;
  fase: FaseAnimacionJugada;
  pasoActual: number;     // índice en resultado.pasos (-1 = todavía ninguno)
  fichas: number;         // fichas acumuladas hasta ahora
  mult: number;           // mult acumulado hasta ahora
  mostrarTotal: boolean;  // true al terminar todos los pasos
}

interface PlayedHandAnimationProps {
  jugada: JugadaAnimadaState;
}

/** Cuenta de 0 al total con una curva que frena al final, con un tic por cada tramo. */
function TotalAscendente({ total, activo }: { total: number; activo: boolean }) {
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (!activo) return;
    const DURACION_MS = 700;
    const inicio = performance.now();
    let raf = 0;
    let ultimoTick = 0;

    const paso = (ahora: number) => {
      const p = Math.min(1, (ahora - inicio) / DURACION_MS);
      const suave = 1 - Math.pow(1 - p, 3); // ease-out
      setValor(Math.round(total * suave));
      if (p < 1 && ahora - ultimoTick > 55) {
        sonidoTick(p);
        ultimoTick = ahora;
      }
      if (p < 1) raf = requestAnimationFrame(paso);
      else sonidoTotal();
    };

    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [activo, total]);

  return <>{activo ? valor : 0}</>;
}

export function PlayedHandAnimation({ jugada }: PlayedHandAnimationProps) {
  const { cartas, resultado, fase, pasoActual, fichas, mult, mostrarTotal } = jugada;

  // Fichas de cada carta que ya puntuó (índice de carta -> fichas)
  const puntuadas = new Map<number, number>();
  resultado.pasos.slice(0, pasoActual + 1).forEach((p) => {
    if (p.tipo === 'carta') puntuadas.set(p.indiceCarta, p.fichas);
  });

  const pasoActivo = !mostrarTotal ? resultado.pasos[pasoActual] : undefined;
  const indiceActivo = pasoActivo?.tipo === 'carta' ? pasoActivo.indiceCarta : -1;

  return (
    <div className={`animacion-jugada animacion-jugada--${fase}`}>
      <div className="animacion-jugada-banner">
        <div className="animacion-jugada-nombre">{resultado.nombreMano}</div>

        {/* fichas × mult que van subiendo conforme puntúan las cartas */}
        <div className="animacion-formula">
          <span key={`f${fichas}`} className="animacion-formula-fichas anim-valor-pop">{fichas}</span>
          <span className="animacion-formula-x">×</span>
          <span key={`m${mult}`} className="animacion-formula-mult anim-valor-pop">{mult}</span>
        </div>

        {/* El total solo aparece al final */}
        <div className={`animacion-jugada-puntos${mostrarTotal ? ' visible' : ''}`}>
          +<TotalAscendente total={resultado.puntajeFinal} activo={mostrarTotal} />{' '}
          <span className="animacion-jugada-pts-label">PTS</span>
        </div>
      </div>

      <div className="animacion-jugada-cartas">
        {cartas.map((carta, index) => {
          const esPuntuable = resultado.pasos.some(
            (p) => p.tipo === 'carta' && p.indiceCarta === index
          );
          const yaPuntuo = puntuadas.has(index);
          const clases = [
            'animacion-carta-slot',
            esPuntuable ? 'es-puntuable' : 'no-puntuable',
            yaPuntuo ? 'puntuada' : '',
            index === indiceActivo ? 'carta-activa' : '',
          ].join(' ');

          return (
            <div
              key={`${carta.valor}-${carta.palo}-${index}`}
              className={clases}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <Card data={{ ...carta, seleccionada: false }} />
              {yaPuntuo && (
                <div className="animacion-carta-chip-badge">+{puntuadas.get(index)}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}