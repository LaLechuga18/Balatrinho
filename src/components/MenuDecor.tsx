import '@fontsource/pixelify-sans/700.css';
import './MainMenu.css';

// Piezas visuales que comparten el menú principal y el lobby (crear / unirse a sala),
// para que las dos pantallas se vean como el mismo menú.

/** Fondo animado: manchas de color que se desplazan lentamente + viñeta (ver MainMenu.css). */
export function MenuBackground() {
    return (
        <div className="menu-fondo" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className={`menu-blob menu-blob--${n}`} />
            ))}
            <div className="menu-vignette" />
        </div>
    );
}

interface MenuLogoProps {
    /** Versión más pequeña del logo, para pantallas con formularios. */
    chico?: boolean;
}

/** Logo: BAL + As de espadas (en lugar de la segunda "A") + TRINHO. */
export function MenuLogo({ chico = false }: MenuLogoProps) {
    return (
        <h1 className={`menu-logo${chico ? ' menu-logo--chico' : ''}`} aria-label="Balatrinho">
            <span className="menu-logo-text" aria-hidden="true">BAL</span>
            <img className="menu-logo-card" src="/frames/espadas_1.png" alt="" />
            <span className="menu-logo-text" aria-hidden="true">TRINHO</span>
        </h1>
    );
}