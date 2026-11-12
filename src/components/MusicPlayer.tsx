import { useEffect, useRef, useState } from 'react';
import './MusicPlayer.css';

const RUTA_MUSICA = '/frames/music/soundtrack.mp3';
const CLAVE_VOLUMEN = 'balatrinho:volumen-musica';
const CLAVE_MUTE = 'balatrinho:musica-silenciada';
const VOLUMEN_INICIAL = 0.4;

function leerVolumen(): number {
    try {
        const v = localStorage.getItem(CLAVE_VOLUMEN);
        if (v === null) return VOLUMEN_INICIAL;
        return Math.min(1, Math.max(0, Number(v)));
    } catch {
        return VOLUMEN_INICIAL;
    }
}

function leerSilencio(): boolean {
    try {
        return localStorage.getItem(CLAVE_MUTE) === '1';
    } catch {
        return false;
    }
}

export function MusicPlayer() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [volumen, setVolumen] = useState<number>(leerVolumen);
    const [silenciado, setSilenciado] = useState<boolean>(leerSilencio);

    // Crea el audio y lo arranca con la primera interacción
    // (los navegadores bloquean la reproducción automática antes de un clic).
    useEffect(() => {
        const audio = new Audio(RUTA_MUSICA);
        audio.loop = true;
        audioRef.current = audio;

        const iniciar = () => {
            void audio.play().catch(() => { });
        };
        window.addEventListener('pointerdown', iniciar, { once: true });
        window.addEventListener('keydown', iniciar, { once: true });

        return () => {
            window.removeEventListener('pointerdown', iniciar);
            window.removeEventListener('keydown', iniciar);
            audio.pause();
            audioRef.current = null;
        };
    }, []);

    // Aplica volumen / silencio y los recuerda para la próxima vez
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volumen;
            audioRef.current.muted = silenciado;
        }
        try {
            localStorage.setItem(CLAVE_VOLUMEN, String(volumen));
            localStorage.setItem(CLAVE_MUTE, silenciado ? '1' : '0');
        } catch {
            /* sin almacenamiento: no pasa nada */
        }
    }, [volumen, silenciado]);

    const icono = silenciado || volumen === 0 ? '🔇' : volumen < 0.5 ? '🔉' : '🔊';

    return (
        <div className="musica">
            <button
                type="button"
                className="musica-btn"
                onClick={() => setSilenciado((s) => !s)}
                title={silenciado ? 'Activar música' : 'Silenciar música'}
                aria-label={silenciado ? 'Activar música' : 'Silenciar música'}
            >
                {icono}
            </button>
            <input
                type="range"
                className="musica-barra"
                min={0}
                max={1}
                step={0.01}
                value={silenciado ? 0 : volumen}
                onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolumen(v);
                    setSilenciado(v === 0);
                }}
                aria-label="Volumen de la música"
            />
        </div>
    );
}