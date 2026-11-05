import { spawn } from 'child_process';

console.log('🚀 Iniciando Balatrinho (Servidor Socket.IO + Vite)...');

const server = spawn('node', ['server/server.js'], { stdio: 'inherit', shell: true });
const client = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

const cleanup = () => {
  server.kill();
  client.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
