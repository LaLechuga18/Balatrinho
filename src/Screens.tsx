import { useState } from 'react';
import App from './App';
import { MainMenu } from './components/MainMenu.tsx';

type Screen = 'menu' | 'game';

// Decide qué pantalla se muestra. Por ahora: menú principal -> juego local.
export default function Screens() {
    const [screen, setScreen] = useState<Screen>('menu');

    if (screen === 'game') {
        return <App />;
    }

    return <MainMenu onPlayLocal={() => setScreen('game')} />;
}