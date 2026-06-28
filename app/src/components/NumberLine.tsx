import { useEffect, useState } from 'react';
import { avatarColor } from '../avatar.js';
import styles from './NumberLine.module.css';

export interface LinePoint {
  telegram_id: number;
  username: string | null;
  value: number;
}

interface NumberLineProps {
  min: number;
  max: number;
  unit: string;
  correctAnswer: number;
  points: LinePoint[];
  dotsVisible: boolean; // точки разлетаются после показа правильного ответа
}

function pct(value: number, min: number, max: number): number {
  if (max <= min) {
    return 0;
  }
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function NumberLine({
  min,
  max,
  unit,
  correctAnswer,
  points,
  dotsVisible,
}: NumberLineProps) {
  // Локальная задержка, чтобы точки появились плавно.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (dotsVisible) {
      const id = setTimeout(() => setShown(true), 50);
      return () => clearTimeout(id);
    }
    setShown(false);
    return undefined;
  }, [dotsVisible]);

  return (
    <div className={styles.wrap}>
      <div className={styles.track} />

      {/* Метка правильного ответа */}
      <div
        className={styles.correct}
        style={{ left: `${pct(correctAnswer, min, max)}%` }}
      >
        <span className={styles.correctLabel}>
          {fmt(correctAnswer)}
          {unit}
        </span>
        <span className={styles.correctTick} />
      </div>

      {/* Точки игроков */}
      {points.map((p) => (
        <span
          key={p.telegram_id}
          className={`${styles.dot} ${shown ? styles.dotShown : ''}`}
          style={{
            left: `${pct(p.value, min, max)}%`,
            background: avatarColor(p.username),
          }}
          title={`${p.username ?? 'игрок'}: ${fmt(p.value)}${unit}`}
        />
      ))}

      <div className={styles.scale}>
        <span>
          {fmt(min)}
          {unit}
        </span>
        <span>
          {fmt(max)}
          {unit}
        </span>
      </div>
    </div>
  );
}
