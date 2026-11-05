// Состояние: отметки занятий, слова, время, результаты тестов.
// Хранится в браузере и (в артефакте Claude) в его базе, чтобы телефон и компьютер видели одно и то же.
import { newCard } from './fsrs.js';

const KEY = 'grind-english:v2';

// День считается с 4 утра, как в большинстве трекеров привычек.
export function today(now = new Date()) {
  const t = new Date(now.getTime() - 4 * 3600e3);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function empty() {
  return { v: 2, done: {}, steps: {}, notes: {}, words: {}, days: {}, prefs: {} };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {}
  return empty();
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function normalize(s) {
  const e = empty();
  if (!s || typeof s !== 'object') return e;
  for (const k of Object.keys(e)) if (s[k] && typeof s[k] === 'object') e[k] = s[k];
  return e;
}

// Слияние двух копий: по каждой записи побеждает более свежая (поле u — время изменения).
export function merge(a, b) {
  a = normalize(a);
  b = normalize(b);
  const out = empty();
  for (const k of ['done', 'steps', 'notes', 'words', 'prefs']) {
    const keys = new Set([...Object.keys(a[k]), ...Object.keys(b[k])]);
    for (const id of keys) {
      const x = a[k][id];
      const y = b[k][id];
      if (!x) out[k][id] = y;
      else if (!y) out[k][id] = x;
      else out[k][id] = (y.u || 0) > (x.u || 0) ? y : x;
    }
  }
  const days = new Set([...Object.keys(a.days), ...Object.keys(b.days)]);
  for (const d of days) {
    const x = a.days[d] || {};
    const y = b.days[d] || {};
    out.days[d] = { min: Math.max(x.min || 0, y.min || 0) };
  }
  return out;
}

// ── Занятия ─────────────────────────────────────────────────────

export const isDone = (s, id) => !!(s.done[id] && !s.done[id].undone);

export function markDone(s, id, { min = 0, score = null, max = null, date = today() } = {}) {
  const prev = s.done[id];
  s.done[id] = { at: date, min, score, max, u: Date.now() };
  if (!prev || prev.undone) addMinutes(s, date, min);
}

export function unmark(s, id) {
  const prev = s.done[id];
  if (!prev) return;
  s.done[id] = { ...prev, undone: true, u: Date.now() };
}

export function setScore(s, id, score, max) {
  const prev = s.done[id] || { at: today(), min: 0, undone: true };
  s.done[id] = { ...prev, score, max, u: Date.now() };
}

export function toggleStep(s, id, i) {
  const cur = { ...(s.steps[id] || {}) };
  cur[i] = !cur[i];
  cur.u = Date.now();
  s.steps[id] = cur;
  return cur[i];
}
export const stepDone = (s, id, i) => !!(s.steps[id] && s.steps[id][i]);

export function setNote(s, id, text) {
  s.notes[id] = { text, u: Date.now() };
}

export function addMinutes(s, date, min) {
  if (!min) return;
  const d = s.days[date] || { min: 0 };
  s.days[date] = { min: Math.max(0, Math.round((d.min || 0) + min)) };
}

// ── Слова ───────────────────────────────────────────────────────

export function addWord(s, { en, ru, ex = '', src = '' }) {
  const id = uid();
  s.words[id] = { en: en.trim(), ru: ru.trim(), ex: ex.trim(), src, card: newCard(Date.now()), added: today(), u: Date.now() };
  return id;
}

export function updateWord(s, id, patch) {
  s.words[id] = { ...s.words[id], ...patch, u: Date.now() };
}

export function deleteWord(s, id) {
  s.words[id] = { ...s.words[id], del: true, u: Date.now() };
}

export const liveWords = (s) => Object.entries(s.words).filter(([, w]) => w && !w.del);

export function dueWords(s, now = Date.now()) {
  return liveWords(s)
    .filter(([, w]) => (w.card?.due ?? 0) <= now)
    .sort((a, b) => (a[1].card?.due ?? 0) - (b[1].card?.due ?? 0));
}

// ── Итоги ───────────────────────────────────────────────────────

export function totalMinutes(s) {
  return Object.values(s.days).reduce((a, d) => a + (d.min || 0), 0);
}

export function streak(s, now = new Date()) {
  let n = 0;
  let d = today(now);
  const back = (x) => {
    const t = new Date(Date.parse(x + 'T12:00:00Z') - 864e5);
    return t.toISOString().slice(0, 10);
  };
  if (!(s.days[d]?.min > 0)) d = back(d);
  while (s.days[d]?.min > 0) {
    n++;
    d = back(d);
  }
  return n;
}
