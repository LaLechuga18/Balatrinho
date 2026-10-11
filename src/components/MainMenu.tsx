import '@fontsource/pixelify-sans/700.css';
import './MainMenu.css';

// Versión que se muestra en la esquina del menú
const GAME_VERSION = '0.1.0-dev';

interface MainMenuProps {
    onPlayLocal: () => void;
}

export function MainMenu({ onPlayLocal }: MainMenuProps) {
    return (
        <div className="menu-screen">
            {/* Fondo animado: manchas de color que se desplazan lentamente (ver MainMenu.css) */}
            {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className={`menu-blob menu-blob--${n}`} aria-hidden="true" />
            ))}
            <div className="menu-vignette" aria-hidden="true" />

            <span className="menu-version">v{GAME_VERSION}</span>

            <main className="menu-content">
                {/* Logo: BAL + As de espadas (en lugar de la primera "A" de la segunda sílaba) + TRINHO */}
                <h1 className="menu-logo" aria-label="Balatrinho">
                    <span className="menu-logo-text" aria-hidden="true">BAL</span>
                    <img className="menu-logo-card" src="/frames/espadas_1.png" alt="" />
                    <span className="menu-logo-text" aria-hidden="true">TRINHO</span>
                </h1>

                <nav className="menu-buttons" aria-label="Modos de juego">
                    <button className="menu-button menu-button--blue" onClick={onPlayLocal}>
                        JUEGO LOCAL
                    </button>
                    <button className="menu-button menu-button--gold" disabled>
                        JUEGO ONLINE
                        <small>Próximamente</small>
                    </button>
                    <button className="menu-button menu-button--gold" disabled>
                        JUEGO EN LAN
                        <small>Próximamente</small>
                    </button>
                </nav>
            </main>
        </div>
    );
}