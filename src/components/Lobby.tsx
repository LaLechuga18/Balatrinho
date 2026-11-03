import React, { useState, useEffect } from 'react';
import { getSocket } from '../services/socketService';
import type { NetworkPlayer } from '../types/multiplayerType';
import { MenuBackground, MenuLogo } from './MenuDecor';
import '@fontsource/jersey-10/400.css';

// Pon esto en false cuando quieras quitar el botón de "Juego solitario" del lobby.
const MOSTRAR_MODO_SOLITARIO = false;

interface LobbyProps {
  onStartSolo: () => void;
  onStartMultiplayer: (roomCode: string, playerName: string, isHost: boolean, initialPlayers: NetworkPlayer[]) => void;
  /** Vuelve al menú principal. */
  onVolver?: () => void;
}

export function Lobby({ onStartSolo, onStartMultiplayer, onVolver }: LobbyProps) {
  const [vista, setVista] = useState<'inicio' | 'crear' | 'unirse' | 'sala_espera'>('inicio');
  const [nombre, setNombre] = useState<string>('');
  const [codigoSalaInput, setCodigoSalaInput] = useState<string>('');
  const [codigoSalaActual, setCodigoSalaActual] = useState<string>('');
  const [esHost, setEsHost] = useState<boolean>(false);
  const [jugadoresEnSala, setJugadoresEnSala] = useState<NetworkPlayer[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiado, setCopiado] = useState<boolean>(false);

  useEffect(() => {
    const socket = getSocket();

    const handleRoomJoined = ({
      roomCode,
      players,
      isHost: hostStatus,
    }: {
      roomCode: string;
      playerId: string;
      players: NetworkPlayer[];
      isHost: boolean;
    }) => {
      setCodigoSalaActual(roomCode);
      setJugadoresEnSala(players);
      setEsHost(hostStatus);
      setErrorMsg('');
      setVista('sala_espera');
    };

    const handleRoomUpdated = ({
      players,
    }: {
      players: NetworkPlayer[];
    }) => {
      setJugadoresEnSala(players);
    };

    const handleGameStarted = ({
      players,
    }: {
      players: NetworkPlayer[];
    }) => {
      onStartMultiplayer(codigoSalaActual, nombre, esHost, players);
    };

    const handleRoomError = ({ message }: { message: string }) => {
      setErrorMsg(message);
    };

    socket.on('room_joined', handleRoomJoined);
    socket.on('room_updated', handleRoomUpdated);
    socket.on('game_started', handleGameStarted);
    socket.on('room_error', handleRoomError);

    return () => {
      socket.off('room_joined', handleRoomJoined);
      socket.off('room_updated', handleRoomUpdated);
      socket.off('game_started', handleGameStarted);
      socket.off('room_error', handleRoomError);
    };
  }, [codigoSalaActual, nombre, esHost, onStartMultiplayer]);

  const handleCrearSala = (e: React.FormEvent) => {
    e.preventDefault();
    const playerName = nombre.trim() || 'Anfitrión';
    const socket = getSocket();
    socket.emit('create_room', { playerName });
  };

  const handleUnirseSala = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoSalaInput.trim()) {
      setErrorMsg('Por favor ingresa el código de sala.');
      return;
    }
    const playerName = nombre.trim() || 'Jugador';
    const socket = getSocket();
    socket.emit('join_room', {
      roomCode: codigoSalaInput.trim().toUpperCase(),
      playerName,
    });
  };

  const handleIniciarPartida = () => {
    const socket = getSocket();
    socket.emit('start_game');
  };

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigoSalaActual);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="menu-screen menu-screen--scroll">
      <MenuBackground />

      <main className="menu-content menu-content--compacto">
        <MenuLogo chico />

        <div className="menu-panel">
          {errorMsg && <div className="menu-error">{errorMsg}</div>}

          {/* ─── VISTA: CREAR O UNIRSE ─── */}
          {vista === 'inicio' && (
            <div className="menu-opciones">
              <h2 className="menu-panel-titulo">JUEGO EN LAN</h2>
              <button
                className="menu-button menu-button--blue"
                onClick={() => { setErrorMsg(''); setVista('crear'); }}
              >
                CREAR SALA
              </button>
              <button
                className="menu-button menu-button--gold"
                onClick={() => { setErrorMsg(''); setVista('unirse'); }}
              >
                UNIRSE A SALA
              </button>
              {MOSTRAR_MODO_SOLITARIO && (
                <button className="menu-button menu-button--oscuro" onClick={onStartSolo}>
                  JUEGO SOLITARIO
                </button>
              )}
              {onVolver && (
                <button className="menu-button menu-button--oscuro" onClick={onVolver}>
                  ← VOLVER AL MENÚ
                </button>
              )}
            </div>
          )}

          {/* ─── VISTA: CREAR SALA ─── */}
          {vista === 'crear' && (
            <form className="menu-form" onSubmit={handleCrearSala}>
              <h2 className="menu-panel-titulo">CREAR SALA</h2>
              <label className="menu-label">Tu nombre</label>
              <input
                type="text"
                className="menu-input"
                placeholder="Ej: Jugador 1"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={15}
                autoFocus
              />
              <div className="menu-botones-fila">
                <button type="button" className="menu-button menu-button--oscuro" onClick={() => setVista('inicio')}>
                  ← VOLVER
                </button>
                <button type="submit" className="menu-button menu-button--blue">
                  CREAR
                </button>
              </div>
            </form>
          )}

          {/* ─── VISTA: UNIRSE A SALA ─── */}
          {vista === 'unirse' && (
            <form className="menu-form" onSubmit={handleUnirseSala}>
              <h2 className="menu-panel-titulo">UNIRSE A SALA</h2>
              <label className="menu-label">Tu nombre</label>
              <input
                type="text"
                className="menu-input"
                placeholder="Ej: Jugador 2"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={15}
              />
              <label className="menu-label">Código de sala (4 letras)</label>
              <input
                type="text"
                className="menu-input menu-input--codigo"
                placeholder="CÓDIGO"
                value={codigoSalaInput}
                onChange={(e) => setCodigoSalaInput(e.target.value.toUpperCase())}
                maxLength={4}
                autoFocus
              />
              <div className="menu-botones-fila">
                <button type="button" className="menu-button menu-button--oscuro" onClick={() => setVista('inicio')}>
                  ← VOLVER
                </button>
                <button type="submit" className="menu-button menu-button--gold">
                  UNIRSE
                </button>
              </div>
            </form>
          )}

          {/* ─── VISTA: SALA DE ESPERA ─── */}
          {vista === 'sala_espera' && (
            <div className="menu-form">
              <div className="menu-codigo-caja">
                <span className="menu-codigo-etiqueta">CÓDIGO DE SALA</span>
                <span className="menu-codigo-valor">{codigoSalaActual}</span>
                <button type="button" className="menu-btn-copiar" onClick={copiarCodigo}>
                  {copiado ? '✓ ¡Copiado!' : '📋 Copiar'}
                </button>
              </div>
              <p className="menu-ayuda">
                Comparte este código con tus amigos en la misma red local Wi-Fi.
              </p>

              <div className="menu-jugadores">
                <h4 className="menu-jugadores-titulo">
                  JUGADORES CONECTADOS ({jugadoresEnSala.length}/4)
                </h4>
                {jugadoresEnSala.map((p) => (
                  <div key={p.id} className="menu-jugador">
                    <span>{p.isHost ? '👑' : '👤'}</span>
                    <span>{p.name}</span>
                    {p.isHost && <span className="menu-jugador-host">HOST</span>}
                  </div>
                ))}
              </div>

              <div className="menu-botones-fila">
                <button
                  type="button"
                  className="menu-button menu-button--oscuro"
                  onClick={() => {
                    const socket = getSocket();
                    socket.emit('leave_room');
                    setVista('inicio');
                  }}
                >
                  SALIR
                </button>

                {esHost ? (
                  <button type="button" className="menu-button menu-button--verde" onClick={handleIniciarPartida}>
                    INICIAR PARTIDA
                  </button>
                ) : (
                  <div className="menu-esperando">
                    ⏳ Esperando que el anfitrión inicie la partida...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}