// Typed access to the Telegram WebApp SDK (script loaded in index.html).

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

export function getInitData(): string {
  return getWebApp()?.initData ?? '';
}

export function getCurrentUser(): TelegramUser | null {
  return getWebApp()?.initDataUnsafe.user ?? null;
}

// Alias for backward-compat
export const getTelegramUser = getCurrentUser;
