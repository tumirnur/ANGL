// Интерфейс: Сегодня, План, Материалы, Слова, Прогресс и страница занятия.
import { h, mount, toast, sheet, icon, plural } from './ui.js';
import { buildPlan, BOOKS, PHASES, BUFFERS, FILES, START, END, addDays, daysBetween, weekday, fmtDay, fmtDayFull, fmtWd, monthName } from './plan.js';
import * as S from './state.js';
import { review, previewIntervals, Rating } from './fsrs.js';
import { addFiles, onFilesChange, status as fileStatus, loadCachedIndex, cachedCount, pickedCount, forgetCached, storageInfo, displayName } from './files.js';
import { pdfPanel, audioPanel, stopAudio } from './viewer.js';
import { IN_ARTIFACT, cloudLoad, cloudSave, cloudReady } from './sync.js';
import { cloudSync, cloudUser, signIn, signUp, signOut, lastSync } from './cloud.js';
import { speak } from './speech.js';

const P = buildPlan();
let state = S.load();
let cloudOn = false;
const main = document.getElementById('view');

// ── Сохранение ──────────────────────────────────────────────────

let saveTimer = null;
function commit() {
  S.save(state);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => (IN_ARTIFACT ? cloudSave(state) : runSync()), 1500);
}

// Синхронизация вне Claude (GitHub Pages, iPad): через Supabase, когда есть интернет.
let syncing = null;
async function runSync({ quiet = true } = {}) {
  if (IN_ARTIFACT || !cloudUser()) return false;
  if (syncing) return syncing;
  syncing = (async () => {
    try {
      const merged = await cloudSync(state, S.merge);
      if (!merged) return false;
      cloudOn = true;
      const changed = JSON.stringify(merged) !== JSON.stringify(state);
      if (changed) {
        state = S.normalize(merged);
        S.save(state);
        if (!(location.hash || '').startsWith('#l-')) route();
      }
      renderTop(currentTab());
      if (!quiet) toast('Синхронизировано');
      return true;
    } catch (e) {
      cloudOn = false;
      if (!quiet) toast(e.message === 'nologin' ? 'Нужно войти заново' : 'Нет связи с базой — попробую позже');
      return false;
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}
const currentTab = () => {
  const r = (location.hash || '#today').slice(1);
  return r.startsWith('book-') ? 'library' : r.startsWith('l-') ? '' : r;
};

// ── Помощники ───────────────────────────────────────────────────

const now = () => S.today();
const lesson = (id) => P.byId.get(id);
const done = (id) => S.isDone(state, id);
const FIRST_MONDAY = '2026-11-09';
const weekNo = (d) => (d < FIRST_MONDAY ? 0 : Math.floor(daysBetween(FIRST_MONDAY, d) / 7) + 1);
const mondayOf = (d) => addDays(d, -((weekday(d) + 6) % 7));
const SHORT = { ge: 'GE', so: 'SO', p1: 'P1', p2: 'P2', ci: 'AE', misc: 'TEST' };

function unitTag(l) {
  if (l.book === 'misc') return l.unitTitle;
  if (l.book === 'ge' && l.unit === 0) return 'Starter';
  if (typeof l.unit === 'string') return l.unit;
  if (l.unit === 0) return 'Intro';
  return `Юнит ${l.unit}`;
}
const fullTitle = (l) => `${unitTag(l)} · ${l.title}`;
const bookChip = (l) => h('span', { class: `bk ${l.book}`, title: BOOKS[l.book]?.title }, SHORT[l.book] || l.book);
const plannedOf = (id) => P.planned.get(id) || null;

function nextUndone(queue) {
  return P.queues[queue].find((id) => !done(id)) || null;
}
function lagOf(queue, d = now()) {
  let n = 0;
  for (const id of P.queues[queue]) {
    const p = plannedOf(id);
    if (p && p <= d && !done(id)) n++;
  }
  return n;
}
function dueChip(id) {
  const p = plannedOf(id);
  if (!p) return h('span', { class: 'chip' }, 'резерв');
  const d = now();
  if (done(id)) return h('span', { class: 'chip ok' }, `сделано ${fmtDay(state.done[id].at)}`);
  if (p === d) return h('span', { class: 'chip blue' }, 'по плану сегодня');
  if (p < d) {
    const n = daysBetween(p, d);
    return h('span', { class: 'chip warn' }, `по плану ${fmtDay(p)} · на ${n} ${plural(n, 'день', 'дня', 'дней')} позже`);
  }
  return h('span', { class: 'chip' }, `по плану ${fmtDay(p)}`);
}
function cefr(score) {
  if (score == null || score === '') return '';
  const s = Number(score);
  if (s >= 71) return 'C2';
  if (s >= 61) return 'C1';
  if (s >= 51) return 'B2';
  if (s >= 41) return 'B1';
  if (s >= 31) return 'A2';
  return 'A1';
}
const hm = (min) => {
  const m = Math.round(min || 0);
  return m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч ${String(m % 60).padStart(2, '0')} мин`;
};

// ── Навигация ───────────────────────────────────────────────────

const TABS = [
  ['today', 'Сегодня', 'today'],
  ['plan', 'План', 'calendar'],
  ['library', 'Материалы', 'folder'],
  ['words', 'Слова', 'cards'],
  ['progress', 'Прогресс', 'chart'],
];

function renderTop(active) {
  const nav = document.getElementById('nav');
  mount(nav, TABS.map(([id, label, ic]) => h('a', { href: `#${id}`, 'aria-current': active === id ? 'page' : null }, icon(ic, 18), label)));
  const st = document.getElementById('sync');
  if (st) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const text = IN_ARTIFACT ? (cloudOn ? 'сохраняется в Claude' : 'сохраняется в браузере') : offline ? 'без интернета — всё работает' : cloudUser() ? (cloudOn ? 'синхронизировано' : 'синхронизация…') : 'только это устройство';
    mount(st, h('span', { class: `sync-dot${cloudOn && !offline ? ' on' : ''}` }), h('span', null, text));
  }
}

let lessonTimer = null; // { id, start, acc, tick }
let activeStep = {}; // id -> индекс открытого шага
let bookPage = {};

function route() {
  const raw = (location.hash || '').replace(/^#\/?/, '');
  const r = raw || 'today';
  if (!r.startsWith('l-') && lessonTimer) pauseTimer();
  if (!r.startsWith('l-')) stopAudio();
  main.querySelectorAll('.panel.pdf').forEach((p) => p.destroy && p.destroy());
  if (r.startsWith('l-') && lesson(r.slice(2))) {
    renderTop('');
    viewLesson(r.slice(2));
  } else if (r.startsWith('book-') && FILES[r.slice(5)]) {
    renderTop('library');
    viewBook(r.slice(5));
  } else {
    const id = TABS.some(([t]) => t === r) ? r : 'today';
    renderTop(id);
    ({ today: viewToday, plan: viewPlan, library: viewLibrary, words: viewWords, progress: viewProgress })[id]();
  }
  main.focus({ preventScroll: true });
}
const go = (hash) => {
  if (location.hash === `#${hash}`) route();
  else location.hash = hash;
};

// ── Сегодня ─────────────────────────────────────────────────────

function viewToday() {
  const d = now();
  const before = d < START;
  const day = P.days.find((x) => x.date === d);
  const wk = weekNo(d);
  const phase = PHASES.find((p) => p.id === P.phaseOf(d < START ? START : d));
  const minToday = state.days[d]?.min || 0;
  const due = S.dueWords(state).length;
  const lagP = lagOf('paper');
  const lagS = lagOf('site');

  const head = h('div', { class: 'page-head' },
    h('div', null,
      h('div', { class: 'label' }, before ? 'План начинается 7 ноября 2026' : `Неделя ${wk} из 52 · ${phase.title}`),
      h('h1', null, fmtDayFull(d)),
    ),
    h('div', { class: 'btn-row' }, h('a', { class: 'btn ghost', href: '#plan' }, icon('calendar', 18), 'Весь план')),
  );

  const strip = h('div', { class: 'status-strip' },
    h('div', null, h('span', { class: 'v' }, hm(minToday)), h('span', { class: 'k' }, 'сегодня, цель — 1 час')),
    h('div', null, h('span', { class: 'v' }, String(S.streak(state))), h('span', { class: 'k' }, 'дней подряд')),
    h('div', null, h('span', { class: 'v' }, lagP + lagS ? `−${lagP + lagS}` : '0'), h('span', { class: 'k' }, lagP + lagS ? 'занятий позади плана' : 'отставания нет')),
    h('div', null, h('span', { class: 'v' }, String(due)), h('span', { class: 'k' }, plural(due, 'слово', 'слова', 'слов') + ' к повторению')),
  );

  const tasks = [];
  // Стартовые и контрольные занятия.
  for (const l of P.lessons.filter((x) => x.book === 'misc')) {
    const p = plannedOf(l.id);
    if (!done(l.id) && p && (p <= d || (before && p <= addDays(START, 1)))) tasks.push(taskRow(l));
  }
  const paper = nextUndone('paper');
  if (paper) tasks.push(taskRow(lesson(paper)));
  const site = nextUndone('site');
  if (site) tasks.push(taskRow(lesson(site)));
  tasks.push(wordsRow(due));

  const note = day && day.note ? h('div', { class: 'note-line' }, day.note) : null;
  const behind = lagP + lagS > 2 ? h('div', { class: 'note-line' }, `Ты отстаёшь на ${lagP + lagS} ${plural(lagP + lagS, 'занятие', 'занятия', 'занятий')}. Догоняй в воскресенье или делай по одному лишнему занятию в день — план от этого не ломается: сайт всегда показывает следующее несделанное.`) : null;

  const side = h('div', { class: 'stack' },
    h('section', { class: 'box' }, h('div', { class: 'box-head' }, h('h2', null, 'Как устроен день')),
      h('div', { class: 'box-body small' },
        h('p', null, h('strong', null, 'Будни и суббота — 1 час. '), 'Пока идёт Speakout: 30 минут по бумажной книге и 25 минут на сайте. Потом — одно занятие на сайте по 45 минут.'),
        h('p', null, h('strong', null, 'Воскресенье — лёгкий день: '), 'слова и английский для удовольствия.'),
        h('p', null, h('strong', null, 'Слова — 10 минут каждый день.'), ' Новые слова из занятий добавляй в «Слова», сайт сам напомнит повторить.'),
      ),
    ),
    filesHint(),
  );

  mount(main, head, strip, note, behind, h('div', { class: 'cols' },
    h('section', { class: 'box' }, h('div', { class: 'box-head' }, h('h2', null, 'Что делать сегодня'), h('span', { class: 'muted small' }, 'следующие несделанные занятия')), ...tasks),
    side,
  ));
}

function filesHint() {
  const n = pickedCount() + cachedCount();
  if (n > 0) return null;
  return h('section', { class: 'box' }, h('div', { class: 'box-head' }, h('h2', null, 'Файлы не подключены')),
    h('div', { class: 'box-body small' },
      h('p', null, 'Учебники и аудио открываются прямо на сайте с твоего компьютера. Выбери папку один раз — открытые файлы сайт запомнит.'),
      h('a', { class: 'btn', href: '#library' }, icon('folder', 18), 'Подключить файлы'),
    ),
  );
}

function taskRow(l) {
  const isDone = done(l.id);
  const steps = l.steps.filter((s) => s.t === 'task' || s.t === 'pdf' || s.t === 'link').slice(0, 4);
  const mark = h('div', { class: `task-mark${l.paper ? ' paper' : ''}${isDone ? ' done' : ''}` }, isDone ? '✓' : SHORT[l.book]);
  const meta = h('div', { class: 'task-meta' }, bookChip(l), h('span', null, BOOKS[l.book].title), h('span', null, `≈ ${l.min} мин`), dueChip(l.id));
  let side;
  if (l.paper) {
    const min = h('input', { type: 'number', class: 'min-input', id: `min-${l.id}`, min: 1, max: 240, value: l.min, 'aria-label': 'Минут' });
    side = h('div', { class: 'task-side' },
      h('label', { class: 'small muted', for: `min-${l.id}` }, 'минут'), min,
      h('button', { class: 'btn ok', onclick: () => {
        S.markDone(state, l.id, { min: Number(min.value) || l.min });
        commit();
        toast('Занятие по Speakout отмечено');
        route();
      } }, icon('check', 18), 'Сделано'),
    );
  } else {
    side = h('div', { class: 'task-side' }, h('a', { class: 'btn', href: `#l-${l.id}` }, 'Открыть занятие', icon('next', 18)));
  }
  return h('div', { class: 'task' }, mark,
    h('div', { style: { minWidth: 0 } },
      l.paper ? h('div', { class: 'task-title' }, `Speakout · ${fullTitle(l)}`) : h('a', { class: 'task-title', href: `#l-${l.id}`, style: { color: 'inherit', textDecoration: 'none' } }, fullTitle(l)),
      meta,
      h('ul', { class: 'task-steps' }, steps.map((s) => h('li', null, s.label))),
    ),
    side,
  );
}

function wordsRow(due) {
  return h('div', { class: 'task' },
    h('div', { class: 'task-mark' }, 'W'),
    h('div', null,
      h('div', { class: 'task-title' }, 'Повторение слов'),
      h('div', { class: 'task-meta' }, h('span', null, '≈ 10 мин'), h('span', null, due ? `${due} ${plural(due, 'слово ждёт', 'слова ждут', 'слов ждут')} повторения` : 'на сегодня всё повторено')),
    ),
    h('div', { class: 'task-side' }, h('a', { class: `btn${due ? '' : ' ghost'}`, href: '#words' }, due ? 'Повторить' : 'Добавить слова')),
  );
}

// ── Занятие ─────────────────────────────────────────────────────

function startTimer(id) {
  if (lessonTimer && lessonTimer.id === id) {
    if (!lessonTimer.start) lessonTimer.start = Date.now();
    return;
  }
  lessonTimer = { id, start: Date.now(), acc: 0 };
}
function pauseTimer() {
  if (lessonTimer && lessonTimer.start) {
    lessonTimer.acc += Date.now() - lessonTimer.start;
    lessonTimer.start = 0;
  }
}
const timerMs = () => (lessonTimer ? lessonTimer.acc + (lessonTimer.start ? Date.now() - lessonTimer.start : 0) : 0);
const fmtClock = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

function viewLesson(id) {
  const l = lesson(id);
  startTimer(id);
  const isDone = done(id);
  const viewer = h('div', { class: 'viewer' });
  let pdfEl = null;
  let audioEl = null;

  const openStep = (i, scroll) => {
    const s = l.steps[i];
    if (s.t === 'pdf') {
      activeStep[id] = i;
      if (pdfEl && pdfEl.destroy) pdfEl.destroy();
      pdfEl = pdfPanel(s, { onMissing: () => go('library') });
      paintViewer();
    } else if (s.t === 'audio') {
      audioEl = audioPanel(s, { onMissing: () => go('library') });
      paintViewer();
    }
    stepsList.querySelectorAll('.step').forEach((el, j) => el.classList.toggle('active', j === activeStep[id] || (l.steps[j].t === 'audio' && audioEl && j === audioIdx)));
    if (scroll && matchMedia('(max-width: 960px)').matches) viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const audioIdx = l.steps.findIndex((s) => s.t === 'audio');
  function paintViewer() {
    const parts = [];
    if (audioEl) parts.push(audioEl);
    if (pdfEl) parts.push(pdfEl);
    if (!parts.length) parts.push(h('div', { class: 'viewer-empty' }, 'В этом занятии нет файлов: оно по бумажной книге или по ссылке.'));
    mount(viewer, parts);
  }

  const stepsList = h('ol', { class: 'steps' }, l.steps.map((s, i) => stepRow(l, s, i, openStep)));

  const clock = h('span', { class: 't' }, fmtClock(timerMs()));
  const pauseBtn = h('button', { class: 'btn ghost sm', onclick: () => {
    if (lessonTimer.start) pauseTimer();
    else startTimer(id);
    pauseBtn.textContent = lessonTimer.start ? 'Пауза' : 'Продолжить';
  } }, lessonTimer.start ? 'Пауза' : 'Продолжить');
  const tick = setInterval(() => {
    if (!document.body.contains(clock)) return clearInterval(tick);
    clock.textContent = fmtClock(timerMs());
  }, 1000);

  const note = h('textarea', { id: `note-${id}`, placeholder: 'Ошибки, вопросы, что повторить. Сохраняется само.' });
  note.value = state.notes[id]?.text || '';
  note.addEventListener('input', () => {
    S.setNote(state, id, note.value);
    commit();
  });

  const idx = (q) => P.queues[q].indexOf(id);
  const q = l.paper ? 'paper' : P.queues.site.includes(id) ? 'site' : null;
  const nextId = q ? P.queues[q][idx(q) + 1] : null;
  const prevId = q ? P.queues[q][idx(q) - 1] : null;

  const finishBtn = isDone
    ? h('button', { class: 'btn ghost', onclick: () => {
        S.unmark(state, id);
        commit();
        route();
      } }, 'Снять отметку')
    : h('button', { class: 'btn ok', onclick: () => finishSheet(l) }, icon('check', 18), 'Завершить занятие');

  const head = h('div', { class: 'stack' },
    h('div', { class: 'crumbs' }, h('a', { href: '#today' }, 'Сегодня'), '/', h('a', { href: '#plan' }, 'План'), '/', h('span', null, BOOKS[l.book].title)),
    h('div', { class: 'page-head' },
      h('div', null, h('div', { class: 'label' }, `${BOOKS[l.book].title} · ${l.unitTitle}`), h('h1', null, fullTitle(l)), h('div', { class: 'task-meta' }, bookChip(l), h('span', null, `≈ ${l.min} мин`), l.topic ? h('span', null, l.topic) : null, dueChip(id))),
      h('div', { class: 'btn-row' },
        prevId ? h('a', { class: 'btn ghost sm', href: `#l-${prevId}` }, icon('back', 16), 'Предыдущее') : null,
        nextId ? h('a', { class: 'btn ghost sm', href: `#l-${nextId}` }, 'Следующее', icon('next', 16)) : null,
      ),
    ),
  );

  const left = h('div', { class: 'stack' },
    h('section', { class: 'box' }, h('div', { class: 'box-head' }, h('h2', null, 'Шаги'), h('span', { class: 'muted small' }, 'нажми на шаг с файлом, чтобы открыть его')), stepsList),
    h('section', { class: 'box' },
      h('div', { class: 'timer' }, h('div', null, h('div', { class: 'label' }, 'Время занятия'), clock), pauseBtn),
      h('div', { class: 'box-body', style: { borderTop: '1px solid var(--rule)' } },
        h('label', { class: 'field', for: `note-${id}` }, h('span', null, 'Заметки к занятию'), note),
        h('div', { class: 'btn-row' }, finishBtn, h('button', { class: 'btn ghost', onclick: () => addWordSheet(fullTitle(l)) }, icon('plus', 18), 'Слово')),
        isDone ? h('p', { class: 'small muted' }, `Отмечено ${fmtDay(state.done[id].at)}, ${hm(state.done[id].min)}.`, nextId ? [' ', h('a', { href: `#l-${nextId}` }, 'Следующее занятие →')] : null) : null,
      ),
    ),
  );

  mount(main, head, h('div', { class: 'lesson-grid' }, left, viewer));
  const first = activeStep[id] ?? l.steps.findIndex((s) => s.t === 'pdf' && !s.key);
  if (first >= 0) openStep(first, false);
  else paintViewer();
}

function stepRow(l, s, i, openStep) {
  const checked = S.stepDone(state, l.id, i);
  const cb = h('input', { type: 'checkbox', id: `st-${l.id}-${i}`, checked: checked ? true : null, 'aria-label': 'Шаг сделан' });
  const row = h('li', { class: `step${checked ? ' done' : ''}` });
  cb.addEventListener('change', () => {
    const v = S.toggleStep(state, l.id, i);
    row.classList.toggle('done', v);
    commit();
  });
  const kinds = { pdf: s.key ? 'ответы' : 'файл', audio: 'аудио', task: 'задание', link: 'ссылка', score: 'результат' };
  const body = [h('span', { class: `step-kind${s.key ? ' key' : ''}` }, kinds[s.t])];
  if (s.t === 'pdf') {
    const st = fileStatus(s.file);
    body.push(h('button', { class: 'linkbtn step-label', style: { textAlign: 'left' }, onclick: () => openStep(i, true) }, s.label));
    if (st === 'missing') body.push(h('span', { class: 'small muted' }, `не подключён: ${displayName(s.file)}`));
  } else if (s.t === 'audio') {
    body.push(h('button', { class: 'linkbtn step-label', style: { textAlign: 'left' }, onclick: () => openStep(i, true) }, `${s.label} (${s.files.length} ${plural(s.files.length, 'трек', 'трека', 'треков')})`));
  } else if (s.t === 'link') {
    body.push(h('a', { class: 'step-label', href: s.url, target: '_blank', rel: 'noopener' }, s.label, ' ', icon('ext', 14)));
  } else if (s.t === 'score') {
    const cur = state.done[l.id] || {};
    const sc = h('input', { type: 'number', id: `sc-${l.id}`, min: 0, value: cur.score ?? '', placeholder: 'баллы', 'aria-label': 'Баллы' });
    const mx = h('input', { type: 'number', id: `mx-${l.id}`, min: 1, value: cur.max ?? s.max ?? '', placeholder: 'из', 'aria-label': 'Максимум' });
    const save = () => {
      S.setScore(state, l.id, sc.value === '' ? null : Number(sc.value), mx.value === '' ? null : Number(mx.value));
      commit();
    };
    sc.addEventListener('change', save);
    mx.addEventListener('change', save);
    const lvl = l.efset ? h('span', { class: 'chip blue' }) : null;
    body.push(h('span', { class: 'step-label' }, s.label), h('div', { class: 'score' }, sc, h('span', { class: 'muted' }, 'из'), mx, lvl));
    if (lvl) {
      const upd = () => (lvl.textContent = sc.value ? `уровень ${cefr(sc.value)}` : 'уровень —');
      upd();
      sc.addEventListener('input', upd);
    }
  } else {
    body.push(h('span', { class: 'step-label' }, s.label));
  }
  row.append(cb, h('div', { class: 'step-body' }, body));
  return row;
}

function finishSheet(l) {
  const mins = Math.max(1, Math.round(timerMs() / 60000)) || l.min;
  const min = h('input', { type: 'number', id: 'fin-min', min: 1, max: 300, value: Math.min(mins, 240) });
  const body = h('div', { class: 'stack' },
    h('p', null, 'Сколько минут заняло занятие? Таймер уже посчитал, поправь, если нужно.'),
    h('label', { class: 'field', for: 'fin-min' }, h('span', null, 'Минут'), min),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn ok', onclick: () => {
      const cur = state.done[l.id] || {};
      S.markDone(state, l.id, { min: Number(min.value) || l.min, score: cur.score ?? null, max: cur.max ?? null });
      lessonTimer = null;
      commit();
      close();
      toast('Занятие отмечено');
      route();
    } }, 'Отметить сделанным')),
  );
  const close = sheet('Завершить занятие', body);
}

// ── Книга целиком ───────────────────────────────────────────────

function viewBook(key) {
  const units = [];
  const seen = new Set();
  for (const l of P.lessons) {
    const s = l.steps.find((x) => x.t === 'pdf' && x.file === key);
    if (!s) continue;
    const k = `${l.book}-${l.unit}`;
    if (seen.has(k)) continue;
    seen.add(k);
    units.push({ label: unitTag(l), page: s.from, title: l.unitTitle });
  }
  const start = bookPage[key] || 1;
  const panel = pdfPanel({ file: key, from: start, to: null, label: FILES[key].title }, { onMissing: () => go('library') });
  mount(main,
    h('div', { class: 'crumbs' }, h('a', { href: '#library' }, 'Материалы'), '/', h('span', null, FILES[key].title)),
    h('h1', null, FILES[key].title),
    units.length ? h('div', { class: 'units' }, units.map((u) => h('button', { class: 'btn ghost sm', title: u.title, onclick: () => {
      bookPage[key] = u.page;
      route();
    } }, `${u.label} · с. ${u.page}`))) : null,
    panel,
  );
}

// ── План ────────────────────────────────────────────────────────

function viewPlan() {
  const d = now();
  const ms = P.milestones;
  const phaseDates = [
    [START, ms.efset1],
    [addDays(ms.efset1, 1), addDays(ms.p2Start, -1)],
    [ms.p2Start, END],
  ];
  const curPhase = P.phaseOf(d < START ? START : d);
  const phases = h('div', { class: 'phases' }, PHASES.map((p, i) => h('div', { class: `phase${p.id === curPhase ? ' now' : ''}` },
    h('div', { class: 'label' }, p.id === curPhase ? 'сейчас' : i < curPhase - 1 ? 'пройден' : 'дальше'),
    h('h2', null, p.title),
    h('div', { class: 'dates' }, `${fmtDay(phaseDates[i][0])} ${phaseDates[i][0].slice(0, 4)} — ${fmtDay(phaseDates[i][1])} ${phaseDates[i][1].slice(0, 4)}`),
    h('p', { class: 'small' }, p.text),
  )));

  const total = P.lessons.filter((l) => plannedOf(l.id)).length;
  const doneN = P.lessons.filter((l) => plannedOf(l.id) && done(l.id)).length;
  const head = h('div', { class: 'page-head' },
    h('div', null, h('div', { class: 'label' }, '7 ноября 2026 — 6 ноября 2027 · 1 час в день'), h('h1', null, 'План на год'),
      h('p', { class: 'sub' }, `${total} занятий, сделано ${doneN}. Speakout заканчивается ${fmtDay(ms.soEnd)}, Gold Experience — ${fmtDay(ms.geEnd)}, Passages 1 — ${fmtDay(ms.p1End)} 2027.`)),
  );

  // Месяцы → недели (пн–вс).
  const weeks = new Map();
  for (const day of P.days) {
    const m = mondayOf(day.date);
    if (!weeks.has(m)) weeks.set(m, []);
    weeks.get(m).push(day);
  }
  const months = new Map();
  for (const [m, days] of weeks) {
    const mk = (m < START ? START : m).slice(0, 7);
    if (!months.has(mk)) months.set(mk, []);
    months.get(mk).push([m, days]);
  }
  const curMonth = (d < START ? START : d).slice(0, 7);
  const monthEls = [];
  for (const [mk, wks] of months) {
    const ids = wks.flatMap(([, ds]) => ds.flatMap((x) => x.items));
    const dn = ids.filter(done).length;
    const det = h('details', { class: 'month', open: mk === curMonth ? true : null },
      h('summary', null, h('span', null, monthName(`${mk}-01`)), h('span', { class: 'muted small mono' }, `${dn}/${ids.length}`)),
      h('div', { class: 'table-wrap' }, h('table', { class: 'plan' },
        h('thead', null, h('tr', null, h('th', null, 'День'), h('th', null, 'Speakout, бумага'), h('th', null, 'На сайте'))),
        h('tbody', null, wks.flatMap(([m, ds]) => [
          h('tr', null, h('td', { colspan: 3, style: { background: 'var(--paper-2)' } }, h('span', { class: 'label' }, m < FIRST_MONDAY ? 'Старт' : `Неделя ${weekNo(m)}`), ' ', h('span', { class: 'muted small mono' }, `${fmtDay(ds[0].date)} — ${fmtDay(ds[ds.length - 1].date)}`))),
          ...ds.map((x) => dayRow(x, d)),
        ])),
      )),
    );
    monthEls.push(det);
  }
  const reserve = ms.unplanned.length
    ? h('details', { class: 'month' }, h('summary', null, h('span', null, 'Резерв: после 6 ноября 2027'), h('span', { class: 'muted small mono' }, String(ms.unplanned.length))),
        h('div', { class: 'box-body' }, h('p', { class: 'small muted' }, 'Если пойдёшь быстрее плана, эти занятия откроются раньше: сайт всегда предлагает следующее несделанное.'),
          ms.unplanned.map((id) => lessonLi(lesson(id)))))
    : null;

  mount(main, head, phases,
    h('div', { class: 'note-line small' }, 'Даты — ориентир. Если пропустила день, ничего не сдвигай: на странице «Сегодня» всегда следующее несделанное занятие и видно, на сколько отстаёшь. Буферные недели: ', BUFFERS.map((b) => `${b.title.toLowerCase()} (${fmtDay(b.from)} — ${fmtDay(b.to)})`).join(', '), '.'),
    h('div', { class: 'months' }, monthEls, reserve),
  );
  const cur = main.querySelector('tr.today');
  if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center' }), 50);
}

function lessonLi(l) {
  const isDone = done(l.id);
  const inner = l.paper
    ? h('span', null, `Speakout · ${fullTitle(l)}`)
    : h('a', { href: `#l-${l.id}` }, fullTitle(l));
  return h('div', { class: `li${isDone ? ' done' : ''}` }, h('span', { class: 'tick' }, isDone ? '✓' : ''), bookChip(l), inner);
}

function dayRow(x, d) {
  const paper = x.items.filter((id) => lesson(id).paper);
  const site = x.items.filter((id) => !lesson(id).paper);
  const cls = x.date === d ? 'today' : x.kind === 'buffer' || x.kind === 'light' ? 'off' : '';
  return h('tr', { class: cls },
    h('td', { class: 'd' }, `${fmtWd(x.date)} ${fmtDay(x.date)}`),
    h('td', null, paper.map((id) => lessonLi(lesson(id)))),
    h('td', null, site.map((id) => lessonLi(lesson(id))), !x.items.length && x.note ? h('span', { class: 'small muted' }, x.note) : null),
  );
}

// ── Материалы ───────────────────────────────────────────────────

function viewLibrary() {
  const dirInput = h('input', { type: 'file', id: 'pick-dir', webkitdirectory: true, multiple: true, hidden: true });
  const fileInput = h('input', { type: 'file', id: 'pick-files', multiple: true, accept: '.pdf,.mp3,.m4a,.zip,application/zip', hidden: true });
  const onPick = (zips) => async (e) => {
    toast('Читаю файлы…');
    const n = await addFiles(e.target.files, { zips });
    toast(n ? `Подключено файлов: ${n}` : 'Подходящих файлов не нашлось');
    route();
  };
  dirInput.addEventListener('change', onPick(false));
  fileInput.addEventListener('change', onPick(true));
  const drop = h('div', { class: 'drop' },
    h('h2', null, 'Подключить учебники и аудио'),
    h('p', { class: 'small' }, 'На компьютере выбери папку, где лежат файлы, — например, «Загрузки». На iPad нажми «Выбрать файлы» и выбери один архив «Grind English — материалы.zip»: распаковывать его не нужно. Сайт сам найдёт нужные PDF и mp3 по названиям. Файлы никуда не отправляются, они открываются только в этом браузере. Открытые файлы сайт запоминает.'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', onclick: () => dirInput.click() }, icon('folder', 18), 'Выбрать папку'),
      h('button', { class: 'btn ghost', onclick: () => fileInput.click() }, icon('file', 18), 'Выбрать файлы или архив'),
      h('span', { class: 'small muted' }, 'или перетащи папку сюда'),
    ),
    h('p', { class: 'small muted' }, `В этой вкладке: ${pickedCount()} ${plural(pickedCount(), 'файл', 'файла', 'файлов')}. Запомнено в браузере: ${cachedCount()}.`),
    dirInput, fileInput,
  );
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', async (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    const files = await filesFromDrop(e.dataTransfer);
    const n = await addFiles(files);
    toast(n ? `Подключено файлов: ${n}` : 'Подходящих файлов не нашлось');
    route();
  });

  const chip = (st) => st === 'ready' ? h('span', { class: 'chip ok' }, 'найден') : st === 'cached' ? h('span', { class: 'chip blue' }, 'запомнен') : h('span', { class: 'chip warn' }, 'не найден');
  const pdfRows = Object.entries(FILES).map(([k, f]) => h('tr', null,
    h('td', null, h('strong', null, f.title), h('div', { class: 'small muted mono' }, fileStatus(k) === 'missing' ? `ожидаю файл вроде ${f.file}` : displayName(k))),
    h('td', null, chip(fileStatus(k))),
    h('td', null, fileStatus(k) === 'missing' ? null : h('a', { class: 'btn ghost sm', href: `#book-${k}` }, 'Открыть')),
  ));

  // Аудио: сколько треков найдено.
  const sets = [
    ['Gold Experience · аудио к учебнику', P.lessons.filter((l) => l.book === 'ge').flatMap((l) => l.steps.filter((s) => s.t === 'audio' && /SB|учебник|Аудио,|Starter/.test(s.label)).flatMap((s) => s.files))],
    ['Gold Experience · аудио к тетради', P.lessons.filter((l) => l.book === 'ge').flatMap((l) => l.steps.filter((s) => s.t === 'audio' && /тетрад/.test(s.label)).flatMap((s) => s.files))],
    ['Gold Experience · аудио к тестам', P.lessons.filter((l) => l.book === 'ge' || l.book === 'misc').flatMap((l) => l.steps.filter((s) => s.t === 'audio' && /тест/i.test(s.label)).flatMap((s) => s.files))],
  ];
  const tests = P.lessons.filter((l) => l.test).flatMap((l) => l.steps.filter((s) => s.t === 'pdf' && s.file.startsWith('name:')).map((s) => s.file));
  const uniq = (arr) => [...new Set(arr.map((f) => f.name || f))];
  const audioRows = sets.map(([t, files]) => {
    const names = uniq(files);
    const found = names.filter((n) => fileStatus(`name:${n}`) !== 'missing').length;
    return h('tr', null, h('td', null, h('strong', null, t)), h('td', null, h('span', { class: `chip ${found === names.length ? 'ok' : found ? 'blue' : 'warn'}` }, `${found} из ${names.length}`)), h('td', null));
  });
  const tNames = uniq(tests);
  const tFound = tNames.filter((n) => fileStatus(n) !== 'missing').length;
  audioRows.push(h('tr', null, h('td', null, h('strong', null, 'Gold Experience · тесты (PDF)')), h('td', null, h('span', { class: `chip ${tFound === tNames.length ? 'ok' : tFound ? 'blue' : 'warn'}` }, `${tFound} из ${tNames.length}`)), h('td', null)));

  const info = h('p', { class: 'small muted' }, '');
  storageInfo().then((s) => {
    if (s && s.quota) info.textContent = `Браузер хранит ${(s.used / 1e6).toFixed(0)} МБ из доступных ${(s.quota / 1e9).toFixed(1)} ГБ.`;
  });

  mount(main,
    h('div', { class: 'page-head' }, h('div', null, h('div', { class: 'label' }, 'Твои файлы'), h('h1', null, 'Материалы'))),
    drop,
    h('section', { class: 'box' }, h('div', { class: 'box-head' }, h('h2', null, 'Учебники (PDF)')), h('div', { class: 'table-wrap' }, h('table', { class: 'books' }, h('tbody', null, pdfRows)))),
    h('section', { class: 'box' }, h('div', { class: 'box-head' }, h('h2', null, 'Аудио и тесты')), h('div', { class: 'table-wrap' }, h('table', { class: 'books' }, h('tbody', null, audioRows)))),
    h('section', { class: 'box' }, h('div', { class: 'box-head' }, h('h2', null, 'Бумажные книги')),
      h('div', { class: 'box-body small' },
        h('p', null, h('strong', null, 'Speakout Pre-intermediate, 2-е изд.'), ' — учебник, рабочая тетрадь с ключами, диски. Занятия по ней отмечаются на странице «Сегодня».'),
        h('p', null, h('strong', null, 'Логвина А. А. «Английский язык. Наглядный справочник».'), ' Открывай, когда правило в учебнике непонятно.'),
      ),
    ),
    h('section', { class: 'box' }, h('div', { class: 'box-head' }, h('h2', null, 'Хранилище')),
      h('div', { class: 'box-body' }, info, h('div', { class: 'btn-row' }, h('button', { class: 'btn ghost sm', onclick: () => {
        const close = sheet('Забыть файлы', h('div', { class: 'stack' }, h('p', null, 'Сайт удалит копии файлов из браузера. Сами файлы на компьютере останутся. Отметки и слова не пострадают.'),
          h('div', { class: 'btn-row' }, h('button', { class: 'btn', onclick: async () => {
            await forgetCached();
            close();
            toast('Копии файлов удалены из браузера');
            route();
          } }, 'Удалить копии'), h('button', { class: 'btn ghost', onclick: () => close() }, 'Отмена'))));
      } }, icon('trash', 16), 'Забыть сохранённые файлы'))),
    ),
  );
}

async function filesFromDrop(dt) {
  const out = [];
  const items = [...(dt.items || [])].map((i) => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  if (!items.length) return [...(dt.files || [])];
  const walk = async (entry) => {
    if (entry.isFile) {
      await new Promise((res) => entry.file((f) => (out.push(f), res()), res));
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      for (;;) {
        const batch = await new Promise((res) => reader.readEntries(res, () => res([])));
        if (!batch.length) break;
        for (const e of batch) await walk(e);
      }
    }
  };
  for (const e of items) await walk(e);
  return out;
}

// ── Слова ───────────────────────────────────────────────────────

function addWordSheet(src = '') {
  const en = h('input', { type: 'text', id: 'w-en', placeholder: 'hang out', autocomplete: 'off' });
  const ru = h('input', { type: 'text', id: 'w-ru', placeholder: 'тусоваться, проводить время', autocomplete: 'off' });
  const ex = h('input', { type: 'text', id: 'w-ex', placeholder: 'We usually hang out at the skate park.', autocomplete: 'off' });
  const save = (again) => {
    if (!en.value.trim() || !ru.value.trim()) return toast('Нужны слово и перевод');
    S.addWord(state, { en: en.value, ru: ru.value, ex: ex.value, src });
    commit();
    toast(`Добавлено: ${en.value.trim()}`);
    if (again) {
      en.value = ru.value = ex.value = '';
      en.focus();
    } else {
      close();
      if ((location.hash || '').includes('words')) route();
    }
  };
  const form = h('form', { class: 'stack', onsubmit: (e) => {
    e.preventDefault();
    save(true);
  } },
    h('label', { class: 'field', for: 'w-en' }, h('span', null, 'Слово или фраза'), en),
    h('label', { class: 'field', for: 'w-ru' }, h('span', null, 'Перевод'), ru),
    h('label', { class: 'field', for: 'w-ex' }, h('span', null, 'Пример (можно из учебника)'), ex),
    src ? h('p', { class: 'small muted' }, `Источник: ${src}`) : null,
    h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'submit' }, 'Добавить и ещё'), h('button', { class: 'btn ghost', type: 'button', onclick: () => save(false) }, 'Добавить и закрыть')),
  );
  const close = sheet('Новое слово', form);
}

let reviewMode = false;
function viewWords() {
  const due = S.dueWords(state);
  const all = S.liveWords(state).sort((a, b) => (b[1].u || 0) - (a[1].u || 0));
  const head = h('div', { class: 'page-head' },
    h('div', null, h('div', { class: 'label' }, 'Интервальное повторение'), h('h1', null, 'Слова'),
      h('p', { class: 'sub' }, `${all.length} ${plural(all.length, 'слово', 'слова', 'слов')} в словаре, ${due.length} к повторению сейчас.`)),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn', onclick: () => addWordSheet('') }, icon('plus', 18), 'Добавить слово')),
  );

  let reviewBox;
  if (due.length) {
    const [id, w] = due[0];
    let shown = false;
    const face = h('div', { class: 'card-face' });
    const grades = h('div', { class: 'grades', hidden: true });
    const iv = previewIntervals(w.card);
    const ivText = (n) => (n < 1 ? '10 мин' : `${n} ${plural(n, 'день', 'дня', 'дней')}`);
    const grade = (g) => {
      const r = review(w.card, g);
      S.updateWord(state, id, { card: r.card });
      S.addMinutes(state, now(), 0.25);
      commit();
      route();
    };
    [[Rating.Again, 'Снова', 'again'], [Rating.Hard, 'Трудно', ''], [Rating.Good, 'Помню', ''], [Rating.Easy, 'Легко', '']].forEach(([g, t, c]) =>
      grades.append(h('button', { class: c, onclick: () => grade(g) }, t, h('span', null, ivText(iv[g])))));
    const paint = () => mount(face,
      h('div', { class: 'w' }, w.en),
      h('button', { class: 'btn ghost sm', onclick: () => speak(w.en, { accent: 'us' }) }, icon('speaker', 16), 'Произнести'),
      shown ? [h('div', { class: 't' }, w.ru), w.ex ? h('div', { class: 'muted' }, w.ex) : null] : h('button', { class: 'btn', onclick: () => {
        shown = true;
        grades.hidden = false;
        paint();
      } }, 'Показать перевод'),
    );
    paint();
    reviewBox = h('section', { class: 'box' }, h('div', { class: 'box-head' }, h('h2', null, 'Повторение'), h('span', { class: 'muted small mono' }, `осталось ${due.length}`)), face, grades);
  } else {
    reviewBox = h('section', { class: 'box' }, h('div', { class: 'box-body' }, h('p', null, all.length ? 'На сейчас всё повторено. Следующие слова появятся по расписанию.' : 'Словарь пуст. Добавляй слова из занятий: кнопка «Слово» есть на странице каждого занятия.')));
  }

  const search = h('input', { type: 'search', id: 'w-search', placeholder: 'Поиск по словарю' });
  const tbody = h('tbody');
  const paintList = () => {
    const q = search.value.trim().toLowerCase();
    mount(tbody, all.filter(([, w]) => !q || w.en.toLowerCase().includes(q) || w.ru.toLowerCase().includes(q)).slice(0, 300).map(([id, w]) => h('tr', null,
      h('td', null, h('strong', null, w.en), w.ex ? h('div', { class: 'small muted' }, w.ex) : null),
      h('td', null, w.ru),
      h('td', { class: 'small muted' }, w.card?.due ? (w.card.due <= Date.now() ? 'сейчас' : fmtDay(new Date(w.card.due).toISOString().slice(0, 10))) : 'новое'),
      h('td', null, h('button', { class: 'icon-btn', 'aria-label': `Удалить ${w.en}`, onclick: () => {
        S.deleteWord(state, id);
        commit();
        toast(`Удалено: ${w.en}`);
        route();
      } }, icon('trash', 16))),
    )));
  };
  search.addEventListener('input', paintList);
  paintList();

  mount(main, head, h('div', { class: 'cols' }, reviewBox,
    h('section', { class: 'box' }, h('div', { class: 'box-head' }, h('h2', null, 'Как это работает')), h('div', { class: 'box-body small' },
      h('p', null, 'Сайт показывает слово тогда, когда ты вот-вот его забудешь (алгоритм FSRS). Чем лучше помнишь, тем реже оно приходит.'),
      h('p', null, '«Снова» — не вспомнила, «Трудно» — вспомнила с усилием, «Помню» — обычный ответ, «Легко» — мгновенно.'),
    ))),
    all.length ? h('section', { class: 'box' }, h('div', { class: 'box-head' }, h('h2', null, 'Словарь'), h('div', { style: { width: 'min(320px, 60%)' } }, search)),
      h('div', { class: 'table-wrap' }, h('table', { class: 'words' }, h('thead', null, h('tr', null, h('th', null, 'Слово'), h('th', null, 'Перевод'), h('th', null, 'Повтор'), h('th', null, ''))), tbody))) : null,
  );
}

// ── Прогресс ────────────────────────────────────────────────────

function viewProgress() {
  const d = now();
  const total = S.totalMinutes(state);
  const books = ['so', 'ge', 'p1', 'ci', 'p2'];
  const bars = books.map((b) => {
    const ls = P.lessons.filter((l) => l.book === b);
    const dn = ls.filter((l) => done(l.id)).length;
    return h('div', { class: 'bar-row' }, h('span', null, BOOKS[b].title), h('div', { class: 'bar' }, h('i', { style: { width: `${(dn / ls.length) * 100}%` } })), h('span', { class: 'mono small' }, `${dn}/${ls.length}`));
  });

  // Последние 12 недель.
  const mon = mondayOf(d);
  const wk = [];
  for (let i = 11; i >= 0; i--) {
    const m = addDays(mon, -7 * i);
    let min = 0;
    for (let j = 0; j < 7; j++) min += state.days[addDays(m, j)]?.min || 0;
    wk.push({ m, min });
  }
  const max = Math.max(390, ...wk.map((w) => w.min));
  const weeks = h('div', { class: 'weeks', role: 'img', 'aria-label': 'Минуты занятий по неделям' }, wk.map((w) => h('div', { title: `${fmtDay(w.m)}: ${hm(w.min)}` },
    h('i', { style: { height: `${(w.min / max) * 100}%` } }),
    h('span', null, fmtDay(w.m).replace(/ .*/, '') + '.' + w.m.slice(5, 7)),
  )));

  const tests = P.lessons.filter((l) => l.test || l.efset).filter((l) => state.done[l.id] && (state.done[l.id].score != null || !state.done[l.id].undone));
  const testRows = tests.map((l) => {
    const r = state.done[l.id];
    const pct = r.score != null && r.max ? Math.round((r.score / r.max) * 100) : null;
    return h('tr', null, h('td', null, fullTitle(l), h('div', { class: 'small muted' }, BOOKS[l.book].title)), h('td', { class: 'mono' }, r.score != null ? `${r.score}${r.max ? ` / ${r.max}` : ''}` : '—'),
      h('td', null, l.efset && r.score != null ? h('span', { class: 'chip blue' }, cefr(r.score)) : pct != null ? h('span', { class: `chip ${pct >= 80 ? 'ok' : pct >= 60 ? '' : 'warn'}` }, `${pct}%`) : null),
      h('td', { class: 'small muted' }, r.at ? fmtDay(r.at) : ''));
  });

  mount(main,
    h('div', { class: 'page-head' }, h('div', null, h('div', { class: 'label' }, 'Итоги'), h('h1', null, 'Прогресс'))),
    h('div', { class: 'status-strip' },
      h('div', null, h('span', { class: 'v' }, `${Math.floor(total / 60)} ч`), h('span', { class: 'k' }, 'всего занятий')),
      h('div', null, h('span', { class: 'v' }, String(P.lessons.filter((l) => done(l.id)).length)), h('span', { class: 'k' }, 'занятий сделано')),
      h('div', null, h('span', { class: 'v' }, String(S.streak(state))), h('span', { class: 'k' }, 'дней подряд')),
      h('div', null, h('span', { class: 'v' }, String(S.liveWords(state).length)), h('span', { class: 'k' }, 'слов в словаре')),
    ),
    h('div', { class: 'cols' },
      h('section', { class: 'box' }, h('div', { class: 'box-head' }, h('h2', null, 'Минуты по неделям'), h('span', { class: 'muted small' }, 'цель ≈ 6,5 ч в неделю')), h('div', { class: 'box-body' }, weeks)),
      h('section', { class: 'box' }, h('div', { class: 'box-head' }, h('h2', null, 'По книгам')), h('div', { class: 'box-body bars' }, bars)),
    ),
    h('section', { class: 'box' }, h('div', { class: 'box-head' }, h('h2', null, 'Тесты и EF SET')),
      testRows.length
        ? h('div', { class: 'table-wrap' }, h('table', { class: 'words' }, h('thead', null, h('tr', null, h('th', null, 'Тест'), h('th', null, 'Баллы'), h('th', null, 'Итог'), h('th', null, 'Дата'))), h('tbody', null, testRows)))
        : h('div', { class: 'box-body small muted' }, 'Результаты появятся после первого теста. Начни с диагностики Gold Experience и EF SET в первые выходные.'),
    ),
    IN_ARTIFACT ? h('p', { class: 'small muted' }, cloudOn ? 'Отметки и слова сохраняются в Claude и видны на всех твоих устройствах.' : 'Сохранение в Claude недоступно: отметки хранятся только в этом браузере.') : syncBox(),
  );
}

function syncBox() {
  const u = cloudUser();
  const body = h('div', { class: 'box-body' });
  if (u) {
    const ls = lastSync();
    body.append(
      h('p', null, 'Вход выполнен: ', h('strong', null, u.email), '. Отметки, слова и время синхронизируются между устройствами, когда есть интернет. Без интернета всё работает и сохраняется на устройстве.'),
      h('p', { class: 'small muted' }, ls ? `Последняя синхронизация: ${new Date(ls).toLocaleString('ru-RU')}` : 'Ещё не синхронизировалось.'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', onclick: () => runSync({ quiet: false }) }, icon('sync', 18), 'Синхронизировать'),
        h('button', { class: 'btn ghost', onclick: () => {
          signOut();
          cloudOn = false;
          toast('Вышла из аккаунта. Данные на устройстве остались');
          route();
        } }, 'Выйти'),
      ),
    );
  } else {
    const email = h('input', { type: 'text', id: 'sb-email', inputmode: 'email', autocomplete: 'email', placeholder: 'почта' });
    const pass = h('input', { type: 'password', id: 'sb-pass', autocomplete: 'current-password', placeholder: 'пароль, от 6 символов', class: 'pw' });
    const msg = h('p', { class: 'small muted' }, 'Один аккаунт на Mac, iPad и телефоне — и прогресс везде одинаковый. Без входа всё хранится только на этом устройстве.');
    const act = (fn) => async () => {
      if (!email.value.trim() || pass.value.length < 6) return (msg.textContent = 'Нужны почта и пароль от 6 символов.');
      msg.textContent = 'Подключаюсь…';
      try {
        const r = await fn(email.value.trim(), pass.value);
        if (r && r.needsConfirm) return (msg.textContent = 'Аккаунт создан. Открой письмо от Supabase, нажми ссылку подтверждения и потом «Войти».');
        await runSync({ quiet: false });
        route();
      } catch (e) {
        msg.textContent = e.message === 'Failed to fetch' ? 'Нет интернета. Войти можно, когда появится сеть.' : e.message;
      }
    };
    body.append(msg,
      h('div', { class: 'form-row' }, h('label', { class: 'field', for: 'sb-email' }, h('span', null, 'Почта'), email), h('label', { class: 'field', for: 'sb-pass' }, h('span', null, 'Пароль'), pass)),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn', onclick: act(signIn) }, 'Войти'), h('button', { class: 'btn ghost', onclick: act(signUp) }, 'Создать аккаунт')),
    );
  }
  return h('section', { class: 'box' }, h('div', { class: 'box-head' }, h('h2', null, 'Синхронизация между устройствами')), body);
}

// ── Запуск ──────────────────────────────────────────────────────

window.addEventListener('hashchange', route);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseTimer();
  else if (lessonTimer && (location.hash || '').startsWith('#l-')) startTimer(lessonTimer.id);
});
onFilesChange(() => {
  const r = location.hash || '';
  if (r === '#library') route();
});

route();
loadCachedIndex().then((n) => {
  if (n) route();
});
window.addEventListener('online', () => {
  renderTop(currentTab());
  runSync();
});
window.addEventListener('offline', () => renderTop(currentTab()));
if (!IN_ARTIFACT) runSync();
(async () => {
  if (!IN_ARTIFACT) return;
  const remote = await cloudLoad();
  cloudOn = await cloudReady();
  if (remote) {
    const merged = S.merge(state, remote);
    const changed = JSON.stringify(merged) !== JSON.stringify(state);
    state = merged;
    S.save(state);
    if (changed) cloudSave(state);
    if (changed && !(location.hash || '').startsWith('#l-')) route();
  } else if (cloudOn) {
    cloudSave(state);
  }
  renderTop(TABS.find(([t]) => (location.hash || '#today').slice(1) === t)?.[0] || '');
})();
