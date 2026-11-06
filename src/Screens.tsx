import { useState } from 'react';
import App from './App';
import { MainMenu } from './components/MainMenu';
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

    if (screen === 'local') {
        return <App modoInicial="solo" onVolverAlMenu={volverAlMenu} />;
    }

    if (screen === 'lan' || screen === 'online') {
        return <App modoInicial="lobby" modoRed={screen} onVolverAlMenu={volverAlMenu} />;
    }

    return (
        <MainMenu
            onPlayLocal={() => setScreen('local')}
            onPlayOnline={() => abrirLobby('online')}
            onPlayLan={() => abrirLobby('lan')}
        />
    );
}
