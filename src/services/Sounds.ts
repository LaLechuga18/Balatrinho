// Efectos de sonido sintetizados con Web Audio (no necesita archivos).
// El navegador solo deja sonar audio tras un clic del usuario; como se
// activan al pulsar "JUGAR MANO", funciona sin configurar nada.

let ctx: AudioContext | null = null;
let activo = true;
const VOLUMEN = 0.15;

/** Para silenciar/activar todos los efectos (ej. desde un botón de mute). */
export function setSonidoActivo(valor: boolean) {
    activo = valor;
}

function obtenerCtx(): AudioContext | null {
    if (!activo) return null;
    if (!ctx) {
        const AC =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
}

function tono(
    freq: number,
    dur: number,
    tipo: OscillatorType,
    vol = VOLUMEN,
    retraso = 0,
    freqFin?: number
) {
    const c = obtenerCtx();
    if (!c) return;
    const t0 = c.currentTime + retraso;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqFin) osc.frequency.exponentialRampToValueAtTime(freqFin, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
}

// Escala mayor: cada paso sube la nota (como en Balatro, el tono sube por cada puntuación)
const ESCALA = [0, 2, 4, 5, 7, 9, 11];
function frecuenciaPaso(n: number): number {
    const semitonos = ESCALA[n % ESCALA.length] + 12 * Math.floor(n / ESCALA.length);
    return 523.25 * Math.pow(2, Math.min(semitonos, 24) / 12); // empieza en Do5
}

/** Al pulsar JUGAR MANO. */
export function sonidoJugar() {
    tono(220, 0.18, 'sawtooth', 0.05, 0, 90);
}

/** Una carta o comodín que puntúa. `n` = número de paso (0, 1, 2...) para subir el tono. */
export function sonidoPunto(n: number, tipo: 'carta' | 'comodin') {
    const f = frecuenciaPaso(n);
    if (tipo === 'carta') {
        tono(f, 0.2, 'triangle');
        tono(f * 2, 0.12, 'square', 0.04);
    } else {
        // comodín: nota + quinta justa, más "brillante"
        tono(f, 0.25, 'square', 0.08);
        tono(f * 1.5, 0.25, 'square', 0.07, 0.07);
        tono(f * 2, 0.18, 'triangle', 0.08, 0.14);
    }
}

/** Tic del conteo ascendente. `progreso` va de 0 a 1 y sube el tono. */
export function sonidoTick(progreso: number) {
    tono(300 + progreso * 600, 0.05, 'square', 0.05);
}

/** Remate cuando termina el conteo del total. */
export function sonidoTotal() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tono(f, 0.28, 'triangle', 0.12, i * 0.07));
}

/** Un dado que golpea la mesa. */
export function sonidoGolpe() {
    tono(160, 0.1, 'square', 0.09, 0, 80);
    tono(90, 0.12, 'triangle', 0.1, 0.02);
}

/** Un comodín que se rompe. */
export function sonidoDestruir() {
    tono(420, 0.45, 'sawtooth', 0.08, 0, 50);
    tono(120, 0.5, 'square', 0.07, 0.05, 40);
}

/** Clic de cualquier botón. */
export function sonidoClick() {
    tono(740, 0.05, 'square', 0.05, 0, 520);
}

/** Reroll de la tienda: monedas que tintinean. */
export function sonidoMonedas() {
    const notas = [1568, 2093, 1760, 2637, 2093];
    notas.forEach((f, i) => {
        tono(f, 0.14, 'square', 0.045, i * 0.055);
        tono(f * 1.5, 0.1, 'triangle', 0.03, i * 0.055 + 0.01);
    });
}

/**
 * Instala UN listener global: todo <button> suena al pulsarse.
 * Excepciones por atributo en el botón:
 *   data-sonido="monedas"  -> suena a monedas
 *   data-sonido="ninguno"  -> sin sonido
 * Los botones deshabilitados no disparan clic, así que no suenan.
 */
let instalado = false;
export function instalarSonidosBotones() {
    if (instalado) return;
    instalado = true;
    document.addEventListener(
        'click',
        (e) => {
            const btn = (e.target as Element | null)?.closest('button');
            if (!btn || btn.disabled) return;
            const tipo = btn.dataset.sonido;
            if (tipo === 'ninguno') return;
            if (tipo === 'monedas') sonidoMonedas();
            else sonidoClick();
        },
        true // fase de captura: suena aunque el botón detenga la propagación
    );
}

/** Seleccionar (sube el tono) o quitar la selección (baja) de una carta. */
export function sonidoCarta(seleccionada: boolean) {
    if (seleccionada) tono(600, 0.06, 'triangle', 0.08, 0, 900);
    else tono(500, 0.06, 'triangle', 0.06, 0, 330);
}

/** Descartar cartas: un "deslizar" que cae. */
export function sonidoDescartar() {
    tono(500, 0.16, 'sawtooth', 0.04, 0, 140);
    tono(260, 0.1, 'square', 0.04, 0.06, 120);
}

/** Un comodín que falla (La Mano). */
export function sonidoFallo() {
    tono(200, 0.2, 'sawtooth', 0.07, 0, 70);
    tono(150, 0.15, 'square', 0.05, 0.08);
}

/** La mano salta de una opción a otra; `k` sube el tono. */
export function sonidoManoTick(k: number) {
    tono(380 + k * 35, 0.05, 'triangle', 0.09, 0, 300 + k * 30);
    tono(90, 0.05, 'square', 0.03);
}

/** La mano elige: golpe grave + acorde menor. */
export function sonidoManoElige() {
    tono(70, 0.35, 'sine', 0.2, 0, 40);
    tono(220, 0.5, 'sawtooth', 0.05, 0.02);
    [261.6, 311.1, 392].forEach((f) => tono(f, 0.7, 'triangle', 0.09, 0.08));
}

/** Gong grave (Sacrificio). */
export function sonidoGong() {
    tono(98, 1.4, 'sine', 0.18);
    tono(147, 1.2, 'triangle', 0.06);
    tono(196, 1, 'sine', 0.05, 0.02);
}

/** Revolución: whoosh de ida y vuelta + clic al asentarse. */
export function sonidoRevolucion() {
    tono(300, 0.55, 'sawtooth', 0.05, 0.5, 1500);
    tono(1500, 0.55, 'sawtooth', 0.05, 1.05, 300);
    tono(800, 0.08, 'square', 0.07, 1.65);
}

/** Bancarrota: monedas que caen + trombón triste + golpe del sello. */
export function sonidoBancarrota() {
    [2093, 1760, 1568, 1319, 1047].forEach((f, i) => tono(f, 0.1, 'square', 0.035, 0.1 + i * 0.12));
    [392, 370, 349, 311].forEach((f, i) =>
        tono(f, i === 3 ? 0.6 : 0.28, 'sawtooth', 0.05, 0.3 + i * 0.3, f * 0.97)
    );
    tono(120, 0.2, 'square', 0.1, 0.9, 60);
}

/** Jackpot: fanfarria ascendente + lluvia de monedas. */
export function sonidoJackpot() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((f, i) =>
        tono(f, 0.22, 'triangle', 0.1, i * 0.06)
    );
    [1568, 2093, 1760, 2637, 2093, 2637, 3136].forEach((f, i) => {
        tono(f, 0.14, 'square', 0.04, 0.6 + i * 0.07);
        tono(f * 1.5, 0.1, 'triangle', 0.03, 0.61 + i * 0.07);
    });
}

/** Caos: chirridos aleatorios y un acorde al repartirse. */
export function sonidoCaos() {
    for (let i = 0; i < 16; i++) {
        tono(200 + Math.random() * 1200, 0.09, i % 2 ? 'square' : 'sawtooth', 0.04, i * 0.075);
    }
    tono(523.25, 0.4, 'triangle', 0.1, 1.3);
    tono(783.99, 0.4, 'triangle', 0.1, 1.35);
}