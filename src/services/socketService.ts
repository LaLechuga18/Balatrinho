import { io, Socket } from 'socket.io-client';

export type NetworkMode = 'lan' | 'online';

// Servidor público desplegado en Render
export const ONLINE_SERVER_URL = 'https://balatrinho.onrender.com';

let socket: Socket | null = null;
let currentMode: NetworkMode = 'lan';

export function getNetworkMode(): NetworkMode {
  return currentMode;
}

// Elige a qué servidor se conecta el socket. Si cambia el modo, se descarta la conexión anterior.
export function setNetworkMode(mode: NetworkMode): void {
  if (mode === currentMode) return;
  currentMode = mode;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket {
  if (!socket) {
    // LAN: servidor personalizado si se indica, o el origen actual (el PC que sirve la página)
    // Online: servidor público de Render
    const serverUrl =
      currentMode === 'online'
        ? ONLINE_SERVER_URL
        : (import.meta as any).env?.VITE_SERVER_URL || window.location.origin;

    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      // Render (plan gratuito) puede tardar ~50 s en despertar el servidor
      timeout: currentMode === 'online' ? 60000 : 10000,
    });
  }
  return socket;
}
