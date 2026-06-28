-- Сид вопросов для тестирования игрового движка (фаза 2).
-- ВАЖНО: только объективно проверяемые факты/константы с источниками —
-- НЕ выдуманные «рыночные» статистики (см. правило CLAUDE.md про источники).
-- Для продакшена эти вопросы заменяются на верифицированный контент.

BEGIN;

INSERT INTO questions (text, category, answer, unit, range_min, range_max, score_curve, max_points, difficulty, source_url) VALUES
('Температура кипения воды при нормальном давлении?', 'physics', 100, '°C', 0, 200, 'log', 200, 1, 'https://en.wikipedia.org/wiki/Boiling_point'),
('Температура замерзания воды при нормальном давлении?', 'physics', 0, '°C', -50, 50, 'log', 200, 1, 'https://en.wikipedia.org/wiki/Melting_point'),
('Сколько костей в теле взрослого человека?', 'wildcard', 206, 'шт', 100, 300, 'log', 200, 3, 'https://en.wikipedia.org/wiki/List_of_bones_of_the_human_skeleton'),
('Сколько планет в Солнечной системе?', 'physics', 8, 'шт', 1, 15, 'step', 200, 1, 'https://en.wikipedia.org/wiki/Solar_System'),
('Сколько клавиш у стандартного фортепиано?', 'wildcard', 88, 'шт', 50, 120, 'log', 200, 3, 'https://en.wikipedia.org/wiki/Piano'),
('Сколько игроков одной команды на поле в футболе?', 'wildcard', 11, 'шт', 5, 15, 'step', 200, 2, 'https://en.wikipedia.org/wiki/Association_football'),
('Скорость света в вакууме?', 'physics', 299.792, 'тыс км/с', 0, 500, 'log', 200, 4, 'https://en.wikipedia.org/wiki/Speed_of_light'),
('Сколько хромосом в диплоидном наборе человека?', 'wildcard', 46, 'шт', 0, 100, 'log', 200, 4, 'https://en.wikipedia.org/wiki/Human_genome'),
('Число π с точностью до двух знаков?', 'stats', 3.14, '', 0, 10, 'log', 200, 2, 'https://en.wikipedia.org/wiki/Pi'),
('Сколько дней в невисокосном году?', 'wildcard', 365, 'дн', 300, 400, 'step', 200, 1, 'https://en.wikipedia.org/wiki/Year'),
('Сколько букв в современном русском алфавите?', 'wildcard', 33, 'шт', 20, 40, 'step', 200, 2, 'https://en.wikipedia.org/wiki/Russian_alphabet'),
('Сколько секунд в одном часе?', 'stats', 3600, 'сек', 0, 7200, 'log', 200, 2, 'https://en.wikipedia.org/wiki/Hour'),
('Чему равна сумма углов треугольника?', 'stats', 180, '°', 0, 360, 'step', 200, 1, 'https://en.wikipedia.org/wiki/Sum_of_angles_of_a_triangle'),
('Сколько минут в сутках?', 'stats', 1440, 'мин', 0, 2000, 'log', 200, 2, 'https://en.wikipedia.org/wiki/Day');

COMMIT;
