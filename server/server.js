import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
app.use(cors());

// Serve production frontend assets when built
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;
const VIDAS_INICIALES_HP = 6; // 3 corazones (cada uno vale 2 hp)
const MONEDAS_POR_POSICION = [5, 4, 3, 1];
const MONEDAS_POR_100_PUNTOS = 1;

/**
 * @typedef {Object} Player
 * @property {string} id
 * @property {string} name
 * @property {boolean} isHost
 * @property {number} hp
 * @property {number} coins
 * @property {boolean} isAlive
 * @property {number} currentRoundScore
 * @property {number} totalScore
 * @property {boolean} roundFinished
 * @property {boolean} shopReady
 * @property {boolean} [rematchReady]
 * @property {Array<{id: string, nombre: string, imagen?: string}>} [jokers]
 */

/**
 * @typedef {Object} Room
 * @property {string} code
 * @property {string} hostId
 * @property {'lobby' | 'playing' | 'shop' | 'game_over'} state
 * @property {number} round
 * @property {Player[]} players
 */

/** @type {Map<string, Room>} */
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const k in interfaces) {
    for (const k2 of interfaces[k] || []) {
      if (k2.family === 'IPv4' && !k2.internal) {
        addresses.push(k2.address);
      }
    }
  }
  return addresses;
}

io.on('connection', (socket) => {
  let currentRoomCode = null;

  socket.on('create_room', ({ playerName }) => {
    const code = generateRoomCode();
    currentRoomCode = code;

    const newPlayer = {
      id: socket.id,
      name: (playerName || 'Jugador 1').trim().slice(0, 15),
      isHost: true,
      hp: VIDAS_INICIALES_HP,
      coins: 0,
      isAlive: true,
      currentRoundScore: 0,
      totalScore: 0,
      roundFinished: false,
      shopReady: false,
      rematchReady: false,
      jokers: [],
    };

    const room = {
      code,
      hostId: socket.id,
      state: 'lobby',
      round: 1,
      players: [newPlayer],
    };

    rooms.set(code, room);
    socket.join(code);

    socket.emit('room_joined', {
      roomCode: code,
      playerId: socket.id,
      players: room.players,
      isHost: true,
    });
  });

  socket.on('join_room', ({ roomCode, playerName }) => {
    const code = (roomCode || '').trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      return socket.emit('room_error', { message: 'Sala no encontrada.' });
    }

    if (room.state !== 'lobby') {
      return socket.emit('room_error', { message: 'La partida ya ha comenzado.' });
    }

    if (room.players.length >= 4) {
      return socket.emit('room_error', { message: 'La sala está llena (máx 4 jugadores).' });
    }

    currentRoomCode = code;
    const newPlayer = {
      id: socket.id,
      name: (playerName || `Jugador ${room.players.length + 1}`).trim().slice(0, 15),
      isHost: false,
      hp: VIDAS_INICIALES_HP,
      coins: 0,
      isAlive: true,
      currentRoundScore: 0,
      totalScore: 0,
      roundFinished: false,
      shopReady: false,
      rematchReady: false,
      jokers: [],
    };

    room.players.push(newPlayer);
    socket.join(code);

    socket.emit('room_joined', {
      roomCode: code,
      playerId: socket.id,
      players: room.players,
      isHost: false,
    });

    io.to(code).emit('room_updated', {
      roomCode: code,
      players: room.players,
      state: room.state,
      round: room.round,
    });
  });

  socket.on('start_game', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id) return;

    room.state = 'playing';
    room.round = 1;
    room.players.forEach((p) => {
      p.hp = VIDAS_INICIALES_HP;
      p.coins = 0;
      p.isAlive = true;
      p.currentRoundScore = 0;
      p.totalScore = 0;
      p.roundFinished = false;
      p.shopReady = false;
      p.rematchReady = false;
      p.jokers = [];
    });

    io.to(currentRoomCode).emit('game_started', {
      round: room.round,
      players: room.players,
    });
  });

  socket.on('update_live_score', ({ currentRoundScore, totalScore, jokers }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      player.currentRoundScore = currentRoundScore;
      player.totalScore = totalScore;
      if (Array.isArray(jokers)) {
        player.jokers = jokers;
      }
      socket.to(currentRoomCode).emit('opponent_score_updated', {
        playerId: socket.id,
        currentRoundScore,
        totalScore,
        jokers: player.jokers,
      });
    }
  });

  socket.on('update_jokers', ({ jokers }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player && Array.isArray(jokers)) {
      player.jokers = jokers;
      io.to(currentRoomCode).emit('room_updated', {
        roomCode: room.code,
        players: room.players,
        state: room.state,
        round: room.round,
      });
    }
  });

  function resolveRoundForRoom(room) {
    const activePlayers = room.players.filter((p) => p.isAlive);
    // 1. Sort active players by round score descending
    const sortedByRound = [...activePlayers].sort(
      (a, b) => b.currentRoundScore - a.currentRoundScore
    );

    const numPlayers = sortedByRound.length;
    const resolutionResults = [];

    sortedByRound.forEach((p, idx) => {
      const rank = idx + 1; // 1-based rank
      let damage = 0;

      // Damage rules based on number of active players:
      if (numPlayers === 2) {
        if (rank === 2) damage = 1; // 1 HP = half heart
      } else if (numPlayers >= 3) {
        if (rank === numPlayers) {
          damage = 2; // last place = 1 full heart (2 HP)
        } else if (rank === numPlayers - 1) {
          damage = 1; // second to last = half heart (1 HP)
        }
      }

      p.hp = Math.max(0, p.hp - damage);
      if (p.hp <= 0) {
        p.isAlive = false;
      }

      const monedasPos = MONEDAS_POR_POSICION[Math.min(rank - 1, MONEDAS_POR_POSICION.length - 1)];
      const monedasPuntos = Math.floor(p.currentRoundScore / 100) * MONEDAS_POR_100_PUNTOS;
      const totalMonedasGanadas = monedasPos + monedasPuntos;
      p.coins += totalMonedasGanadas;

      resolutionResults.push({
        playerId: p.id,
        name: p.name,
        roundScore: p.currentRoundScore,
        rank,
        damage,
        newHp: p.hp,
        coinsEarned: totalMonedasGanadas,
        totalCoins: p.coins,
        isAlive: p.isAlive,
        jokers: p.jokers || [],
      });
    });

    // Check game over condition: game ends when only 1 (or 0) players remain alive
    const stillAlive = room.players.filter((p) => p.isAlive);
    const isGameOver = room.players.length > 1
      ? stillAlive.length <= 1
      : stillAlive.length === 0;

    if (isGameOver) {
      room.state = 'game_over';
      room.players.forEach((p) => {
        p.rematchReady = false;
      });

      // Final ranking by totalScore (living players on top)
      const finalLeaderboard = [...room.players]
        .sort((a, b) => {
          if (b.isAlive !== a.isAlive) return b.isAlive ? 1 : -1;
          return b.totalScore - a.totalScore;
        })
        .map((p, idx) => ({
          playerId: p.id,
          name: p.name,
          totalScore: p.totalScore,
          isWinner: idx === 0,
          rank: idx + 1,
          hp: p.hp,
        }));

      io.to(room.code).emit('round_resolved', {
        round: room.round,
        results: resolutionResults,
        isGameOver: true,
        finalLeaderboard,
        players: room.players,
      });
    } else {
      room.state = 'shop';
      room.players.forEach((p) => {
        p.roundFinished = false;
        p.shopReady = false;
      });

      io.to(room.code).emit('round_resolved', {
        round: room.round,
        results: resolutionResults,
        isGameOver: false,
        players: room.players,
      });
    }
  }

  socket.on('finish_round', ({ roundScore, totalScore, jokers }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      player.currentRoundScore = roundScore;
      player.totalScore = totalScore;
      player.roundFinished = true;
      if (Array.isArray(jokers)) {
        player.jokers = jokers;
      }
    }

    // Check if all active players finished their round
    const activePlayers = room.players.filter((p) => p.isAlive);
    const allFinished = activePlayers.every((p) => p.roundFinished);

    if (allFinished) {
      resolveRoundForRoom(room);
    } else {
      // Notify other players that this player has finished
      socket.to(currentRoomCode).emit('opponent_finished_round', {
        playerId: socket.id,
        currentRoundScore: roundScore,
      });
    }
  });

  socket.on('shop_ready', ({ jokers } = {}) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      player.shopReady = true;
      if (Array.isArray(jokers)) {
        player.jokers = jokers;
      }
    }

    const activePlayers = room.players.filter((p) => p.isAlive);
    const allReady = activePlayers.every((p) => p.shopReady);

    if (allReady) {
      room.round += 1;
      room.state = 'playing';
      room.players.forEach((p) => {
        p.shopReady = false;
        p.roundFinished = false;
        p.currentRoundScore = 0;
      });

      io.to(currentRoomCode).emit('all_shop_ready', {
        nextRound: room.round,
        players: room.players,
      });
    } else {
      io.to(currentRoomCode).emit('player_shop_ready', {
        playerId: socket.id,
      });
    }
  });

  socket.on('rematch_ready', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'game_over') return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      player.rematchReady = true;
    }

    // Check if ALL currently connected players are confirmed ready
    const allRematchReady = room.players.length > 0 && room.players.every((p) => p.rematchReady);

    if (allRematchReady) {
      // Reset state and start match immediately for all confirmed players
      room.state = 'playing';
      room.round = 1;
      room.players.forEach((p) => {
        p.hp = VIDAS_INICIALES_HP;
        p.coins = 0;
        p.isAlive = true;
        p.currentRoundScore = 0;
        p.totalScore = 0;
        p.roundFinished = false;
        p.shopReady = false;
        p.rematchReady = false;
        p.jokers = [];
      });

      io.to(currentRoomCode).emit('game_started', {
        round: room.round,
        players: room.players,
      });
    } else {
      io.to(currentRoomCode).emit('rematch_status_updated', {
        players: room.players,
      });
    }
  });

  function handlePlayerExit() {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const leavingPlayerId = socket.id;
    room.players = room.players.filter((p) => p.id !== socket.id);
    socket.leave(currentRoomCode);

    if (room.players.length === 0) {
      rooms.delete(currentRoomCode);
      currentRoomCode = null;
      return;
    }

    // Reassign host if host left
    if (room.hostId === leavingPlayerId) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
    }

    // When playing or in shop: if players abandon and only 1 remains, game ends and only one left wins!
    if (room.state === 'playing' || room.state === 'shop') {
      const activePlayers = room.players.filter((p) => p.isAlive);
      if (room.players.length <= 1 || activePlayers.length <= 1) {
        room.state = 'game_over';
        room.players.forEach((p) => {
          p.rematchReady = false;
          p.isAlive = true;
        });

        const winner = room.players[0];
        const finalLeaderboard = [{
          playerId: winner.id,
          name: winner.name,
          totalScore: winner.totalScore,
          isWinner: true,
          rank: 1,
          hp: winner.hp,
        }];

        io.to(currentRoomCode).emit('round_resolved', {
          round: room.round,
          results: [],
          isGameOver: true,
          finalLeaderboard,
          players: room.players,
          abandonedWin: true,
        });

        io.to(currentRoomCode).emit('room_updated', {
          roomCode: room.code,
          players: room.players,
          state: room.state,
          round: room.round,
        });
        currentRoomCode = null;
        return;
      }

      // If multiple players still active, check if all remaining active finished
      if (room.state === 'playing') {
        const allFinished = activePlayers.every((p) => p.roundFinished);
        if (allFinished) {
          resolveRoundForRoom(room);
        }
      } else if (room.state === 'shop') {
        const allReady = activePlayers.every((p) => p.shopReady);
        if (allReady) {
          room.round += 1;
          room.state = 'playing';
          room.players.forEach((p) => {
            p.shopReady = false;
            p.roundFinished = false;
            p.currentRoundScore = 0;
          });
          io.to(currentRoomCode).emit('all_shop_ready', {
            nextRound: room.round,
            players: room.players,
          });
        }
      }
    }

    if (room.state === 'game_over') {
      // If the remaining players have all already clicked ready, start the game without waiting for the player who left!
      const allRematchReady = room.players.length > 0 && room.players.every((p) => p.rematchReady);
      if (allRematchReady && room.players.length >= 2) {
        room.state = 'playing';
        room.round = 1;
        room.players.forEach((p) => {
          p.hp = VIDAS_INICIALES_HP;
          p.coins = 0;
          p.isAlive = true;
          p.currentRoundScore = 0;
          p.totalScore = 0;
          p.roundFinished = false;
          p.shopReady = false;
          p.rematchReady = false;
          p.jokers = [];
        });

        io.to(currentRoomCode).emit('game_started', {
          round: room.round,
          players: room.players,
        });
        currentRoomCode = null;
        return;
      }

      io.to(currentRoomCode).emit('rematch_status_updated', {
        players: room.players,
      });
    }

    io.to(currentRoomCode).emit('room_updated', {
      roomCode: room.code,
      players: room.players,
      state: room.state,
      round: room.round,
    });

    currentRoomCode = null;
  }

  socket.on('leave_room', handlePlayerExit);
  socket.on('disconnect', handlePlayerExit);
});

// SPA fallback for frontend routes in production (Express 5 compatible)
if (fs.existsSync(distPath)) {
  app.use((req, res, next) => {
    if (req.url.startsWith('/socket.io')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`🎮 Balatrinho Multiplayer Server is running on port ${PORT}`);
  console.log(`🌐 Local LAN Access URLs:`);
  console.log(`   - Localhost: http://localhost:${PORT}`);
  const ips = getLocalIpAddresses();
  ips.forEach((ip) => {
    console.log(`   - LAN Network: http://${ip}:${PORT}`);
  });
  console.log(`==================================================\n`);
});
