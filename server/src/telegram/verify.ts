// Верификация Telegram WebApp initData (HMAC-SHA256).
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

import { createHmac, timingSafeEqual } from 'node:crypto';

export interface VerifiedInitData {
  telegramId: number;
  username: string | null;
  raw: URLSearchParams;
}

// Возвращает разобранные данные, если подпись валидна, иначе null.
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
): VerifiedInitData | null {
  if (initData === '' || botToken === '') {
    return null;
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }

  const hash = params.get('hash');
  if (hash === null) {
    return null;
  }

  // data_check_string: все пары кроме hash, отсортированы по ключу, через \n.
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key !== 'hash') {
      pairs.push(`${key}=${value}`);
    }
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  const computedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (!safeEqualHex(computedHash, hash)) {
    return null;
  }

  const userRaw = params.get('user');
  if (userRaw === null) {
    return null;
  }

  let telegramId: number;
  let username: string | null;
  try {
    const user = JSON.parse(userRaw) as { id?: number; username?: string };
    if (typeof user.id !== 'number') {
      return null;
    }
    telegramId = user.id;
    username = typeof user.username === 'string' ? user.username : null;
  } catch {
    return null;
  }

  return { telegramId, username, raw: params };
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
