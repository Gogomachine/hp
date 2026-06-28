# Hunchpoint — app

React 18 + Vite Telegram Mini App (TypeScript, тёмная тема).

## Запуск локально

```bash
npm install
npm run dev   # http://localhost:5173 — в dev вне Telegram включается demo-режим
```

Вне Telegram (нет `initData`) в dev автоматически показывается **demo-экран
раунда** — можно видеть UI без бэкенда.

## Скрипты

| Скрипт            | Назначение                          |
|-------------------|-------------------------------------|
| `npm run dev`     | Dev-сервер Vite                     |
| `npm run build`   | Проверка типов + production-сборка   |
| `npm run preview` | Просмотр собранного билда           |
| `npm run typecheck` | Только проверка типов              |

## Переменные окружения (Vite)

```bash
VITE_WS_URL=ws://localhost:3001     # адрес WebSocket-сервера
VITE_TOURNAMENT_ID=1                # id турнира для подключения
```

## Структура

```
app/src/
├── main.tsx              # init Telegram SDK + TON Connect provider, рендер
├── App.tsx               # роутинг по фазе игры (lobby/round/final)
├── telegram.ts           # типизированный доступ к Telegram WebApp SDK
├── categories.ts         # категории вопросов → подпись + цвет
├── avatar.ts             # инициалы и цвет аватара
├── useCountdown.ts       # таймер раунда (только отображение)
├── ws/
│   ├── types.ts          # контракт событий (клиент)
│   ├── client.ts         # WS-клиент: reconnect backoff, ping, очередь
│   ├── useGame.ts        # игровое состояние, обработка событий
│   └── demo.ts           # demo-сид (экран раунда без бэкенда)
├── components/           # Slider, Timer, PlayerRow, ScoreLine, CategoryPill
└── screens/              # Round, Lobby, Final, Wallet
```

## Заметки

- **Round** показывает и сам раунд, и его итог (`round:end`) внутри одной
  карточки — как в макете. Отдельного экрана Results нет.
- Таймеру клиента не доверяем: конец раунда приходит событием `round:end`,
  отсчёт — только для отображения.
- Ответы других игроков не хранятся до `round:end` (приходят только флаги
  «ответил» через `player:answered`).
- Контракт `round:start` отдаёт номер раунда, но `answer` требует `round_id` —
  это пробел контракта, помечен в `useGame.ts` (нужно добавить `round_id` на
  бэкенде).
