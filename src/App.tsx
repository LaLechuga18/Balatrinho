import { useState, useRef } from 'react';
import { Card } from './components/Card';
import { ComodinImagen } from './components/JokersImage';
import { Tienda } from './components/Store';
import type { CardData } from './types/gameType';
import { DeckManager } from './logic/DeckManager';
import { evaluarMano } from './logic/HandEvaluator';
import { generarOfertaTienda, type Comodin } from './logic/jokers';
import './App.css';

// Config de la ronda:
// - Al empezar cada ronda se mezcla un mazo nuevo y se reparten 8 cartas.
// - Puedes seleccionar hasta 5 cartas a la vez (para descartarlas o para jugarlas).
// - Cada ronda tienes 3 ACCIONES de descarte y 4 MANOS para jugar. Al descartar o
//   jugar, solo se reponen las cartas usadas; el resto de tu mano se queda igual.
// - La ronda termina cuando se acaban tus manos (en multijugador: cuando TODOS los
//   jugadores terminen las suyas). Ahí se aplicará el daño y se abre la tienda.
// - La partida dura un máximo provisional de 10 rondas (sección 15 del documento).
//
// OJO con el mazo: en una ronda se roban como máximo
//   CARTAS_POR_RONDA + (MAX_MANOS * MAX_SELECCION) + (MAX_DESCARTES * MAX_SELECCION)
//   = 8 + 20 + 15 = 43 cartas, que cabe en el mazo de 52. Si subes estas constantes
//   y la suma pasa de 52, el mazo se agotaría a mitad de ronda.
const CARTAS_POR_RONDA = 8;
const MAX_SELECCION = 5;
const MAX_DESCARTES_POR_RONDA = 3;
const MAX_MANOS_POR_RONDA = 4;
const MAX_RONDAS = 10;

// Config de monedas — PROVISIONAL (ver Contexto maestro del videojuego, sección 8):
// el documento define +8 monedas al ganar una ronda y +3 al perderla, comparando
// tu puntuación contra la de otros jugadores. Como todavía no existe esa comparación
// (llega con el multijugador), usamos el valor base de "perder" al terminar cada ronda.
const MONEDAS_POR_RONDA_PROVISIONAL = 3;

// NOTA: el sistema de vidas y daño (secciones 6 y 7 del documento) depende de comparar
// el puntaje de la ronda de todos los jugadores. Se conecta en terminarRonda() cuando
// llegue el multijugador.

// Máximo de comodines equipados a la vez (sección 9 del documento)
const MAX_COMODINES = 3;
// Cuántos comodines ofrece la tienda cada vez que se abre (sección 11)
const COMODINES_EN_OFERTA = 3;

// Mezcla un mazo nuevo y reparte la mano inicial de una ronda
function crearRonda() {
  const mazo = new DeckManager();
  const mano = mazo.robar(CARTAS_POR_RONDA);
  return { mazo, mano };
}

function App() {
  // La primera ronda se crea una sola vez al montar el componente
  const [rondaInicial] = useState(crearRonda);
  const mazoRef = useRef<DeckManager>(rondaInicial.mazo);
  const [mano, setMano] = useState<CardData[]>(rondaInicial.mano);
  const [cartasEnMazo, setCartasEnMazo] = useState<number>(rondaInicial.mazo.cartasRestantes());
  const [descartesRestantes, setDescartesRestantes] = useState<number>(MAX_DESCARTES_POR_RONDA);
  const [manosRestantes, setManosRestantes] = useState<number>(MAX_MANOS_POR_RONDA);
  const [rondaActual, setRondaActual] = useState<number>(1);
  const [puntajeRonda, setPuntajeRonda] = useState<number>(0);
  const [puntajeTotal, setPuntajeTotal] = useState<number>(0);
  const [monedas, setMonedas] = useState<number>(0);
  const [comodinesEquipados, setComodinesEquipados] = useState<Comodin[]>([]);
  const [mostrarTienda, setMostrarTienda] = useState<boolean>(false);
  const [ofertaTienda, setOfertaTienda] = useState<Comodin[]>([]);
  const [resultado, setResultado] = useState<string>("");

  // Arranca una ronda nueva: mazo nuevo mezclado y 8 cartas repartidas
  const repartirRonda = (): CardData[] => {
    const ronda = crearRonda();
    mazoRef.current = ronda.mazo;
    setCartasEnMazo(ronda.mazo.cartasRestantes());
    return ronda.mano;
  };

  // Juego terminado cuando ya se jugaron todas las rondas permitidas
  const juegoTerminado = rondaActual > MAX_RONDAS;

  // Reemplaza SOLO las cartas seleccionadas por cartas nuevas del mazo;
  // las demás cartas de la mano se quedan exactamente igual.
  const reponerCartasSeleccionadas = (): CardData[] => {
    const nuevaMano = [...mano];
    const cantidad = nuevaMano.filter(c => c.seleccionada).length;
    const nuevasCartas = mazoRef.current.robar(cantidad);
    let cartasRobadas = 0;

    for (let i = 0; i < nuevaMano.length; i++) {
      if (nuevaMano[i].seleccionada) {
        nuevaMano[i] = nuevasCartas[cartasRobadas];
        nuevaMano[i].seleccionada = false;
        cartasRobadas++;
      }
    }
    setCartasEnMazo(mazoRef.current.cartasRestantes());
    return nuevaMano;
  };

  // 1. LÓGICA DE SELECCIÓN — marca cartas para descartarlas o para jugarlas.
  // Tope fijo de 5 cartas seleccionadas a la vez, sin importar cuántos descartes queden.
  const alternarSeleccion = (index: number) => {
    const nuevaMano = [...mano];
    const cantidadSeleccionada = nuevaMano.filter(c => c.seleccionada).length;

    if (!nuevaMano[index].seleccionada && cantidadSeleccionada >= MAX_SELECCION) {
      return;
    }

    nuevaMano[index].seleccionada = !nuevaMano[index].seleccionada;
    setMano(nuevaMano);
  };

  const descartarCartas = () => {
    if (descartesRestantes <= 0) return;
    if (!mano.some(c => c.seleccionada)) return;

    setMano(reponerCartasSeleccionadas());
    setDescartesRestantes(prev => prev - 1); // 1 acción de descarte, sin importar cuántas cartas
    setResultado("");
  };

  // 2. LÓGICA DE CONFIRMAR MANO — evalúa SOLO las cartas seleccionadas (tu jugada),
  // repone esas cartas y, si era tu última mano, termina la ronda.
  const confirmarMano = () => {
    if (juegoTerminado || manosRestantes <= 0) return;

    const cartasAJugar = mano.filter(carta => carta.seleccionada);

    if (cartasAJugar.length === 0) {
      setResultado("Selecciona al menos 1 carta para jugar");
      return;
    }

    // Los comodines equipados entran en el cálculo del puntaje
    const calculoPuntos = evaluarMano(cartasAJugar, comodinesEquipados);
    const nuevoPuntajeTotal = puntajeTotal + calculoPuntos.puntajeFinal;

    setPuntajeRonda(prev => prev + calculoPuntos.puntajeFinal);
    setPuntajeTotal(nuevoPuntajeTotal);
    setMano(reponerCartasSeleccionadas());

    const manosQueQuedan = manosRestantes - 1;
    setManosRestantes(manosQueQuedan);

    const mensajeMano = `Ronda ${rondaActual}: ¡Jugaste ${calculoPuntos.nombreMano}! Obtuviste ${calculoPuntos.puntajeFinal} puntos.`;
    setResultado(mensajeMano);

    if (manosQueQuedan === 0) {
      terminarRonda(mensajeMano, nuevoPuntajeTotal);
    }
  };

  // 3. FIN DE RONDA — se llega aquí cuando el jugador se queda sin manos.
  // TODO multijugador: esperar a que TODOS los jugadores terminen, comparar sus
  // puntajeRonda y aplicar el daño a las vidas (secciones 6 y 7 del documento).
  const terminarRonda = (mensajeMano: string, puntajeTotalActualizado: number) => {
    setMonedas(prev => prev + MONEDAS_POR_RONDA_PROVISIONAL);

    const siguienteRonda = rondaActual + 1;
    setRondaActual(siguienteRonda);

    if (siguienteRonda <= MAX_RONDAS) {
      setOfertaTienda(generarOfertaTienda(comodinesEquipados, COMODINES_EN_OFERTA));
      setMostrarTienda(true);
    } else {
      setResultado(`${mensajeMano} ¡Partida terminada! Puntaje final: ${puntajeTotalActualizado}`);
    }
  };

  // 4. TIENDA — comprar un comodín descuenta monedas y lo equipa (máx. MAX_COMODINES)
  const comprarComodin = (comodin: Comodin) => {
    if (monedas < comodin.costo) return;
    if (comodinesEquipados.length >= MAX_COMODINES) return;
    if (comodinesEquipados.some(c => c.id === comodin.id)) return;

    setMonedas(prev => prev - comodin.costo);
    setComodinesEquipados(prev => [...prev, comodin]);
    setResultado(`Compraste el comodín "${comodin.nombre}".`);
  };

  // Cierra la tienda y arranca la ronda nueva con todo reiniciado
  const continuarTrasTienda = () => {
    setMostrarTienda(false);
    setMano(repartirRonda());
    setDescartesRestantes(MAX_DESCARTES_POR_RONDA);
    setManosRestantes(MAX_MANOS_POR_RONDA);
    setPuntajeRonda(0);
  };

  // Variables para la UI
  const cartasSeleccionadasCount = mano.filter(c => c.seleccionada).length;
  const cartasSeleccionadas = mano.filter((c) => c.seleccionada);
  const resultadoScoring = evaluarMano(cartasSeleccionadas, comodinesEquipados);

  return (
    <div className="pantalla-juego" style={{ fontFamily: 'sans-serif' }}>

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

      {/* 1. BARRA SUPERIOR (Mockup visual para el futuro) */}
      <div className="barra-superior">
        <div>TÚ ❤️❤️❤️ | 🪙 24</div>
        <div style={{opacity: 0.5}}>Jugador 2 ❤️❤️ | 🪙 18</div>
        <div style={{opacity: 0.5}}>Jugador 3 ❤️❤️❤️ | 🪙 30</div>
        <div style={{opacity: 0.5}}>Jugador 4 ❤️ | 🪙 12</div>
      </div>

      {/* 2. ZONA CENTRAL (3 Columnas) */}
      <div className="zona-central">

        {/* COLUMNA IZQUIERDA: COMODINES EQUIPADOS */}
        <div className="panel panel-comodines">
          <h3 style={{ color: '#ff77ff', textAlign: 'center', marginTop: 0 }}>COMODINES</h3>
          {Array.from({ length: MAX_COMODINES }).map((_, index) => {
            const comodin = comodinesEquipados[index];
            const margenInferior = index < MAX_COMODINES - 1 ? '10px' : 0;

            return comodin ? (
              <div
                key={comodin.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  border: '1px solid #ff77ff',
                  background: '#1a0a2f',
                  borderRadius: '8px',
                  padding: '8px',
                  marginBottom: margenInferior,
                }}
              >
                <ComodinImagen comodin={comodin} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: '#ff77ff', fontWeight: 'bold' }}>{comodin.nombre}</div>
                  <div style={{ color: '#bbb', fontSize: '0.75rem', marginTop: '4px' }}>
                    {comodin.descripcion}
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={`vacio-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '108px',
                  boxSizing: 'border-box',
                  border: '1px dashed #ff77ff',
                  borderRadius: '8px',
                  marginBottom: margenInferior,
                  color: '#ff77ff',
                  opacity: 0.6,
                }}
              >
                Vacío
              </div>
            );
          })}
        </div>

        {/* COLUMNA CENTRAL: TU MANO */}
        <div className="panel panel-mano">
          <h3 style={{ color: '#00ccff', textAlign: 'center', marginTop: 0 }}>TU MANO</h3>

          <div style={{ color: '#aaa', textAlign: 'center', marginBottom: '10px' }}>
            Ronda: {Math.min(rondaActual, MAX_RONDAS)} / {MAX_RONDAS} | Seleccionadas: {cartasSeleccionadasCount} / {MAX_SELECCION} | Mazo: {cartasEnMazo}
          </div>

          {/* CARTAS */}
          <div style={{ display: 'flex', gap: '10px', margin: '20px 0', flexWrap: 'wrap', justifyContent: 'center', flexGrow: 1 }}>
            {mano.map((carta, index) => (
              <Card key={index} data={carta} onClick={() => alternarSeleccion(index)} />
            ))}
          </div>

          <p style={{ textAlign: 'center', color: '#666' }}>Selecciona hasta {MAX_SELECCION} cartas para descartarlas o jugarlas</p>

          {/* BOTONERA INFERIOR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#050a1f', padding: '15px', borderRadius: '8px' }}>
            <div style={{ color: 'gold' }}>Fase: <b>{juegoTerminado ? 'JUEGO TERMINADO' : 'INTERCAMBIO'}</b></div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={descartarCartas}
                disabled={juegoTerminado || descartesRestantes === 0 || cartasSeleccionadasCount === 0}
                style={{ padding: '10px 20px', backgroundColor: (juegoTerminado || descartesRestantes === 0 || cartasSeleccionadasCount === 0) ? 'gray' : '#0056b3', color: 'white', border: '1px solid #00aaff', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                DESCARTAR ({descartesRestantes})
              </button>
              <button
                onClick={confirmarMano}
                disabled={juegoTerminado || manosRestantes === 0 || cartasSeleccionadasCount === 0}
                style={{ padding: '10px 20px', backgroundColor: (juegoTerminado || manosRestantes === 0 || cartasSeleccionadasCount === 0) ? 'gray' : 'green', color: 'white', border: '1px solid #00ff00', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                CONFIRMAR MANO ({manosRestantes})
              </button>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: PUNTUACIÓN */}
        <div className="panel panel-puntuacion">
          <h3 style={{ color: '#00ffcc', textAlign: 'center', marginTop: 0 }}>PUNTUACIÓN</h3>

          <div style={{ fontSize: '1.1rem', lineHeight: '2' }}>
            <div>Mejor mano: <span style={{ color: 'white' }}>{resultadoScoring.nombreMano}</span></div>
            <div>Base: <span style={{ color: '#0055ff' }}>{resultadoScoring.fichasBase} 🟦</span></div>
            <div>Bonos cartas: <span style={{ color: '#00ff00' }}>+{resultadoScoring.fichasCartas}</span></div>
            <div>Bonos comodines: <span style={{ color: '#ff77ff' }}>+{resultadoScoring.fichasComodines}</span></div>
            <div>
              Mult.: <span style={{ color: '#ff0055' }}>x{resultadoScoring.mult} 🟥</span>
              {resultadoScoring.multComodines > 0 && (
                <span style={{ color: '#ff77ff', fontSize: '0.85rem' }}> (+{resultadoScoring.multComodines} comodines)</span>
              )}
            </div>
          </div>

          <div className="caja-total-puntos">
            <div style={{ fontSize: '1rem', color: '#fff', marginBottom: '5px' }}>Score aproximado:</div>
            {resultadoScoring.puntajeFinal}
          </div>

          <div style={{ marginTop: 'auto', textAlign: 'center' }}>
            <p style={{ marginBottom: '2px' }}>Puntaje de la ronda:</p>
            <h3 style={{ margin: '0 0 8px 0', color: '#00ffcc' }}>{puntajeRonda}</h3>
            <p style={{ marginBottom: '2px' }}>Puntaje acumulado:</p>
            <h3 style={{ margin: '0 0 8px 0', color: 'gold' }}>{puntajeTotal}</h3>
            <p style={{ marginBottom: '2px' }}>Monedas:</p>
            <h3 style={{ margin: 0, color: '#ffd700' }}>🪙 {monedas}</h3>
          </div>
        </div>

      </div>

      {/* 3. REGISTRO DE PARTIDA (Abajo) */}
      <div className="registro-partida">
        <h4 style={{ margin: '0 0 10px 0', color: '#b721ff' }}>REGISTRO DE PARTIDA</h4>
        {resultado ? (
          <div style={{ color: '#00ffcc' }}>✅ {resultado}</div>
        ) : (
          <div style={{ color: '#888' }}>Esperando acción del jugador...</div>
        )}
      </div>

    </div>
  );
}
export default App;