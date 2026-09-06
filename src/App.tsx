import { useState, useRef, useEffect } from 'react';
import { Card } from './components/Card';
import type { CardData } from './types/gameType';
import { DeckManager } from './logic/DeckManager';
import { PokerEvaluator } from './logic/PokerEvaluator';
import { evaluarMano } from './utils/evaluator';
import './App.css';

function App() {
  const mazoRef = useRef(new DeckManager());
  const [mano, setMano] = useState<CardData[]>([]);
  const [descartesRestantes, setDescartesRestantes] = useState<number>(3);
  const [manosRestantes, setManosRestantes] = useState<number>(4);
  const [puntajeTotal, setPuntajeTotal] = useState<number>(0);
  const [resultado, setResultado] = useState<string>("");

  useEffect(() => {
    setMano(mazoRef.current.robar(8));
  }, []);

  // 1. LÓGICA DE SELECCIÓN (Máximo 5 cartas)
  const alternarSeleccion = (index: number) => {
    const nuevaMano = [...mano];
    const cantidadSeleccionada = nuevaMano.filter(c => c.seleccionada).length;

    // Si la carta NO estaba seleccionada y ya tenemos 5, bloqueamos la acción
    if (!nuevaMano[index].seleccionada && cantidadSeleccionada >= 5) {
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

    const nuevasCartas = mazoRef.current.robar(cartasSeleccionadas.length);
    let cartasRobadas = 0;

    for (let i = 0; i < nuevaMano.length; i++) {
      if (nuevaMano[i].seleccionada) {
        nuevaMano[i] = nuevasCartas[cartasRobadas];
        nuevaMano[i].seleccionada = false; 
        cartasRobadas++;
      }
    }

    setMano(nuevaMano);
    setDescartesRestantes(descartesRestantes - 1); 
    setResultado(""); 
  };

  // 2. LÓGICA DE CONFIRMAR MANO (Roba nuevas cartas y descuenta manos)
  const confirmarMano = () => {
    if (manosRestantes <= 0) return;

    const cartasAJugar = mano.filter(carta => carta.seleccionada);
    
    if (cartasAJugar.length === 0) {
      setResultado("Selecciona al menos 1 carta para jugar");
      return;
    }

    // Evaluamos los puntos
    const jugada = PokerEvaluator.evaluar(cartasAJugar);
    const calculoPuntos = evaluarMano(cartasAJugar);
    
    // Sumamos al puntaje total
    setPuntajeTotal(prev => prev + calculoPuntos.puntajeFinal);
    setResultado(`¡Jugaste: ${jugada}! Obtuviste ${calculoPuntos.puntajeFinal} puntos.`);
    
    // Restamos una mano disponible
    setManosRestantes(manosRestantes - 1);

    // Robamos nuevas cartas y reemplazamos las jugadas
    const nuevaMano = [...mano];
    const nuevasCartas = mazoRef.current.robar(cartasAJugar.length);
    let cartasRobadas = 0;

    for (let i = 0; i < nuevaMano.length; i++) {
      if (nuevaMano[i].seleccionada) {
        nuevaMano[i] = nuevasCartas[cartasRobadas];
        nuevaMano[i].seleccionada = false; 
        cartasRobadas++;
      }
    }

    setMano(nuevaMano);
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
          {/* Espacios vacíos listos para cuando programemos los Jokers */}
          <div style={{ border: '1px dashed #ff77ff', padding: '20px', borderRadius: '8px', marginBottom: '10px', textAlign: 'center' }}>Vacío</div>
          <div style={{ border: '1px dashed #ff77ff', padding: '20px', borderRadius: '8px', marginBottom: '10px', textAlign: 'center' }}>Vacío</div>
          <div style={{ border: '1px dashed #ff77ff', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>Vacío</div>
        </div>

        {/* COLUMNA CENTRAL: TU MANO */}
        <div className="panel panel-mano">
          <h3 style={{ color: '#00ccff', textAlign: 'center', marginTop: 0 }}>TU MANO</h3>
          
          <div style={{ color: '#aaa', textAlign: 'center', marginBottom: '10px' }}>
            Seleccionadas: {cartasSeleccionadasCount} / 5 | Mazo: {mazoRef.current.cartasRestantes()}
          </div>
          
          {/* CARTAS */}
          <div style={{ display: 'flex', gap: '10px', margin: '20px 0', flexWrap: 'wrap', justifyContent: 'center', flexGrow: 1 }}>
            {mano.map((carta, index) => (
              <Card key={index} data={carta} onClick={() => alternarSeleccion(index)} />
            ))}
          </div>

          <p style={{ textAlign: 'center', color: '#666' }}>Clic en una carta para marcarla y descartarla</p>

          {/* BOTONERA INFERIOR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#050a1f', padding: '15px', borderRadius: '8px' }}>
            <div style={{ color: 'gold' }}>Fase: <b>INTERCAMBIO</b></div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button 
                onClick={descartarCartas}
                disabled={descartesRestantes === 0 || cartasSeleccionadasCount === 0}
                style={{ padding: '10px 20px', backgroundColor: (descartesRestantes === 0 || cartasSeleccionadasCount === 0) ? 'gray' : '#0056b3', color: 'white', border: '1px solid #00aaff', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                DESCARTAR ({descartesRestantes})
              </button>
              <button 
                onClick={confirmarMano}
                disabled={manosRestantes === 0 || cartasSeleccionadasCount === 0}
                style={{ padding: '10px 20px', backgroundColor: (manosRestantes === 0 || cartasSeleccionadasCount === 0) ? 'gray' : 'green', color: 'white', border: '1px solid #00ff00', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                CONFIRMAR MANO ({manosRestantes})
              </button>
            </div>
            <div style={{ color: 'orange' }}>⏳ 0:22</div>
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