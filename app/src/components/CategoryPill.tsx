import { categoryMeta } from '../categories.js';
import styles from './CategoryPill.module.css';

export function CategoryPill({ category }: { category: string }) {
  const meta = categoryMeta(category);
  return (
    <span
      className={styles.pill}
      style={{
        color: meta.color,
        background: `${meta.color}22`,
        borderColor: `${meta.color}55`,
      }}
    >
      {meta.label}
    </span>
  );
}
