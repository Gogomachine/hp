// Точка входа сервера Doton.
// Поднимает Fastify (/health), WebSocket-сервер и Telegram-бота.

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { loadConfig } from './config.js';
import { checkDbConnection, closePool } from './db/index.js';
import { createWsServer } from './ws/index.js';
import { getActiveDuelCount } from './game/gameLoop.js';
import { getQueueSize } from './game/matchmaking.js';
import { tournamentRoutes } from './routes/tournament.js';
import { startBot } from './telegram/bot.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  // Здоровье системы.
  app.get('/health', async () => {
    const dbOk = await checkDbConnection();
    return {
      ok: dbOk,
      db: dbOk ? 'connected' : 'disconnected',
      ws: 'running',
      duels_active: getActiveDuelCount(),
      queue_size: getQueueSize(),
    };
  });

  await app.register(tournamentRoutes);

  const wss = createWsServer(config.wsPort, config.botToken);
  const bot = startBot(config.botToken, config.webappUrl);

  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`[http] listening on :${config.port}`);

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[shutdown] received ${signal}`);
    try {
      bot?.stop();
      wss.close();
      await app.close();
      await closePool();
    } catch (err) {
      console.error('[shutdown] error', err);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  console.error('[fatal] failed to start server', err);
  process.exit(1);
});
