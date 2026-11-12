import { useState, type ReactNode } from 'react';
import App from './App';
import { MainMenu } from './components/MainMenu';
import { MusicPlayer } from './components/MusicPlayer';
import { setNetworkMode, type NetworkMode } from './services/socketService';

type Screen = 'menu' | 'local' | NetworkMode;

// Decide qué pantalla se muestra:
//  - menú principal
//  - juego local (un jugador)
//  - juego en red local (LAN) o juego online (servidor de Render): abren el lobby
export default function Screens() {
    const [screen, setScreen] = useState<Screen>('menu');
    const volverAlMenu = () => setScreen('menu');

    const abrirLobby = (modo: NetworkMode) => {
        setNetworkMode(modo);
        setScreen(modo);
    };

    let pantalla: ReactNode;
    if (screen === 'local') {
        pantalla = <App modoInicial="solo" onVolverAlMenu={volverAlMenu} />;
    } else if (screen === 'lan' || screen === 'online') {
        pantalla = <App modoInicial="lobby" modoRed={screen} onVolverAlMenu={volverAlMenu} />;
    } else {
        pantalla = (
            <MainMenu
                onPlayLocal={() => setScreen('local')}
                onPlayOnline={() => abrirLobby('online')}
                onPlayLan={() => abrirLobby('lan')}
            />
        );
    }

    return (
        <>
            <MusicPlayer />
            {pantalla}
        </>
    );
}
