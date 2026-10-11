import type { Palo } from '../types/gameType';

interface MazoContadorProps {
  total: number;
  conteo: Record<Palo, number>;
}

const PALOS: { palo: Palo; simbolo: string; clase: string }[] = [
  { palo: 'Corazones', simbolo: '♥', clase: 'palo-corazones' },
  { palo: 'Diamantes', simbolo: '♦', clase: 'palo-diamantes' },
  { palo: 'Treboles',  simbolo: '♣', clase: 'palo-treboles'  },
  { palo: 'Espadas',   simbolo: '♠', clase: 'palo-espadas'   },
];

export function MazoContador({ total, conteo }: MazoContadorProps) {
  return (
    <div className="mazo-contador">
      <div className="mazo-total">
        <span className="mazo-icono">🂠</span>
        <span className="mazo-total-num">{total}</span>
        <span className="mazo-total-label">en mazo</span>
      </div>
      <div className="mazo-palos">
        {PALOS.map(({ palo, simbolo, clase }) => (
          <div key={palo} className={`mazo-palo ${clase}`}>
            <span className="mazo-palo-simbolo">{simbolo}</span>
            <span className="mazo-palo-num">{conteo[palo]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
