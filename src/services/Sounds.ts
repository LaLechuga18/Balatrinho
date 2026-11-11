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