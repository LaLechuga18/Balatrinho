import { useState } from 'react';
import App from './App';
import { MainMenu } from './components/MainMenu';

type Screen = 'menu' | 'local' | 'lan';

// Decide qué pantalla se muestra:
//  - menú principal
//  - juego local (un jugador)
//  - juego en red local: abre el lobby para crear o unirse a una sala
export default function Screens() {
    const [screen, setScreen] = useState<Screen>('menu');
    const volverAlMenu = () => setScreen('menu');

    if (screen === 'local') {
        return <App modoInicial="solo" onVolverAlMenu={volverAlMenu} />;
    }

    if (screen === 'lan') {
        return <App modoInicial="lobby" onVolverAlMenu={volverAlMenu} />;
    }

    return (
        <MainMenu
            onPlayLocal={() => setScreen('local')}
            onPlayLan={() => setScreen('lan')}
        />
    );
}