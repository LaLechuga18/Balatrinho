import type { Comodin } from '../logic/jokers';
import { ComodinImagen } from './JokersImage';

interface TiendaProps {
  oferta: Comodin[];
  monedas: number;
  comodinesEquipados: Comodin[];
  maxComodines: number;
  onComprar: (comodin: Comodin) => void;
  onContinuar: () => void;
}

export function Tienda({
  oferta,
  monedas,
  comodinesEquipados,
  maxComodines,
  onComprar,
  onContinuar,
}: TiendaProps) {
  const slotsLlenos = comodinesEquipados.length >= maxComodines;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: '#0a0f2f',
          border: '2px solid #b721ff',
          borderRadius: '12px',
          padding: '30px',
          maxWidth: '700px',
          width: '90%',
          textAlign: 'center',
        }}
      >
        <h2 style={{ color: '#b721ff', marginTop: 0 }}>TIENDA DE COMODINES</h2>
        <p style={{ color: '#ffd700', fontSize: '1.2rem' }}>🪙 {monedas} monedas</p>
        <p style={{ color: '#aaa' }}>
          Comodines equipados: {comodinesEquipados.length} / {maxComodines}
        </p>

        {oferta.length === 0 ? (
          <p style={{ color: '#888' }}>No hay comodines nuevos disponibles.</p>
        ) : (
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap', margin: '25px 0' }}>
            {oferta.map((comodin) => {
              const yaEquipado = comodinesEquipados.some((c) => c.id === comodin.id);
              const puedeComprar = !yaEquipado && !slotsLlenos && monedas >= comodin.costo;

              return (
                <div
                  key={comodin.id}
                  style={{
                    border: '1px solid #ff77ff',
                    borderRadius: '8px',
                    padding: '15px',
                    width: '180px',
                    background: '#050a1f',
                    opacity: yaEquipado ? 0.4 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                    <ComodinImagen comodin={comodin} ancho={96} alto={134} />
                  </div>
                  <h4 style={{ color: '#ff77ff', margin: '0 0 8px 0' }}>{comodin.nombre}</h4>
                  <p style={{ color: '#ccc', fontSize: '0.85rem', minHeight: '60px' }}>
                    {comodin.descripcion}
                  </p>
                  <p style={{ color: '#ffd700', margin: '8px 0' }}>🪙 {comodin.costo}</p>
                  <button
                    onClick={() => onComprar(comodin)}
                    disabled={!puedeComprar}
                    style={{
                      padding: '8px 16px',
                      width: '100%',
                      backgroundColor: puedeComprar ? '#7a1fa2' : 'gray',
                      color: 'white',
                      border: '1px solid #b721ff',
                      borderRadius: '5px',
                      fontWeight: 'bold',
                      cursor: puedeComprar ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {yaEquipado ? 'EQUIPADO' : slotsLlenos ? 'SIN ESPACIO' : 'COMPRAR'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={onContinuar}
          style={{
            padding: '12px 30px',
            backgroundColor: 'green',
            color: 'white',
            border: '1px solid #00ff00',
            borderRadius: '5px',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          CONTINUAR A LA SIGUIENTE RONDA
        </button>
      </div>
    </div>
  );
}