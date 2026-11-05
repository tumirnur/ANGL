// FSRS-5 — алгоритм интервальных повторений (тот же, что в современном Anki).
// Модель памяти DSR: сложность (D), стабильность (S, дни) и вероятность вспомнить (R).
// Формулы: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm

export const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];

export const Rating = { Again: 1, Hard: 2, Good: 3, Easy: 4 };
export const State = { New: 0, Learning: 1, Review: 2, Relearning: 3 };

const DECAY = -0.5;
const FACTOR = 19 / 81; // при t = S вероятность вспомнить ровно 90 %
const DAY = 86400000;
const MIN = 60000;

export const DEFAULTS = {
  retention: 0.9, // целевая вероятность вспомнить
  maxInterval: 365, // дней
  againDelay: 10 * MIN, // через сколько вернуть забытое слово
};

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function retrievability(elapsedDays, stability) {
  if (!stability) return 0;
  return Math.pow(1 + (FACTOR * Math.max(0, elapsedDays)) / stability, DECAY);
}

export function cardRetrievability(card, now = Date.now()) {
  if (!card || !card.last) return 0;
  return retrievability((now - card.last) / DAY, card.s);
}

export function intervalFor(stability, retention = DEFAULTS.retention) {
  return (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
}

const initDifficulty = (g) => clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10);
const initStability = (g) => Math.max(W[g - 1], 0.1);

function nextDifficulty(d, g) {
  const delta = -W[6] * (g - 3);
  const linear = d + (delta * (10 - d)) / 9; // затухание у верхней границы
  const reverted = W[7] * initDifficulty(4) + (1 - W[7]) * linear; // возврат к среднему
  return clamp(reverted, 1, 10);
}

function recallStability(d, s, r, g) {
  const hardPenalty = g === Rating.Hard ? W[15] : 1;
  const easyBonus = g === Rating.Easy ? W[16] : 1;
  return (
    s *
    (1 +
      Math.exp(W[8]) *
        (11 - d) *
        Math.pow(s, -W[9]) *
        (Math.exp(W[10] * (1 - r)) - 1) *
        hardPenalty *
        easyBonus)
  );
}

function forgetStability(d, s, r) {
  const f =
    W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
  return Math.min(f, s / Math.exp(W[17] * W[18]));
}

const shortTermStability = (s, g) => s * Math.exp(W[17] * (g - 3 + W[18]));

export function newCard() {
  return { st: State.New, s: 0, d: 0, due: 0, last: 0, reps: 0, lapses: 0 };
}

/**
 * Применить ответ к карточке.
 * @param {object} card  текущее состояние (или undefined для новой)
 * @param {number} g     оценка 1–4
 * @param {number} now   время ответа, мс
 * @param {() => number} rng генератор для «размытия» интервалов
 * @returns {{card: object, intervalDays: number, elapsedDays: number}}
 */
export function review(card, g, now = Date.now(), rng = Math.random, opts = DEFAULTS) {
  const c = { ...(card || newCard()) };
  const elapsedDays = c.last ? (now - c.last) / DAY : 0;

  if (c.st === State.New || !c.last) {
    c.s = initStability(g);
    c.d = initDifficulty(g);
  } else {
    if (elapsedDays < 1) {
      c.s = shortTermStability(c.s, g);
    } else {
      const r = retrievability(elapsedDays, c.s);
      c.s = g === Rating.Again ? forgetStability(c.d, c.s, r) : recallStability(c.d, c.s, r, g);
    }
    c.d = nextDifficulty(c.d, g);
  }
  c.s = clamp(c.s, 0.1, 36500);

  c.reps += 1;
  c.last = now;
  let intervalDays;
  if (g === Rating.Again) {
    if (c.st === State.Review) c.lapses += 1;
    c.st = c.st === State.New || c.st === State.Learning ? State.Learning : State.Relearning;
    intervalDays = opts.againDelay / DAY;
  } else {
    c.st = State.Review;
    let ivl = intervalFor(c.s, opts.retention);
    if (ivl >= 2.5) {
      // небольшой разброс, чтобы повторения не собирались в один день
      const fuzz = Math.max(1, ivl * 0.05);
      ivl = ivl - fuzz + rng() * 2 * fuzz;
    }
    intervalDays = clamp(Math.round(ivl), 1, opts.maxInterval);
  }
  c.due = now + intervalDays * DAY;
  return { card: c, intervalDays, elapsedDays };
}

// Предпросмотр интервалов для каждой оценки (без случайного разброса).
export function previewIntervals(card, now = Date.now()) {
  const out = {};
  for (const g of [1, 2, 3, 4]) out[g] = review(card, g, now, () => 0.5).intervalDays;
  return out;
}
