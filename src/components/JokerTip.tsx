import type { Comodin } from '../logic/jokers';
import './JokerTip.css';

interface JokerTipProps {
    comodin: Comodin;
    /** Línea extra al final (ej. "Clic para vender · 🪙 2"). */
    extra?: string;
    /** Dónde aparece la descripción respecto al comodín. */
    lado?: 'abajo' | 'arriba';
}

/**
 * Descripción flotante de un comodín. Se muestra al pasar el mouse (o enfocar con teclado)
 * por encima del contenedor padre, que debe tener la clase "joker-tip-anclaje".
 */
export function JokerTip({ comodin, extra, lado = 'abajo' }: JokerTipProps) {
    return (
        <div className={`joker-tip joker-tip--${lado}`} role="tooltip">
            <div className="joker-tip-nombre">{comodin.nombre}</div>
            <div className="joker-tip-descripcion">{comodin.descripcion}</div>
            {extra && <div className="joker-tip-extra">{extra}</div>}
        </div>
    );
}