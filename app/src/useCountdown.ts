// Обратный отсчёт раунда. ТОЛЬКО для отображения — серверный таймер главнее,
// конец раунда приходит событием round:end, клиенту не доверяем.

import { useEffect, useState } from 'react';

export function useCountdown(startedAt: number, durationSec: number): number {
  const compute = (): number => {
    const elapsed = (Date.now() - startedAt) / 1000;
    return Math.max(0, Math.ceil(durationSec - elapsed));
  };
  const [seconds, setSeconds] = useState<number>(compute);

  useEffect(() => {
    setSeconds(compute());
    const id = setInterval(() => setSeconds(compute()), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, durationSec]);

  return seconds;
}
