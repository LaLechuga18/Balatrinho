import { useState, useRef, useEffect } from 'react';
import { Card } from './components/Card';
import type { CardData } from './types/gameType';
import { DeckManager } from './logic/DeckManager';
import { evaluarMano } from './logic/HandEvaluator';
import './App.css';

// Config del temporizador de turno (ajustable en un solo lugar)
const DURACION_TURNO_SEGUNDOS = 60;

// Config de la ronda:
// - Se reparten 8 cartas para dar más variedad de jugadas (decisión explícita del
//   diseñador, aunque el documento maestro proponía 5 — esto lo sobreescribe).
// - Puedes seleccionar hasta 5 cartas a la vez (para descartarlas o para jugarlas),
//   sin importar cuántos descartes te queden.
// - Tienes 3 ACCIONES de descarte por ronda (no 3 cartas totales): cada acción
//   descarta las cartas que tengas seleccionadas en ese momento (hasta 5).
// - La partida dura un máximo provisional de 10 rondas (sección 15 del documento).
const CARTAS_POR_RONDA = 8;
const MAX_SELECCION = 5;
const MAX_DESCARTES_POR_RONDA = 3;
const MAX_RONDAS = 10;

// Config de monedas — PROVISIONAL (ver Contexto maestro del videojuego, sección 8):
// el documento define +8 monedas al ganar una ronda y +3 al perderla, comparando
// tu puntuación contra la de otros jugadores. Como todavía no existe esa comparación
// (llega con el online/multijugador), usamos el valor base de "perder" como placeholder
// cada vez que confirmas una mano, para no inventar una mecánica de recompensa nueva.
const MONEDAS_POR_MANO_PROVISIONAL = 3;

// NOTA: el sistema de vidas y daño (secciones 6 y 7 del documento) depende de comparar
// tu puntuación contra la de otros jugadores al final de cada ronda. Como eso todavía
// no existe en modo un-jugador, no se implementa aquí todavía — se conecta cuando
// llegue el multijugador.

// Config de comodines: por ahora son slots vacíos, listos para cuando
// implementemos los Jokers reales (solo hay que reemplazar este tipo/arreglo)
const MAX_COMODINES = 3;
interface ComodinSlot {
  id: number;
  // futuro: nombre, efecto, icono, etc.
}
const SLOTS_COMODINES: ComodinSlot[] = Array.from({ length: MAX_COMODINES }, (_, i) => ({ id: i }));

function formatearTiempo(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min}:${seg.toString().padStart(2, '0')}`;
}

function App() {
  const mazoRef = useRef(new DeckManager());
  const [mano, setMano] = useState<CardData[]>([]);
  const [descartesRestantes, setDescartesRestantes] = useState<number>(MAX_DESCARTES_POR_RONDA);
  const [rondaActual, setRondaActual] = useState<number>(1);
  const [puntajeTotal, setPuntajeTotal] = useState<number>(0);
  const [monedas, setMonedas] = useState<number>(0);
  const [resultado, setResultado] = useState<string>("");
  const [tiempoRestante, setTiempoRestante] = useState<number>(DURACION_TURNO_SEGUNDOS);

  // Roba cartas del mazo; si no quedan suficientes, mezcla un mazo nuevo.
  // (con 10 rondas de máx. 3 descartes + 5 cartas iniciales por ronda, un mazo de 52
  // normalmente alcanza, pero esto evita que el juego se rompa si se agota.)
  const robarCartas = (cantidad: number): CardData[] => {
    if (mazoRef.current.cartasRestantes() < cantidad) {
      mazoRef.current = new DeckManager();
    }
    return mazoRef.current.robar(cantidad);
  };

  useEffect(() => {
    setMano(robarCartas(CARTAS_POR_RONDA));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Juego terminado cuando ya se jugaron todas las rondas permitidas
  const juegoTerminado = rondaActual > MAX_RONDAS;

  // Temporizador: cuenta hacia atrás mientras el juego siga activo
  useEffect(() => {
    if (juegoTerminado) return;

    const intervalId = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          setResultado("⏰ ¡Se acabó el tiempo del turno!");
          return DURACION_TURNO_SEGUNDOS; // reinicia el turno
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [juegoTerminado]);

  // Reinicia el temporizador cada vez que cambia la mano (descartaste o empezó ronda nueva)
  useEffect(() => {
    setTiempoRestante(DURACION_TURNO_SEGUNDOS);
  }, [mano]);

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

    const nuevaMano = [...mano];
    const cartasSeleccionadas = nuevaMano.filter(carta => carta.seleccionada);

    if (cartasSeleccionadas.length === 0) return;

    const nuevasCartas = robarCartas(cartasSeleccionadas.length);
    let cartasRobadas = 0;

    for (let i = 0; i < nuevaMano.length; i++) {
      if (nuevaMano[i].seleccionada) {
        nuevaMano[i] = nuevasCartas[cartasRobadas];
        nuevaMano[i].seleccionada = false;
        cartasRobadas++;
      }
    }

    setMano(nuevaMano);
    setDescartesRestantes(prev => prev - 1); // se gasta 1 acción de descarte, sin importar cuántas cartas discardó
    setResultado("");
  };

  // 2. LÓGICA DE CONFIRMAR MANO — evalúa SOLO las cartas seleccionadas (tu jugada),
  // requiere al menos 1 carta seleccionada, y termina la ronda.
  const confirmarMano = () => {
    if (juegoTerminado) return;

    const cartasAJugar = mano.filter(carta => carta.seleccionada);

    if (cartasAJugar.length === 0) {
      setResultado("Selecciona al menos 1 carta para jugar");
      return;
    }

    const calculoPuntos = evaluarMano(cartasAJugar);

    setPuntajeTotal(prev => prev + calculoPuntos.puntajeFinal);
    setResultado(
      `Ronda ${rondaActual}: ¡Jugaste ${calculoPuntos.nombreMano}! Obtuviste ${calculoPuntos.puntajeFinal} puntos.`
    );

    // Monedas provisionales (ver comentario junto a MONEDAS_POR_MANO_PROVISIONAL):
    // se reemplaza por la lógica real de ganar/perder ronda cuando exista comparación
    // contra otros jugadores.
    setMonedas(prev => prev + MONEDAS_POR_MANO_PROVISIONAL);

    const siguienteRonda = rondaActual + 1;
    setRondaActual(siguienteRonda);
    setDescartesRestantes(MAX_DESCARTES_POR_RONDA);

    // Si todavía quedan rondas, repartimos la siguiente mano de 8 cartas
    if (siguienteRonda <= MAX_RONDAS) {
      setMano(robarCartas(CARTAS_POR_RONDA));
    }
  };

  // Variables para la UI
  const cartasSeleccionadasCount = mano.filter(c => c.seleccionada).length;
  const cartasSeleccionadas = mano.filter((c) => c.seleccionada);
  const resultadoScoring = evaluarMano(cartasSeleccionadas);

  return (
    <div className="pantalla-juego" style={{ fontFamily: 'sans-serif' }}>
      
      {/* 1. BARRA SUPERIOR (Mockup visual para el futuro) */}
      <div className="barra-superior">
        <div>TÚ ❤️❤️❤️ | 🪙 24</div>
        <div style={{opacity: 0.5}}>Jugador 2 ❤️❤️ | 🪙 18</div>
        <div style={{opacity: 0.5}}>Jugador 3 ❤️❤️❤️ | 🪙 30</div>
        <div style={{opacity: 0.5}}>Jugador 4 ❤️ | 🪙 12</div>
      </div>

      {/* 2. ZONA CENTRAL (3 Columnas) */}
      <div className="zona-central">
        
        {/* COLUMNA IZQUIERDA: COMODINES */}
        <div className="panel panel-comodines">
          <h3 style={{ color: '#ff77ff', textAlign: 'center', marginTop: 0 }}>COMODINES</h3>
          {/* Slots generados desde SLOTS_COMODINES: cuando existan Jokers reales,
              solo hay que reemplazar ComodinSlot con los datos del joker y renderizarlo aquí */}
          {SLOTS_COMODINES.map((slot, index) => (
            <div
              key={slot.id}
              style={{
                border: '1px dashed #ff77ff',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: index < SLOTS_COMODINES.length - 1 ? '10px' : 0,
                textAlign: 'center',
              }}
            >
              Vacío
            </div>
          ))}
        </div>

        {/* COLUMNA CENTRAL: TU MANO */}
        <div className="panel panel-mano">
          <h3 style={{ color: '#00ccff', textAlign: 'center', marginTop: 0 }}>TU MANO</h3>
          
          <div style={{ color: '#aaa', textAlign: 'center', marginBottom: '10px' }}>
            Ronda: {Math.min(rondaActual, MAX_RONDAS)} / {MAX_RONDAS} | Seleccionadas: {cartasSeleccionadasCount} / {MAX_SELECCION} | Mazo: {mazoRef.current.cartasRestantes()}
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
                disabled={juegoTerminado || cartasSeleccionadasCount === 0}
                style={{ padding: '10px 20px', backgroundColor: (juegoTerminado || cartasSeleccionadasCount === 0) ? 'gray' : 'green', color: 'white', border: '1px solid #00ff00', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                CONFIRMAR MANO
              </button>
            </div>
            <div style={{ color: tiempoRestante <= 10 ? '#ff4444' : 'orange' }}>
              ⏳ {juegoTerminado ? '--:--' : formatearTiempo(tiempoRestante)}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: PUNTUACIÓN */}
        <div className="panel panel-puntuacion">
          <h3 style={{ color: '#00ffcc', textAlign: 'center', marginTop: 0 }}>PUNTUACIÓN</h3>
          
          <div style={{ fontSize: '1.1rem', lineHeight: '2' }}>
            <div>Mejor mano: <span style={{ color: 'white' }}>{resultadoScoring.nombreMano}</span></div>
            <div>Base: <span style={{ color: '#0055ff' }}>{resultadoScoring.fichasBase} 🟦</span></div>
            <div>Bonos: <span style={{ color: '#00ff00' }}>+{resultadoScoring.fichasCartas}</span></div>
            <div>Mult.: <span style={{ color: '#ff0055' }}>x{resultadoScoring.mult} 🟥</span></div>
          </div>

          <div className="caja-total-puntos">
            <div style={{ fontSize: '1rem', color: '#fff', marginBottom: '5px' }}>Total Proyectado:</div>
            {resultadoScoring.puntajeFinal}
          </div>

          <div style={{ marginTop: 'auto', textAlign: 'center' }}>
            <p>Puntaje Acumulado:</p>
            <h2 style={{ margin: 0, color: 'gold' }}>{puntajeTotal}</h2>
            <p style={{ marginBottom: '4px' }}>Monedas:</p>
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