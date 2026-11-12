import { useEffect, useState } from 'react';
import { ComodinImagen } from './JokersImage';
import { ManoEventOverlay } from './ManoEventOverlay';
import { CATALOGO_COMODINES, type Comodin, type EventoMaldito, type EventoMano } from '../logic/jokers';
import { sonidoGolpe, sonidoDestruir } from '../services/Sounds';
import './CursedEventOverlay.css';

/** Evento del servidor + datos para mostrarlo. */
export type EventoVisual = EventoMaldito & { miId: string; clave: number };
type EventoClasicoVisual = Exclude<EventoMaldito, EventoMano> & { miId: string; clave: number };

// Posición de los puntos de cada cara del dado (cuadrícula 3x3, índices 0-8)
const PUNTOS: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
};

function efectoDado(t: number): { texto: string; clase: string } {
    if (t <= 2) return { texto: '💸 Pierde el 50% de sus monedas', clase: 'malo' };
    if (t <= 4) return { texto: '💔 Pierde medio corazón', clase: 'medio' };
    if (t === 5) return { texto: '🪙 ¡Gana 🪙 5!', clase: 'bueno' };
    return { texto: '✨ ¡Duplica sus monedas!', clase: 'oro' };
}

function Dado({ tirada, retraso, onAterriza }: { tirada: number; retraso: number; onAterriza: () => void }) {
    const [cara, setCara] = useState(() => 1 + Math.floor(Math.random() * 6));
    const [rodando, setRodando] = useState(true);

    useEffect(() => {
        const iv = window.setInterval(() => setCara(1 + Math.floor(Math.random() * 6)), 90);
        const fin = window.setTimeout(() => {
            window.clearInterval(iv);
            setCara(tirada);
            setRodando(false);
            onAterriza();
        }, 900 + retraso);
        return () => {
            window.clearInterval(iv);
            window.clearTimeout(fin);
        };
    }, [tirada, retraso, onAterriza]);

    const efecto = efectoDado(tirada);

    return (
        <div className="dado-columna">
            <div
                className={`dado${rodando ? ' dado--rodando' : ' dado--quieto'}`}
                style={{ animationDelay: `${retraso}ms` }}
            >
                {Array.from({ length: 9 }, (_, i) => (
                    <span key={i} className={`dado-punto${PUNTOS[cara].includes(i) ? ' on' : ''}`} />
                ))}
            </div>
            {!rodando && <div className={`dado-anuncio dado-anuncio--${efecto.clase}`}>{efecto.texto}</div>}
        </div>
    );
}

const FRAGMENTOS = [
    { dx: -70, dy: -60 }, { dx: 0, dy: -85 }, { dx: 70, dy: -60 },
    { dx: -85, dy: 10 }, { dx: 85, dy: 10 },
    { dx: -50, dy: 70 }, { dx: 0, dy: 90 }, { dx: 50, dy: 70 },
];

function jokerDeCatalogo(id: string, nombre: string): Comodin {
    return (
        CATALOGO_COMODINES.find((c) => c.id === id) ?? {
            id, nombre, descripcion: '', costo: 0, calcularEfecto: () => ({ fichasExtra: 0, multExtra: 0 }),
        }
    );
}

function EventoClasico({ evento }: { evento: EventoClasicoVisual }) {
    // Sonido de la rotura de comodines
    useEffect(() => {
        if (evento.efecto === 'tirar-dado') return;
        const t = window.setTimeout(sonidoDestruir, 1450);
        return () => window.clearTimeout(t);
    }, [evento]);

    if (evento.efecto === 'tirar-dado') {
        return (
            <div className="maldito-overlay">
                <div className="maldito-panel">
                    <div className="maldito-titulo">🎲 EL DADO</div>
                    <div className="maldito-sub">{evento.vendedorNombre} lo vendió. ¡Todos tiran!</div>
                    <div className="maldito-fila">
                        {evento.resultados.map((r, i) => (
                            <div key={r.playerId} className="dado-jugador">
                                <div className="maldito-jugador">
                                    {r.name}
                                    {r.playerId === evento.miId && <span className="maldito-tu">TÚ</span>}
                                </div>
                                <Dado tirada={r.tirada} retraso={i * 250} onAterriza={sonidoGolpe} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const esMuerte = evento.efecto === 'destruir-joker-oponentes';
    return (
        <div className="maldito-overlay">
            <div className="maldito-panel">
                <div className="maldito-titulo">{esMuerte ? '☠ LA MUERTE' : '🛸 JOKER ESPACIAL'}</div>
                <div className="maldito-sub">
                    {evento.vendedorNombre} lo vendió.{' '}
                    {esMuerte ? 'Un comodín de cada oponente será destruido.' : 'Todos pierden su comodín más barato.'}
                </div>

                {evento.afectados.length === 0 ? (
                    <div className="maldito-vacio">Nadie tenía comodines que destruir.</div>
                ) : (
                    <div className="maldito-fila">
                        {evento.afectados.map((a, i) => (
                            <div key={a.playerId} className="victima" style={{ ['--d' as string]: `${i * 0.25}s` }}>
                                <div className="maldito-jugador">
                                    {a.jugador}
                                    {a.playerId === evento.miId && <span className="maldito-tu">TÚ</span>}
                                </div>
                                <div className="victima-joker">
                                    <div className="victima-carta joker-maldito">
                                        <ComodinImagen comodin={jokerDeCatalogo(a.jokerId, a.nombre)} ancho="100%" alto="100%" />
                                    </div>
                                    {FRAGMENTOS.map((f, k) => (
                                        <span
                                            key={k}
                                            className="victima-fragmento"
                                            style={{ ['--dx' as string]: `${f.dx}px`, ['--dy' as string]: `${f.dy}px` }}
                                        />
                                    ))}
                                </div>
                                <div className="victima-nombre">{a.nombre}</div>
                                <div className="victima-sello">✖ DESTRUIDO</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export function CursedEventOverlay({ evento }: { evento: EventoVisual }) {
    if (evento.efecto === 'evento-aleatorio') return <ManoEventOverlay evento={evento} />;
    return <EventoClasico evento={evento} />;
}