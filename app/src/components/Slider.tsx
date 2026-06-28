import styles from './Slider.module.css';

interface SliderProps {
  min: number;
  max: number;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function Slider({ min, max, value, disabled = false, onChange }: SliderProps) {
  // step = (range_max - range_min) / 100 (правило из CLAUDE.md)
  const step = (max - min) / 100;
  const ratio = max > min ? (value - min) / (max - min) : 0;
  const pct = `${Math.max(0, Math.min(1, ratio)) * 100}%`;

  return (
    <input
      type="range"
      className={styles.slider}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        background: `linear-gradient(to right, var(--purple) ${pct}, var(--border) ${pct})`,
      }}
    />
  );
}
