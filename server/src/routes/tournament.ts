// HTTP-роуты турнира: вход в очередь и состояние турнира.

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getTournamentState, joinQueue } from '../game/matchmaking.js';
import { isTier } from '../game/tiers.js';
import { verifyTelegramInitData } from '../telegram/verify.js';

interface JoinBody {
  telegram_id?: unknown;
  username?: unknown;
  tier?: unknown;
  init_data?: unknown;
}

interface RouteOptions extends FastifyPluginOptions {
  botToken: string;
}

export async function tournamentRoutes(
  app: FastifyInstance,
  opts: RouteOptions,
): Promise<void> {
  const { botToken } = opts;

  app.post('/tournament/join', async (req, reply) => {
    const body = (req.body ?? {}) as JoinBody;
    const telegramId = body.telegram_id;
    const tier = body.tier;
    const username = typeof body.username === 'string' ? body.username : null;
    const initData = typeof body.init_data === 'string' ? body.init_data : '';

    if (typeof telegramId !== 'number' || typeof tier !== 'string' || !isTier(tier)) {
      return reply.code(400).send({ error: 'telegram_id (number) and valid tier required' });
    }

    // Верификация initData на чувствительном запросе (если задан BOT_TOKEN).
    if (botToken !== '') {
      const verified = verifyTelegramInitData(initData, botToken);
      if (verified === null || verified.telegramId !== telegramId) {
        return reply.code(401).send({ error: 'invalid initData' });
      }
    }

    try {
      const result = await joinQueue(telegramId, username, tier);
      return reply.send({
        tournament_id: result.tournamentId,
        position: result.position,
      });
    } catch (err) {
      console.error('[route] /tournament/join failed', err);
      return reply.code(500).send({ error: 'join failed' });
    }
  });

  app.get<{ Params: { id: string } }>('/tournament/:id', async (req, reply) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return reply.code(400).send({ error: 'invalid id' });
    }
    try {
      const state = await getTournamentState(id);
      if (state === null) {
        return reply.code(404).send({ error: 'tournament not found' });
      }
      return reply.send(state);
    } catch (err) {
      console.error('[route] GET /tournament/:id failed', err);
      return reply.code(500).send({ error: 'lookup failed' });
    }
  });
}
