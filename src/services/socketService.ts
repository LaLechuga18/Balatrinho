import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const host = window.location.hostname || 'localhost';
    // Connect to port 3001 if in standard dev mode, or same origin
    const serverUrl = window.location.port === '5173'
      ? `http://${host}:3001`
      : window.location.origin;

    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
  }
  return socket;
}
