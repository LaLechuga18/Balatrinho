import React, { useState, useEffect } from 'react';
import { getSocket } from '../services/socketService';
import type { NetworkPlayer } from '../types/multiplayerType';

interface LobbyProps {
  onStartSolo: () => void;
  onStartMultiplayer: (roomCode: string, playerName: string, isHost: boolean, initialPlayers: NetworkPlayer[]) => void;
}

export function Lobby({ onStartSolo, onStartMultiplayer }: LobbyProps) {
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
    <div className="lobby-overlay">
      <div className="lobby-modal">

        <div className="lobby-header">
          <h1 className="lobby-titulo">🃏 BALATRINHO</h1>
          <p className="lobby-subtitulo">Roguelike Poker LAN Edition</p>
        </div>

        {errorMsg && <div className="lobby-error">{errorMsg}</div>}

        {/* ─── VISTA: MENÚ PRINCIPAL ─── */}
        {vista === 'inicio' && (
          <div className="lobby-menu-opciones">
            <button className="btn-lobby btn-solo" onClick={onStartSolo}>
              👤 Modo Solitario
            </button>
            <div className="lobby-divisor"><span>O JUGAR EN RED LOCAL</span></div>
            <button className="btn-lobby btn-crear" onClick={() => { setErrorMsg(''); setVista('crear'); }}>
              👑 Crear Sala (Host)
            </button>
            <button className="btn-lobby btn-unirse" onClick={() => { setErrorMsg(''); setVista('unirse'); }}>
              👥 Unirse a Sala
            </button>
          </div>
        )}

        {/* ─── VISTA: CREAR SALA ─── */}
        {vista === 'crear' && (
          <form className="lobby-form" onSubmit={handleCrearSala}>
            <label className="lobby-label">Tu Nombre:</label>
            <input
              type="text"
              className="lobby-input"
              placeholder="Ej: Jugador 1"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={15}
              autoFocus
            />
            <div className="lobby-form-botones">
              <button type="button" className="btn-lobby btn-volver" onClick={() => setVista('inicio')}>
                ⬅ Volver
              </button>
              <button type="submit" className="btn-lobby btn-crear">
                Crear Sala
              </button>
            </div>
          </form>
        )}

        {/* ─── VISTA: UNIRSE A SALA ─── */}
        {vista === 'unirse' && (
          <form className="lobby-form" onSubmit={handleUnirseSala}>
            <label className="lobby-label">Tu Nombre:</label>
            <input
              type="text"
              className="lobby-input"
              placeholder="Ej: Jugador 2"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={15}
            />
            <label className="lobby-label">Código de Sala (4 letras):</label>
            <input
              type="text"
              className="lobby-input input-codigo"
              placeholder="CÓDIGO"
              value={codigoSalaInput}
              onChange={(e) => setCodigoSalaInput(e.target.value.toUpperCase())}
              maxLength={4}
              autoFocus
            />
            <div className="lobby-form-botones">
              <button type="button" className="btn-lobby btn-volver" onClick={() => setVista('inicio')}>
                ⬅ Volver
              </button>
              <button type="submit" className="btn-lobby btn-unirse">
                Unirse
              </button>
            </div>
          </form>
        )}

        {/* ─── VISTA: SALA DE ESPERA ─── */}
        {vista === 'sala_espera' && (
          <div className="lobby-sala-espera">
            <div className="codigo-box">
              <span className="codigo-label">CÓDIGO DE SALA:</span>
              <span className="codigo-valor">{codigoSalaActual}</span>
              <button type="button" className="btn-copiar" onClick={copiarCodigo}>
                {copiado ? '✓ ¡Copiado!' : '📋 Copiar'}
              </button>
            </div>
            <p className="sala-instruccion">
              Comparte este código con tus amigos en la misma red local Wi-Fi.
            </p>

            <div className="jugadores-lista">
              <h4 className="jugadores-titulo">
                Jugadores conectados ({jugadoresEnSala.length}/4):
              </h4>
              <div className="jugadores-cards">
                {jugadoresEnSala.map((p) => (
                  <div key={p.id} className="jugador-item">
                    <span className="jugador-item-icono">{p.isHost ? '👑' : '👤'}</span>
                    <span className="jugador-item-nombre">{p.name}</span>
                    {p.isHost && <span className="jugador-badge-host">Host</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="lobby-acciones-sala">
              <button
                type="button"
                className="btn-lobby btn-volver"
                onClick={() => {
                  const socket = getSocket();
                  socket.emit('leave_room');
                  setVista('inicio');
                }}
              >
                Salir de la Sala
              </button>

              {esHost ? (
                <button
                  type="button"
                  className="btn-lobby btn-iniciar"
                  onClick={handleIniciarPartida}
                >
                  🚀 INICIAR PARTIDA
                </button>
              ) : (
                <div className="esperando-host">
                  ⏳ Esperando que el anfitrión inicie la partida...
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
