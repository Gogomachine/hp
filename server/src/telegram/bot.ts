// Telegram-бот: команда /play открывает Mini App.
// Long polling через getUpdates, без внешних зависимостей (Node fetch).

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
  };
}

interface GetUpdatesResponse {
  ok: boolean;
  result?: TelegramUpdate[];
}

export interface BotHandle {
  stop: () => void;
}

export function startBot(botToken: string, webappUrl: string): BotHandle | null {
  if (botToken === '') {
    console.warn('[bot] BOT_TOKEN not set — Telegram bot disabled');
    return null;
  }
  if (webappUrl === '') {
    console.warn('[bot] WEBAPP_URL not set — Telegram bot disabled');
    return null;
  }

  const apiBase = `https://api.telegram.org/bot${botToken}`;
  let offset = 0;
  let running = true;

  async function callApi(method: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${apiBase}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function sendPlay(chatId: number): Promise<void> {
    try {
      await callApi('sendMessage', {
        chat_id: chatId,
        text: 'Готов к Hunchpoint? Жми кнопку и заходи в лобби 👇',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎯 Играть', web_app: { url: webappUrl } }],
          ],
        },
      });
    } catch (err) {
      console.error('[bot] sendPlay failed', err);
    }
  }

  function handleUpdate(update: TelegramUpdate): void {
    offset = Math.max(offset, update.update_id + 1);
    const text = update.message?.text?.trim();
    const chatId = update.message?.chat.id;
    if (chatId === undefined || text === undefined) {
      return;
    }
    if (text === '/play' || text === '/start') {
      void sendPlay(chatId);
    }
  }

  async function poll(): Promise<void> {
    while (running) {
      try {
        const data = (await callApi('getUpdates', {
          offset,
          timeout: 25,
        })) as GetUpdatesResponse;
        if (data.ok && data.result !== undefined) {
          for (const update of data.result) {
            handleUpdate(update);
          }
        }
      } catch (err) {
        console.error('[bot] poll error', err);
        // Небольшая пауза перед повтором, чтобы не крутить busy-loop при сбое.
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  void poll();
  console.log('[bot] long polling started');

  return {
    stop: () => {
      running = false;
    },
  };
}
