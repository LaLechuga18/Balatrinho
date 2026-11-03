import { MenuBackground, MenuLogo } from './MenuDecor';

// Versión que se muestra en la esquina del menú
const GAME_VERSION = '0.1.0-dev';

interface MainMenuProps {
    onPlayLocal: () => void;
    onPlayLan: () => void;
}

export function MainMenu({ onPlayLocal, onPlayLan }: MainMenuProps) {
    return (
        <div className="menu-screen">
            <MenuBackground />

            <span className="menu-version">v{GAME_VERSION}</span>

            <main className="menu-content">
                <MenuLogo />

                <nav className="menu-buttons" aria-label="Modos de juego">
                    <button className="menu-button menu-button--blue" onClick={onPlayLocal}>
                        JUEGO LOCAL
                    </button>
                    <button className="menu-button menu-button--gold" disabled>
                        JUEGO ONLINE
                        <small>Próximamente</small>
                    </button>
                    <button className="menu-button menu-button--gold" onClick={onPlayLan}>
                        JUEGO EN LAN
                    </button>
                </nav>
            </main>
        </div>
    );
}