// Юнит-тесты скоринга: 3 кривые × 3 уровня ошибки + бонус за время.
// Запуск: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateScore, calculateTimeBonus } from './scoring.js';

// Диапазон 0..100, maxPoints 200. Точный ответ = 50.
const MIN = 0;
const MAX = 100;
const ANSWER = 50;
const MAX_POINTS = 200;

test('linear: точный ответ → максимум', () => {
  assert.equal(calculateScore(50, ANSWER, MIN, MAX, MAX_POINTS, 'linear'), 200);
});

test('linear: ошибка 10% → 180', () => {
  // errorPct = 10/100 = 0.1 → base 0.9 → 180
  assert.equal(calculateScore(60, ANSWER, MIN, MAX, MAX_POINTS, 'linear'), 180);
});

test('linear: ошибка 100% → 0', () => {
  assert.equal(calculateScore(150, ANSWER, MIN, MAX, MAX_POINTS, 'linear'), 0);
});

test('log: точный ответ → максимум', () => {
  assert.equal(calculateScore(50, ANSWER, MIN, MAX, MAX_POINTS, 'log'), 200);
});

test('log: ошибка 10% → 1-0.1^0.6', () => {
  const expected = Math.round(MAX_POINTS * (1 - Math.pow(0.1, 0.6)));
  assert.equal(calculateScore(60, ANSWER, MIN, MAX, MAX_POINTS, 'log'), expected);
});

test('log: ошибка 100% → 0', () => {
  assert.equal(calculateScore(150, ANSWER, MIN, MAX, MAX_POINTS, 'log'), 0);
});

test('step: ошибка < 5% → полный балл', () => {
  // errorPct = 3/100 = 0.03 < 0.05 → 200
  assert.equal(calculateScore(53, ANSWER, MIN, MAX, MAX_POINTS, 'step'), 200);
});

test('step: ошибка < 20% → половина', () => {
  // errorPct = 0.1 → 0.5 → 100
  assert.equal(calculateScore(60, ANSWER, MIN, MAX, MAX_POINTS, 'step'), 100);
});

test('step: ошибка >= 20% → 0', () => {
  assert.equal(calculateScore(80, ANSWER, MIN, MAX, MAX_POINTS, 'step'), 0);
});

test('range <= 0 → 0 (защита от деления на ноль)', () => {
  assert.equal(calculateScore(50, 50, 10, 10, MAX_POINTS, 'log'), 0);
});

test('timeBonus добавляется к очкам', () => {
  assert.equal(
    calculateScore(50, ANSWER, MIN, MAX, MAX_POINTS, 'linear', 15),
    215,
  );
});

test('calculateTimeBonus: мгновенный ответ → 20', () => {
  const start = new Date('2026-01-01T00:00:00Z');
  assert.equal(calculateTimeBonus(start, start, 45), 20);
});

test('calculateTimeBonus: ответ в конце → 0', () => {
  const start = new Date('2026-01-01T00:00:00Z');
  const end = new Date('2026-01-01T00:00:45Z');
  assert.equal(calculateTimeBonus(end, start, 45), 0);
});
