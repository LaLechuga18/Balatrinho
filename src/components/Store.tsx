import type { Comodin } from '../logic/jokers';
import { ComodinImagen } from './JokersImage';
import { JokerTip } from './JokerTip';
import '@fontsource/jersey-10/400.css';
import './Store.css';

interface TiendaProps {
  oferta: Comodin[];
  monedas: number;
  comodinesEquipados: Comodin[];
  maxComodines: number;
  costoReroll: number;
  porcentajeVenta?: number;
  esperandoSiguienteRonda?: boolean;
  onComprar: (comodin: Comodin) => void;
  onVender?: (comodinId: string) => void;
  onReroll: () => void;
  onContinuar: () => void;
}

export function Tienda({
  oferta,
  monedas,
  comodinesEquipados,
  maxComodines,
  costoReroll,
  porcentajeVenta = 0.4,
  esperandoSiguienteRonda = false,
  onComprar,
  onVender,
  onReroll,
  onContinuar,
}: TiendaProps) {
  const slotsLlenos = comodinesEquipados.length >= maxComodines;
  const puedeReroll = monedas >= costoReroll && !esperandoSiguienteRonda;

  return (
    <div className="shop-overlay">
      <div className="shop-panel">

        {/* Encabezado: título y monedas */}
        <div className="shop-encabezado">
          <h2 className="shop-titulo">TIENDA DE COMODINES</h2>
          <div className="shop-monedas">🪙 {monedas}</div>
        </div>

        <div className="shop-cuerpo">

          {/* Columna de acciones: siguiente ronda arriba, reroll abajo */}
          <div className="shop-acciones">
            <button
              className="shop-btn shop-btn--roja"
              onClick={onContinuar}
              disabled={esperandoSiguienteRonda}
            >
              {esperandoSiguienteRonda ? (
                <>ESPERANDO<br />OPONENTES...</>
              ) : (
                <>SIGUIENTE<br />RONDA</>
              )}
            </button>

            <button
              className="shop-btn shop-btn--verde"
              onClick={onReroll}
              disabled={!puedeReroll}
              title={puedeReroll ? 'Ver otros comodines' : 'No tienes monedas suficientes'}
            >
              <span>REROLL</span>
              <span className="shop-btn-precio">🪙 {costoReroll}</span>
            </button>
          </div>

          {/* Vitrina: comodines en venta */}
          <div className="shop-vitrina">
            <div className="shop-vitrina-titulo">En venta</div>

            {oferta.length === 0 ? (
              <p className="shop-vacia">No hay comodines nuevos disponibles.</p>
            ) : (
              <div className="shop-oferta">
                {oferta.map((comodin) => {
                  const yaEquipado = comodinesEquipados.some((c) => c.id === comodin.id);
                  const sinMonedas = monedas < comodin.costo;
                  const puedeComprar =
                    !esperandoSiguienteRonda && !yaEquipado && !slotsLlenos && !sinMonedas;

                  return (
                    <div
                      key={comodin.id}
                      className={`shop-carta joker-tip-anclaje${yaEquipado ? ' shop-carta--equipada' : ''}`}
                    >
                      <div className="shop-precio">🪙 {comodin.costo}</div>
                      <div className={`shop-joker${comodin.maldito ? ' joker-maldito' : ''}`}>
                        <ComodinImagen comodin={comodin} ancho="100%" alto="100%" />
                      </div>
                      <span className="shop-carta-nombre">{comodin.nombre}</span>
                      {comodin.maldito && <span className="joker-etiqueta-maldito">☠ MALDITO</span>}
                      <button
                        className="shop-btn-comprar"
                        onClick={() => onComprar(comodin)}
                        disabled={!puedeComprar}
                      >
                        {yaEquipado ? 'EQUIPADO' : slotsLlenos ? 'SIN ESPACIO' : sinMonedas ? 'SIN MONEDAS' : 'COMPRAR'}
                      </button>
                      <JokerTip comodin={comodin} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tus comodines equipados (pasa el mouse para ver qué hacen) */}
        <div className="shop-tuyos">
          <div className="shop-vitrina-titulo">
            Tus comodines {comodinesEquipados.length}/{maxComodines}
          </div>
          <div className="shop-tuyos-fila">
            {Array.from({ length: maxComodines }).map((_, index) => {
              const comodin = comodinesEquipados[index];

              if (!comodin) {
                return (
                  <div key={`vacio-${index}`} className="shop-tuyo-slot">
                    <div className="shop-mini shop-mini--vacio">Vacío</div>
                    <span className="shop-tuyo-nombre">&nbsp;</span>
                  </div>
                );
              }

              const valorVenta = Math.floor(comodin.costo * porcentajeVenta);

              return (
                <div key={comodin.id} className="shop-tuyo-slot joker-tip-anclaje">
                  <div className={`shop-mini${comodin.maldito ? ' joker-maldito' : ''}`}>
                    <ComodinImagen comodin={comodin} ancho="100%" alto="100%" />
                  </div>
                  <span className="shop-tuyo-nombre">{comodin.nombre}</span>
                  {onVender && (
                    <button
                      className="shop-btn-vender"
                      onClick={() => onVender(comodin.id)}
                      disabled={esperandoSiguienteRonda}
                      title={`Vender por 🪙 ${valorVenta}`}
                    >
                      Vender 🪙 {valorVenta}
                    </button>
                  )}
                  <JokerTip comodin={comodin} extra={`Vender por 🪙 ${valorVenta}`} lado="arriba" />
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}