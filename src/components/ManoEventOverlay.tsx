import { useEffect, useState } from 'react';
import { ComodinImagen } from './JokersImage';
import { CATALOGO_COMODINES, type Comodin, type EventoMano, type SubEventoMano } from '../logic/jokers';
import {
    sonidoManoTick, sonidoManoElige, sonidoRevolucion, sonidoBancarrota,
    sonidoJackpot, sonidoGong, sonidoCaos, sonidoDestruir,
} from '../services/Sounds';
import './CursedEventOverlay.css';
import './ManoEventOverlay.css';

type ManoVisual = EventoMano & { miId: string; clave: number };

const OPCIONES: { id: SubEventoMano; icono: string; nombre: string; desc: string }[] = [
    { id: 'revolucion', icono: '🔄', nombre: 'REVOLUCIÓN', desc: 'El último y el primero cambian de lugar' },
    { id: 'bancarrota', icono: '💸', nombre: 'BANCARROTA', desc: 'Todos pierden el 25% de sus monedas' },
    { id: 'jackpot', icono: '🎰', nombre: 'JACKPOT', desc: 'Un jugador al azar gana 🪙 10' },
    { id: 'sacrificio', icono: '🗡️', nombre: 'SACRIFICIO', desc: 'Todos destruyen un comodín al azar' },
    { id: 'caos', icono: '🌀', nombre: 'CAOS', desc: 'Los comodines se reparten al azar' },
];

const PASOS = 12; // saltos de la mano antes de elegir

function comodinDe(id: string, nombre: string, imagen?: string): Comodin {
    return (
        CATALOGO_COMODINES.find((c) => c.id === id) ?? {
            id, nombre, imagen, descripcion: '', costo: 0,
            calcularEfecto: () => ({ fichasExtra: 0, multExtra: 0 }),
        }
    );
}

function ManoBlanca() {
    return (
        <svg viewBox="0 -16 100 146" className="mano-svg" aria-hidden="true">
            <g fill="#fff" stroke="#1b2a35" strokeWidth="3.5" strokeLinejoin="round">
                <rect x="30" y="-16" width="40" height="26" fill="#6b4fb0" />
                <rect x="9" y="26" width="17" height="30" rx="8.5" transform="rotate(18 17 40)" />
                <rect x="24" y="44" width="15" height="34" rx="7.5" />
                <rect x="61" y="44" width="15" height="34" rx="7.5" />
                <rect x="40" y="46" width="20" height="78" rx="10" />
                <rect x="22" y="2" width="56" height="62" rx="16" />
                <rect x="42" y="58" width="16" height="12" fill="#fff" stroke="none" />
            </g>
        </svg>
    );
}

/* ───── Escenas de cada evento ───── */

function EscenaRevolucion({ evento }: { evento: ManoVisual }) {
    const x = evento.intercambio;
    if (!x) return <div className="maldito-vacio">Nadie con quién intercambiar.</div>;
    return (
        <div className="rev-fila">
            <div className="rev-col">
                <span className="rev-rotulo">👑 PRIMERO</span>
                <div className="rev-caja">{x.primeroNombre}</div>
            </div>
            <div className="rev-col">
                <span className="rev-rotulo">💀 ÚLTIMO</span>
                <div className="rev-caja rev-caja--ultimo">{x.ultimoNombre}</div>
            </div>
        </div>
    );
}

function EscenaBancarrota() {
    return (
        <div className="banca-escena">
            {Array.from({ length: 14 }, (_, i) => (
                <span
                    key={i}
                    className="banca-moneda"
                    style={{ ['--x' as string]: `${(i * 53) % 92}%`, ['--d' as string]: `${(i % 7) * 0.12}s` }}
                >
                    🪙
                </span>
            ))}
            <div className="banca-sello">−25%</div>
        </div>
    );
}

function EscenaJackpot({ evento }: { evento: ManoVisual }) {
    const g = evento.ganador;
    return (
        <div className="jack-escena">
            {Array.from({ length: 16 }, (_, i) => {
                const ang = (i / 16) * Math.PI * 2;
                return (
                    <span
                        key={i}
                        className="jack-moneda"
                        style={{
                            ['--dx' as string]: `${Math.cos(ang) * 150}px`,
                            ['--dy' as string]: `${Math.sin(ang) * 90 - 20}px`,
                            ['--d' as string]: `${0.8 + (i % 4) * 0.06}s`,
                        }}
                    >
                        🪙
                    </span>
                );
            })}
            <div className="jack-slot">🎰</div>
            <div className="jack-nombre">
                {g?.name}
                {g?.playerId === evento.miId && <span className="maldito-tu">TÚ</span>}
            </div>
            <div className="jack-premio">+🪙 10</div>
        </div>
    );
}

const FRAGMENTOS = [
    { dx: -70, dy: -60 }, { dx: 0, dy: -85 }, { dx: 70, dy: -60 },
    { dx: -85, dy: 10 }, { dx: 85, dy: 10 },
    { dx: -50, dy: 70 }, { dx: 0, dy: 90 }, { dx: 50, dy: 70 },
];

function EscenaSacrificio({ evento }: { evento: ManoVisual }) {
    const a = evento.afectados ?? [];
    if (a.length === 0) return <div className="maldito-vacio">Nadie tenía comodines que destruir.</div>;
    return (
        <div className="maldito-fila">
            {a.map((v, i) => (
                <div key={v.playerId} className="victima" style={{ ['--d' as string]: `${i * 0.25}s` }}>
                    <div className="maldito-jugador">
                        {v.jugador}
                        {v.playerId === evento.miId && <span className="maldito-tu">TÚ</span>}
                    </div>
                    <div className="victima-joker">
                        <div className="victima-carta joker-maldito">
                            <ComodinImagen comodin={comodinDe(v.jokerId, v.nombre)} ancho="100%" alto="100%" />
                        </div>
                        {FRAGMENTOS.map((f, k) => (
                            <span
                                key={k}
                                className="victima-fragmento"
                                style={{ ['--dx' as string]: `${f.dx}px`, ['--dy' as string]: `${f.dy}px` }}
                            />
                        ))}
                    </div>
                    <div className="victima-nombre">{v.nombre}</div>
                    <div className="victima-sello">✖ DESTRUIDO</div>
                </div>
            ))}
        </div>
    );
}

function EscenaCaos({ evento }: { evento: ManoVisual }) {
    const r = evento.reparto ?? [];
    const todos = r.flatMap((p) => p.jokers);
    if (todos.length === 0) return <div className="maldito-vacio">Nadie tenía comodines que mezclar.</div>;
    return (
        <div className="caos-escena">
            <div className="caos-remolino">
                {todos.map((j, i) => (
                    <div
                        key={`${j.id}-${i}`}
                        className="caos-carta"
                        style={{ ['--a' as string]: `${(360 / todos.length) * i}deg` }}
                    >
                        <ComodinImagen comodin={comodinDe(j.id, j.nombre, j.imagen)} ancho="100%" alto="100%" />
                    </div>
                ))}
            </div>
            <div className="caos-reparto">
                {r.map((p) => (
                    <div key={p.playerId} className="caos-jugador">
                        <div className="maldito-jugador">
                            {p.jugador}
                            {p.playerId === evento.miId && <span className="maldito-tu">TÚ</span>}
                        </div>
                        <div className="caos-mano">
                            {p.jokers.length === 0 ? (
                                <span className="caos-nada">—</span>
                            ) : (
                                p.jokers.map((j) => (
                                    <div key={j.id} className="caos-mini">
                                        <ComodinImagen comodin={comodinDe(j.id, j.nombre, j.imagen)} ancho="100%" alto="100%" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Escena({ evento, opcion }: { evento: ManoVisual; opcion: (typeof OPCIONES)[number] }) {
    return (
        <div className="mano-escena">
            <div className={`mano-anuncio mano-anuncio--${opcion.id}`}>
                {opcion.icono} {opcion.desc}
            </div>
            {evento.evento === 'revolucion' && <EscenaRevolucion evento={evento} />}
            {evento.evento === 'bancarrota' && <EscenaBancarrota />}
            {evento.evento === 'jackpot' && <EscenaJackpot evento={evento} />}
            {evento.evento === 'sacrificio' && <EscenaSacrificio evento={evento} />}
            {evento.evento === 'caos' && <EscenaCaos evento={evento} />}
        </div>
    );
}

/* ───── Overlay principal ───── */

export function ManoEventOverlay({ evento }: { evento: ManoVisual }) {
    const elegido = OPCIONES.findIndex((o) => o.id === evento.evento);
    const [pos, setPos] = useState(-1);
    const [fase, setFase] = useState<'eligiendo' | 'elegido' | 'escena'>('eligiendo');

    useEffect(() => {
        const ids: number[] = [];
        const en = (ms: number, fn: () => void) => {
            ids.push(window.setTimeout(fn, ms));
        };
        const n = OPCIONES.length;
        // El recorrido termina exactamente en la opción elegida
        const inicio = (((elegido - (PASOS - 1)) % n) + n) % n;

        let t = 500;
        let tUltimo = t;
        for (let k = 0; k < PASOS; k++) {
            const idx = (inicio + k) % n;
            en(t, () => {
                setPos(idx);
                sonidoManoTick(k);
            });
            tUltimo = t;
            t += 85 + k * 24; // cada salto es más lento
        }

        en(tUltimo + 150, () => {
            setFase('elegido');
            sonidoManoElige();
        });

        const tEscena = tUltimo + 1000;
        en(tEscena, () => {
            setFase('escena');
            switch (evento.evento) {
                case 'revolucion': sonidoRevolucion(); break;
                case 'bancarrota': sonidoBancarrota(); break;
                case 'jackpot': sonidoJackpot(); break;
                case 'caos': sonidoCaos(); break;
                case 'sacrificio': sonidoGong(); break;
            }
        });
        if (evento.evento === 'sacrificio') en(tEscena + 1450, sonidoDestruir);

        return () => ids.forEach(clearTimeout);
    }, [elegido, evento.evento]);

    return (
        <div className="maldito-overlay">
            <div className="maldito-panel mano-panel">
                <div className="maldito-titulo">🖐 LA MANO</div>
                <div className="maldito-sub">
                    {evento.vendedorNombre} la vendió. {fase === 'escena' ? '' : 'Que decida el destino…'}
                </div>

                <div className={`mano-ruleta${fase === 'escena' ? ' mano-ruleta--compacta' : ''}`}>
                    {fase !== 'escena' && (
                        <div
                            className={`mano-blanca${pos < 0 ? ' mano-blanca--oculta' : ''}${fase === 'elegido' ? ' mano-blanca--golpe' : ''}`}
                            style={{ ['--i' as string]: Math.max(pos, 0) }}
                        >
                            <div key={pos} className="mano-tap">
                                <ManoBlanca />
                            </div>
                        </div>
                    )}

                    {OPCIONES.map((o, i) => {
                        let clase = 'mano-opcion';
                        if (fase === 'eligiendo' && pos === i) clase += ' mano-opcion--sel';
                        if (fase !== 'eligiendo') clase += i === elegido ? ' mano-opcion--elegida' : ' mano-opcion--apagada';
                        return (
                            <div key={o.id} className={clase}>
                                <span className="mano-opcion-icono">{o.icono}</span>
                                <span className="mano-opcion-nombre">{o.nombre}</span>
                                <span className="mano-opcion-desc">{o.desc}</span>
                            </div>
                        );
                    })}
                </div>

                {fase === 'escena' && <Escena evento={evento} opcion={OPCIONES[elegido]} />}
            </div>
        </div>
    );
}