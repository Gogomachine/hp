// Категории вопросов: сырой ключ из БД → отображаемая подпись и цвет пилюли.

export type Category =
  | 'market'
  | 'behavior'
  | 'physics'
  | 'stats'
  | 'wildcard';

interface CategoryMeta {
  label: string;
  color: string;
}

const CATEGORIES: Record<string, CategoryMeta> = {
  market: { label: 'Рынки и аукционы', color: '#7f77dd' },
  behavior: { label: 'Поведение', color: '#5dcaa5' },
  physics: { label: 'Физика', color: '#4aa3df' },
  stats: { label: 'Статистика', color: '#ef9f27' },
  wildcard: { label: 'Wildcard', color: '#ef5a5a' },
};

const FALLBACK: CategoryMeta = { label: 'Вопрос', color: '#7f77dd' };

export function categoryMeta(category: string): CategoryMeta {
  return CATEGORIES[category] ?? FALLBACK;
}
