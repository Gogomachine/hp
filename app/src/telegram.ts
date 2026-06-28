// Типизированный доступ к Telegram WebApp SDK (скрипт подключён в index.html).

interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: TelegramUser };
  colorScheme: 'light' | 'dark';
  ready: () => void;
  expand: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

// Инициализация SDK до рендера: разворачиваем на весь экран, фиксируем цвета.
export function initTelegram(): void {
  const tg = getWebApp();
  if (tg === null) {
    return;
  }
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#13131a');
    tg.setBackgroundColor('#13131a');
  } catch (err) {
    console.error('[telegram] init failed', err);
  }
}

export function getInitData(): string {
  return getWebApp()?.initData ?? '';
}

export function getCurrentUser(): TelegramUser | null {
  return getWebApp()?.initDataUnsafe.user ?? null;
}
