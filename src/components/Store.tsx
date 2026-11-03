import type { Comodin } from '../logic/jokers';
import { ComodinImagen } from './JokersImage';

interface TiendaProps {
  oferta: Comodin[];
  monedas: number;
  comodinesEquipados: Comodin[];
  maxComodines: number;
  costoReroll: number;
  esperandoSiguienteRonda?: boolean;
  onComprar: (comodin: Comodin) => void;
  onReroll: () => void;
  onContinuar: () => void;
}

export function Tienda({
  oferta,
  monedas,
  comodinesEquipados,
  maxComodines,
  costoReroll,
  esperandoSiguienteRonda = false,
  onComprar,
  onReroll,
  onContinuar,
}: TiendaProps) {
  const slotsLlenos = comodinesEquipados.length >= maxComodines;
  const puedeReroll = monedas >= costoReroll && !esperandoSiguienteRonda;

  return (
    <div className="tienda-overlay">
      <div className="tienda-modal">

        {/* Encabezado */}
        <h2 className="tienda-titulo">TIENDA DE COMODINES</h2>
        <div className="tienda-info">
          <span className="tienda-monedas">🪙 {monedas} monedas</span>
          <span className="tienda-slots">
            Comodines: {comodinesEquipados.length} / {maxComodines}
          </span>
        </div>

        {/* Oferta */}
        {oferta.length === 0 ? (
          <p className="tienda-vacia">No hay comodines nuevos disponibles.</p>
        ) : (
          <div className="tienda-oferta">
            {oferta.map((comodin) => {
              const yaEquipado = comodinesEquipados.some((c) => c.id === comodin.id);
              const puedeComprar =
                !esperandoSiguienteRonda &&
                !yaEquipado &&
                !slotsLlenos &&
                monedas >= comodin.costo;

              return (
                <div
                  key={comodin.id}
                  className={`tienda-carta${yaEquipado ? ' tienda-carta-equipada' : ''}`}
                >
                  <div className="tienda-carta-imagen">
                    <ComodinImagen comodin={comodin} ancho={96} alto={134} />
                  </div>
                  <h4 className="tienda-carta-nombre">{comodin.nombre}</h4>
                  <p className="tienda-carta-desc">{comodin.descripcion}</p>
                  <p className="tienda-carta-costo">🪙 {comodin.costo}</p>
                  <button
                    onClick={() => onComprar(comodin)}
                    disabled={!puedeComprar}
                    className={`tienda-btn-comprar${puedeComprar ? '' : ' disabled'}`}
                  >
                    {yaEquipado ? 'EQUIPADO' : slotsLlenos ? 'SIN ESPACIO' : 'COMPRAR'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Acciones inferiores */}
        <div className="tienda-acciones">
          <button
            className={`tienda-btn-reroll${puedeReroll ? '' : ' disabled'}`}
            onClick={onReroll}
            disabled={!puedeReroll}
            title={puedeReroll ? 'Ver otros comodines' : 'No tienes monedas suficientes'}
          >
            🎲 Re-roll  <span className="reroll-costo">🪙 {costoReroll}</span>
          </button>

          <button
            className={`tienda-btn-continuar${esperandoSiguienteRonda ? ' disabled' : ''}`}
            onClick={onContinuar}
            disabled={esperandoSiguienteRonda}
          >
            {esperandoSiguienteRonda ? '⏳ ESPERANDO OPONENTES...' : 'CONTINUAR ▶'}
          </button>
        </div>

      </div>
    </div>
  );
}
