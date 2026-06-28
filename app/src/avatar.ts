// Аватар из юзернейма: инициалы + стабильный цвет по хешу.

const COLORS = [
  '#5dcaa5',
  '#7f77dd',
  '#ef9f27',
  '#ef5a5a',
  '#4aa3df',
  '#d36fb0',
];

export function initials(username: string | null): string {
  if (username === null || username === '') {
    return '??';
  }
  const cleaned = username.replace(/[^a-zA-Zа-яА-Я0-9_]/g, '');
  const parts = cleaned.split('_').filter((p) => p.length > 0);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export function avatarColor(username: string | null): string {
  const key = username ?? '';
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index]!;
}
