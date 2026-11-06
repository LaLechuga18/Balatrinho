import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '../services/socketService';
import type { NetworkPlayer } from '../types/multiplayerType';
import { MenuBackground, MenuLogo } from './MenuDecor';
import '@fontsource/jersey-10/400.css';

// Pon esto en false cuando quieras quitar el botón de "Juego solitario" del lobby.
const MOSTRAR_MODO_SOLITARIO = false;

interface LobbyProps {
  /** Servidor al que se conecta: red local (LAN) o servidor online. */
  modoRed?: 'lan' | 'online';
  onStartSolo: () => void;
  onStartMultiplayer: (roomCode: string, playerName: string, isHost: boolean, initialPlayers: NetworkPlayer[]) => void;
  /** Vuelve al menú principal. */
  onVolver?: () => void;
}

export function Lobby({ modoRed = 'lan', onStartSolo, onStartMultiplayer, onVolver }: LobbyProps) {
  const esOnline = modoRed === 'online';
  const nombreModo = esOnline ? 'ONLINE' : 'LAN';
  // Render (plan gratuito) tarda en despertar el servidor tras inactividad
  const tiempoEspera = esOnline ? 60000 : 4000;
  const [vista, setVista] = useState<'inicio' | 'crear' | 'unirse' | 'sala_espera'>('inicio');
  const [nombre, setNombre] = useState<string>('');
  const [codigoSalaInput, setCodigoSalaInput] = useState<string>('');
  const [codigoSalaActual, setCodigoSalaActual] = useState<string>('');
  const [esHost, setEsHost] = useState<boolean>(false);
  const [jugadoresEnSala, setJugadoresEnSala] = useState<NetworkPlayer[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiado, setCopiado] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(false);
  const [conectado, setConectado] = useState<boolean>(false);

  // Guardamos las referencias actualizadas para los callbacks del socket
  const codigoSalaRef = useRef(codigoSalaActual);
  const nombreRef = useRef(nombre);
  const esHostRef = useRef(esHost);

  useEffect(() => {
    codigoSalaRef.current = codigoSalaActual;
    nombreRef.current = nombre;
    esHostRef.current = esHost;
  }, [codigoSalaActual, nombre, esHost]);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      setConectado(true);
      setErrorMsg('');
    };

    const handleDisconnect = () => {
      setConectado(false);
    };

    const handleConnectError = () => {
      setConectado(false);
      setCargando(false);
      setErrorMsg(
        esOnline
          ? '⚠️ No se pudo conectar al servidor online. Puede estar despertando; inténtalo de nuevo en unos segundos.'
          : '⚠️ No se pudo conectar al servidor LAN en el puerto 3001. Asegúrate de haber iniciado el servidor con "npm run lan" o "npm run server".'
      );
    };

    const handleRoomJoined = ({
      roomCode,
      players,
      isHost: hostStatus,
      playerId,
    }: {
      roomCode: string;
      playerId: string;
      players: NetworkPlayer[];
      isHost: boolean;
    }) => {
      setCargando(false);
      setCodigoSalaActual(roomCode);
      setJugadoresEnSala(players);
      setEsHost(hostStatus);
      const miJugador = players.find(p => p.id === playerId);
      if (miJugador && !nombreRef.current.trim()) {
        setNombre(miJugador.name);
      }
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
      setCargando(false);
      const finalName = nombreRef.current.trim() || (esHostRef.current ? 'Anfitrión' : 'Jugador');
      onStartMultiplayer(codigoSalaRef.current, finalName, esHostRef.current, players);
    };

    const handleRoomError = ({ message }: { message: string }) => {
      setCargando(false);
      setErrorMsg(message);
    };

    if (socket.connected) {
      setConectado(true);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('room_joined', handleRoomJoined);
    socket.on('room_updated', handleRoomUpdated);
    socket.on('game_started', handleGameStarted);
    socket.on('room_error', handleRoomError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('room_joined', handleRoomJoined);
      socket.off('room_updated', handleRoomUpdated);
      socket.off('game_started', handleGameStarted);
      socket.off('room_error', handleRoomError);
    };
  }, [onStartMultiplayer, esOnline]);

  const handleCrearSala = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setCargando(true);
    const playerName = nombre.trim() || 'Anfitrión';
    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('create_room', { playerName });

    // Timeout de seguridad en caso de que el servidor no responda
    setTimeout(() => {
      setCargando(prev => {
        if (prev) {
          setErrorMsg(
            esOnline
              ? 'El servidor online tardó en responder. Inténtalo de nuevo.'
              : 'El servidor tardó en responder. Verifica que esté activo con "npm run lan".'
          );
          return false;
        }
        return false;
      });
    }, tiempoEspera);
  };

  const handleUnirseSala = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoSalaInput.trim()) {
      setErrorMsg('Por favor ingresa el código de sala.');
      return;
    }
    setErrorMsg('');
    setCargando(true);
    const playerName = nombre.trim() || 'Jugador';
    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join_room', {
      roomCode: codigoSalaInput.trim().toUpperCase(),
      playerName,
    });

    setTimeout(() => {
      setCargando(prev => {
        if (prev) {
          setErrorMsg('No se recibió respuesta del servidor.');
          return false;
        }
        return false;
      });
    }, tiempoEspera);
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
          <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '0.85rem', color: conectado ? '#7be3b4' : '#ffd36b' }}>
            {conectado ? `🟢 Servidor ${nombreModo} conectado` : `🟡 Conectando al servidor ${nombreModo}...`}
          </div>

          {errorMsg && <div className="menu-error">{errorMsg}</div>}

          {/* ─── VISTA: CREAR O UNIRSE ─── */}
          {vista === 'inicio' && (
            <div className="menu-opciones">
              <h2 className="menu-panel-titulo">{esOnline ? 'JUEGO ONLINE' : 'JUEGO EN LAN'}</h2>
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
                disabled={cargando}
                autoFocus
              />
              <div className="menu-botones-fila">
                <button
                  type="button"
                  className="menu-button menu-button--oscuro"
                  onClick={() => { setErrorMsg(''); setVista('inicio'); }}
                  disabled={cargando}
                >
                  ← VOLVER
                </button>
                <button
                  type="submit"
                  className="menu-button menu-button--blue"
                  disabled={cargando}
                >
                  {cargando ? 'CREANDO...' : 'CREAR'}
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
                disabled={cargando}
              />
              <label className="menu-label">Código de sala (4 letras)</label>
              <input
                type="text"
                className="menu-input menu-input--codigo"
                placeholder="CÓDIGO"
                value={codigoSalaInput}
                onChange={(e) => setCodigoSalaInput(e.target.value.toUpperCase())}
                maxLength={4}
                disabled={cargando}
                autoFocus
              />
              <div className="menu-botones-fila">
                <button
                  type="button"
                  className="menu-button menu-button--oscuro"
                  onClick={() => { setErrorMsg(''); setVista('inicio'); }}
                  disabled={cargando}
                >
                  ← VOLVER
                </button>
                <button
                  type="submit"
                  className="menu-button menu-button--gold"
                  disabled={cargando}
                >
                  {cargando ? 'UNIÉNDOSE...' : 'UNIRSE'}
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
