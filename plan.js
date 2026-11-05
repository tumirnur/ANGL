// Материалы, занятия и расписание на год.
// Тексты учебников здесь не хранятся: занятие ссылается на страницы и треки
// в файлах, которые лежат у тебя на компьютере, а сайт открывает их сам.

export const START = '2026-11-07';
export const END = '2027-11-06';

// ── Даты (строки YYYY-MM-DD, арифметика в UTC) ──────────────────

const toMs = (d) => Date.parse(d + 'T00:00:00Z');
const fromMs = (ms) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d, n) => fromMs(toMs(d) + n * 864e5);
export const daysBetween = (a, b) => Math.round((toMs(b) - toMs(a)) / 864e5);
export const weekday = (d) => new Date(toMs(d)).getUTCDay(); // 0 = вс
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
export const fmtDay = (d) => `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
export const fmtDayFull = (d) => `${WD[weekday(d)]}, ${fmtDay(d)} ${d.slice(0, 4)}`;
export const fmtWd = (d) => WD[weekday(d)];
export const monthName = (d) => `${MONTHS_NOM[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

// ── Файлы ────────────────────────────────────────────────────────

// Как найти файл среди выбранных: по шаблону имени (без учёта регистра).
export const FILES = {
  'ge-sb': { title: 'Gold Experience A2+ · Student’s Book', file: 'gold_experience_a2_students_book.pdf', match: /gold.?experience.?a2.*student|gold_exp.*_sb\b/i, kind: 'pdf' },
  'ge-wb': { title: 'Gold Experience A2+ · Workbook', file: 'gold_experience_a2_workbook.pdf', match: /gold.?experience.?a2.*work.?book/i, kind: 'pdf' },
  'ge-tb': { title: 'Gold Experience A2+ · Teacher’s Book', file: 'gold_experience_a2_teachers_book.pdf', match: /gold.?experience.?a2.*teacher/i, kind: 'pdf' },
  'ge-key': { title: 'Gold Experience A2+ · ключи к тестам', file: 'Gold_Exp_A2P_Tests_AnswerKey.pdf', match: /^gold_exp_a2p_tests_answerkey\.pdf$/i, kind: 'pdf' },
  'ge-vs': { title: 'Gold Experience A2+ · тексты видео', file: 'Gold_Exp_A2P_Videoscript.pdf', match: /^gold_exp_a2p_videoscript\.pdf$/i, kind: 'pdf' },
  'ge-tscript': { title: 'Gold Experience A2+ · тексты аудио к тестам', file: 'Gold_Exp_A2P_Tests_Audioscript.pdf', match: /^gold_exp_a2p_tests_audioscript\.pdf$/i, kind: 'pdf' },
  p1: { title: 'Passages 1 · Student’s Book', file: 'Passages_1_SB.pdf', match: /passages.?1/i, kind: 'pdf' },
  p2: { title: 'Passages 2 · Student’s Book', file: 'Passages_2_SB.pdf', match: /passages.?2/i, kind: 'pdf' },
  ci: { title: 'Cambridge Academic English · Intermediate', file: 'Cambridge_Academic_English_Intermediate.pdf', match: /academic.?english.?intermediate/i, kind: 'pdf' },
  cu: { title: 'Cambridge Academic English · Upper Intermediate', file: 'Cambridge_Academic_English_Upper_Intermediate.pdf', match: /academic.?english.?upper/i, kind: 'pdf' },
};

// Файл с точным именем (тесты, аудио).
export const named = (name) => `name:${name}`;

// ── Gold Experience A2+ ─────────────────────────────────────────

const GE_UNITS = [
  { n: 0, title: 'Starter: All about me', grammar: 'this/that, be, present и past simple, местоимения, can, повелительное наклонение', vocab: 'предметы и вещи' },
  { n: 1, title: 'There’s no place like home', grammar: 'артикли; some, any, much, many, a few, a lot of', vocab: 'город: места и здания' },
  { n: 2, title: 'Try something different', grammar: 'present simple и continuous; вопросы к подлежащему и дополнению', vocab: 'сочетания: practise, improve' },
  { n: 3, title: 'Read all about it', grammar: 'past simple и continuous; someone, anything, nothing', vocab: 'прилагательные, сильные прилагательные, порядок прилагательных' },
  { n: 4, title: 'Live and learn', grammar: 'будущее: going to, present continuous, will, may, might', vocab: 'способы учиться' },
  { n: 5, title: 'Get the look!', grammar: 'сравнения; as … as; too, enough', vocab: 'внешность' },
  { n: 6, title: 'The great outdoors', grammar: 'модальные глаголы для правил; возвратные местоимения; it’s, there is', vocab: 'животные' },
  { n: 7, title: 'Food for thought', grammar: 'who, which; наречия образа действия', vocab: 'еда' },
  { n: 8, title: 'Getting away', grammar: 'present perfect, for и since', vocab: 'путешествия и транспорт' },
  { n: 9, title: 'What’s your idea of fun?', grammar: 'условные 0 и 1 типа; -ing и to-infinitive', vocab: 'развлечения и технологии' },
  { n: 10, title: 'Let’s celebrate!', grammar: 'повторение в формате экзамена B1 Preliminary', vocab: 'праздники' },
];

// Номера треков в папках с аудио: от и до (00 — заставка, её пропускаем).
const SB_TRACKS = { 0: [1, 2], 1: [1, 12], 2: [1, 12], 3: [1, 10], 4: [1, 13], 5: [1, 11], 6: [1, 13], 7: [1, 11], 8: [1, 12], 9: [1, 8], 10: [1, 4] };
const WB_TRACKS = { 0: [1, 2], 1: [1, 5], 2: [1, 7], 3: [1, 7], 4: [1, 8], 5: [1, 6], 6: [1, 9], 7: [1, 6], 8: [1, 9], 9: [1, 8], 10: [1, 9] };
const pad2 = (n) => String(n).padStart(2, '0');
const pad3 = (n) => String(n).padStart(3, '0');

export function geTracks(set, u) {
  const [a, b] = (set === 'wb' ? WB_TRACKS : SB_TRACKS)[u];
  const out = [];
  for (let i = a; i <= b; i++) {
    let name;
    if (set === 'wb') name = u === 0 ? `Gold_Exp_2e_A2P_WB_S_${pad3(i)}.mp3` : `Gold_Exp_2e_A2P_WB_${u}_${pad2(i)}.mp3`;
    else name = u === 0 ? `Gold_Exp_2e_A2P_S${pad2(i)}.mp3` : `Gold_Exp_2e_A2P_${u}_${pad2(i)}.mp3`;
    out.push({ name, label: `${u === 0 ? 'S' : u}.${i}` });
  }
  return out;
}

// Страница книги учителя с ответами к странице учебника (по ссылкам «SB p…» в книге учителя).
const TB_FOR_SB = {
  6: 5, 9: 8, 10: 9, 11: 10, 12: 11, 13: 12, 14: 13, 15: 15, 16: 16, 18: 18, 19: 19,
  21: 20, 22: 21, 24: 22, 25: 24, 26: 25, 27: 26, 28: 28, 30: 29, 31: 31,
  33: 32, 34: 33, 36: 35, 37: 36, 38: 37, 39: 39, 40: 40, 42: 42, 43: 44,
  45: 45, 46: 46, 48: 48, 49: 49, 50: 51, 51: 52, 52: 53, 54: 55, 55: 57,
  57: 58, 58: 59, 60: 61, 61: 62, 62: 64, 63: 66, 64: 67, 66: 69, 67: 70,
  69: 71, 70: 72, 72: 74, 73: 76, 74: 77, 75: 79, 76: 81, 78: 83, 79: 84,
  81: 85, 82: 86, 84: 87, 85: 89, 86: 90, 87: 92, 88: 93, 90: 95, 91: 97,
  93: 98, 94: 99, 96: 101, 97: 102, 98: 104, 99: 105, 100: 107, 102: 109, 103: 111,
  105: 112, 106: 113, 108: 115, 109: 116, 110: 118, 111: 119, 112: 121, 114: 123, 115: 124,
  117: 125, 118: 126, 120: 127, 121: 129, 122: 130,
};
const tb = (sbPage) => TB_FOR_SB[sbPage] ?? null;

// Страницы рабочей тетради: начало юнита (8 страниц), обзоры после 3, 6, 9.
const WB_START = { 0: 5, 1: 7, 2: 15, 3: 23, 4: 33, 5: 41, 6: 49, 7: 59, 8: 67, 9: 75 };
const WB_REVIEW = { 3: 31, 6: 57, 9: 83 };
// Страницы файла с ключами к тестам.
const KEY_PAGES = { diag: [1, 2], 1: [2, 3], 2: [3, 4], 3: [4, 6], 4: [6, 7], 5: [7, 8], 6: [8, 10], 7: [10, 11], 8: [11, 13], 9: [13, 14], r3: [15, 16], r6: [16, 17], r9: [18, 19], eoy: [19, 22] };

const WI = { t: 'link', url: 'https://writeandimprove.com/', label: 'Проверить текст в Write & Improve (Cambridge, бесплатно)' };

function geUnitLessons(U) {
  const u = U.n;
  const s = 9 + 12 * (u - 1);
  const gf = 126 + 2 * (u - 1);
  const w = WB_START[u];
  const sbAudio = { t: 'audio', files: geTracks('sb', u), label: `Аудио к учебнику, юнит ${u}` };
  const wbAudio = { t: 'audio', files: geTracks('wb', u), label: `Аудио к рабочей тетради, юнит ${u}` };
  const key = (from, to = from, label = 'Ответы и тексты аудио — книга учителя') => ({ t: 'pdf', file: 'ge-tb', from, to, key: true, label });
  const id = (k) => `ge-${u}-${k}`;
  const base = { book: 'ge', unit: u, unitTitle: U.title, min: 25 };
  const L = [
    { ...base, id: id('read'), title: 'Чтение', steps: [
      { t: 'pdf', file: 'ge-sb', from: s, to: s + 2, label: `Учебник, с. ${s}–${s + 2}: вступление и чтение` },
      sbAudio,
      { t: 'task', label: 'Новые слова из текста — в раздел «Слова» (5–10 штук)' },
      key(tb(s), tb(s + 1) ?? tb(s) + 1),
    ] },
    { ...base, id: id('gram1'), title: 'Грамматика 1', topic: U.grammar, steps: [
      { t: 'pdf', file: 'ge-sb', from: s + 3, to: s + 3, label: `Учебник, с. ${s + 3}: грамматика` },
      { t: 'pdf', file: 'ge-sb', from: gf, to: gf, label: `Grammar file, с. ${gf}: правило и упражнения` },
      { t: 'task', label: 'Непонятно — открой ту же тему в справочнике Логвиной или у Бебриса' },
      key(tb(s + 3)),
    ] },
    { ...base, id: id('vocab'), title: 'Лексика', topic: U.vocab, steps: [
      { t: 'pdf', file: 'ge-sb', from: s + 4, to: s + 4, label: `Учебник, с. ${s + 4}: лексика` },
      sbAudio,
      { t: 'task', label: 'Слова юнита — в раздел «Слова»' },
      key(tb(s + 4)),
    ] },
    { ...base, id: id('listen'), title: 'Аудирование и грамматика 2', steps: [
      { t: 'pdf', file: 'ge-sb', from: s + 5, to: s + 5, label: `Учебник, с. ${s + 5}: аудирование и грамматика` },
      sbAudio,
      { t: 'task', label: 'Сначала слушай без текста. Потом сверься с текстом в книге учителя' },
      { t: 'pdf', file: 'ge-sb', from: gf + 1, to: gf + 1, label: `Grammar file, с. ${gf + 1}` },
      key(tb(s + 5), tb(s + 5) + 1),
    ] },
    { ...base, id: id('speak'), title: 'Говорение', steps: [
      { t: 'pdf', file: 'ge-sb', from: s + 6, to: s + 6, label: `Учебник, с. ${s + 6}: говорение` },
      sbAudio,
      { t: 'task', label: 'Ответь на задания вслух и запиши себя на телефон (1–2 минуты). Переслушай' },
      key(tb(s + 6)),
    ] },
    { ...base, id: id('write'), title: 'Письмо', steps: [
      { t: 'pdf', file: 'ge-sb', from: s + 7, to: s + 8, label: `Учебник, с. ${s + 7}–${s + 8}: письмо` },
      { t: 'task', label: 'Напиши текст по заданию (около 100 слов)' },
      WI,
      key(tb(s + 6) + 1, tb(s + 6) + 2),
    ] },
    { ...base, id: id('check'), title: 'Видео и Unit check', steps: [
      { t: 'pdf', file: 'ge-sb', from: s + 9, to: s + 11, label: `Учебник, с. ${s + 9}–${s + 11}: Switch on и Unit check` },
      { t: 'pdf', file: 'ge-vs', from: 1, to: null, label: 'Видео нет — прочитай текст ролика' },
      sbAudio,
      key(tb(s + 9), tb(s + 11) ?? tb(s + 10) ?? tb(s + 9) + 1),
    ] },
    { ...base, id: id('wb1'), title: 'Рабочая тетрадь: чтение, грамматика, лексика', steps: [
      { t: 'pdf', file: 'ge-wb', from: w, to: w + 3, label: `Тетрадь, с. ${w}–${w + 3}` },
      wbAudio,
      { t: 'task', label: 'Ответов к тетради нет. Сомнительные места отметь в заметке к занятию' },
    ] },
    { ...base, id: id('wb2'), title: 'Рабочая тетрадь: аудирование, говорение, письмо', steps: [
      { t: 'pdf', file: 'ge-wb', from: w + 4, to: w + 7, label: `Тетрадь, с. ${w + 4}–${w + 7}` },
      wbAudio,
      { t: 'pdf', file: 'ge-wb', from: 102, to: 110, label: 'Тексты аудио к тетради, с. 102–110' },
    ] },
    { ...base, id: id('test'), title: 'Тест по юниту', min: 35, test: true, steps: [
      { t: 'pdf', file: named(`Gold_Exp_A2P_U${u}_Lang_Test_A.pdf`), from: 1, to: null, label: 'Language test A (грамматика и лексика)' },
      { t: 'pdf', file: named(`Gold_Exp_A2P_U${u}_Skills_Test_A.pdf`), from: 1, to: null, label: 'Skills test A (чтение, аудирование, письмо)' },
      { t: 'audio', files: [
        { name: `Gold_Exp_A2P_Test_U${u}_List.mp3`, label: 'Listening' },
        { name: `Gold_Exp_A2P_Test_U${u}_Dict.mp3`, label: 'Dictation' },
      ], label: 'Аудио к тесту' },
      { t: 'pdf', file: 'ge-key', from: KEY_PAGES[u][0], to: KEY_PAGES[u][1], key: true, label: 'Ключи к тестам' },
      { t: 'score', label: 'Результат' },
    ] },
  ];
  if (WB_REVIEW[u]) {
    const r = WB_REVIEW[u];
    const tag = `${u - 2}to${u}`;
    L.push({ ...base, id: `ge-r${u}`, title: `Повторение юнитов ${u - 2}–${u}`, min: 40, test: true, steps: [
      { t: 'pdf', file: 'ge-wb', from: r, to: r + 1, label: `Тетрадь, с. ${r}–${r + 1}: Review` },
      { t: 'pdf', file: named(`Gold_Exp_A2P_U${tag}_Review_Lang_Test_A.pdf`), from: 1, to: null, label: 'Обзорный тест A' },
      { t: 'pdf', file: named(`Gold_Exp_A2P_U${tag}_Review_Writing.pdf`), from: 1, to: null, label: 'Письменное задание' },
      { t: 'pdf', file: 'ge-key', from: KEY_PAGES[`r${u}`][0], to: KEY_PAGES[`r${u}`][1], key: true, label: 'Ключи к тестам' },
      { t: 'score', label: 'Результат' },
    ] });
  }
  return L;
}

function geLessons() {
  const S = GE_UNITS[0];
  const starter = { book: 'ge', unit: 0, unitTitle: S.title, min: 25 };
  const out = [
    { ...starter, id: 'ge-0-sb', title: 'Учебник', topic: S.grammar, steps: [
      { t: 'pdf', file: 'ge-sb', from: 5, to: 8, label: 'Учебник, с. 5–8' },
      { t: 'audio', files: geTracks('sb', 0), label: 'Аудио Starter' },
      { t: 'pdf', file: 'ge-sb', from: 124, to: 125, label: 'Grammar file, с. 124–125' },
      { t: 'pdf', file: 'ge-tb', from: 5, to: 7, key: true, label: 'Ответы — книга учителя' },
    ] },
    { ...starter, id: 'ge-0-wb', title: 'Рабочая тетрадь', steps: [
      { t: 'pdf', file: 'ge-wb', from: 5, to: 6, label: 'Тетрадь, с. 5–6' },
      { t: 'audio', files: geTracks('wb', 0), label: 'Аудио к тетради' },
    ] },
  ];
  for (let u = 1; u <= 9; u++) out.push(...geUnitLessons(GE_UNITS[u]));
  const T = GE_UNITS[10];
  const b10 = { book: 'ge', unit: 10, unitTitle: T.title, min: 30 };
  const a10 = { t: 'audio', files: geTracks('sb', 10), label: 'Аудио, юнит 10' };
  const w10 = { t: 'audio', files: geTracks('wb', 10), label: 'Аудио к тетради, юнит 10' };
  out.push(
    { ...b10, id: 'ge-10-read', title: 'Юнит 10: чтение', steps: [
      { t: 'pdf', file: 'ge-sb', from: 117, to: 119, label: 'Учебник, с. 117–119' },
      { t: 'pdf', file: 'ge-tb', from: 125, to: 126, key: true, label: 'Ответы — книга учителя' },
    ] },
    { ...b10, id: 'ge-10-listen', title: 'Юнит 10: аудирование и говорение', steps: [
      { t: 'pdf', file: 'ge-sb', from: 120, to: 121, label: 'Учебник, с. 120–121' },
      a10,
      { t: 'pdf', file: 'ge-tb', from: 127, to: 129, key: true, label: 'Ответы и тексты аудио' },
    ] },
    { ...b10, id: 'ge-10-write', title: 'Юнит 10: письмо', steps: [
      { t: 'pdf', file: 'ge-sb', from: 122, to: 123, label: 'Учебник, с. 122–123' },
      WI,
      { t: 'pdf', file: 'ge-tb', from: 130, to: 131, key: true, label: 'Критерии — книга учителя' },
    ] },
    { ...b10, id: 'ge-10-wb1', title: 'Пробный B1 Preliminary: чтение и письмо', min: 40, steps: [
      { t: 'pdf', file: 'ge-wb', from: 85, to: 94, label: 'Тетрадь, с. 85–94' },
      { t: 'task', label: 'Засеки время, как на экзамене' },
    ] },
    { ...b10, id: 'ge-10-wb2', title: 'Пробный B1 Preliminary: аудирование и говорение', min: 40, steps: [
      { t: 'pdf', file: 'ge-wb', from: 95, to: 101, label: 'Тетрадь, с. 95–101' },
      w10,
      { t: 'pdf', file: 'ge-wb', from: 108, to: 110, label: 'Тексты аудио, с. 108–110' },
    ] },
    { ...b10, id: 'ge-eoy', title: 'Итоговый тест Gold Experience', min: 50, test: true, steps: [
      { t: 'pdf', file: named('Gold_Exp_A2P_EoY_Main_Test_A.pdf'), from: 1, to: null, label: 'End of Year test A' },
      { t: 'audio', files: [
        { name: 'Gold_Exp_A2P_Tests_EoY_1.mp3', label: 'Listening 1' },
        { name: 'Gold_Exp_A2P_Tests_EoY_3.mp3', label: 'Listening 3' },
      ], label: 'Аудио к тесту' },
      { t: 'pdf', file: named('Gold_Exp_A2P_EoY_Writing.pdf'), from: 1, to: null, label: 'Письменная часть' },
      { t: 'pdf', file: 'ge-key', from: KEY_PAGES.eoy[0], to: KEY_PAGES.eoy[1], key: true, label: 'Ключи' },
      { t: 'score', label: 'Результат' },
    ] },
  );
  return out;
}

// ── Passages ────────────────────────────────────────────────────

const P1_UNITS = ['Friends and family', 'Education and learning', 'Cities of the world', 'Day and night', 'Generally speaking', 'Interpersonal communication', 'Telling the news', 'Values', 'Putting the mind to work', 'The art of complaining', 'On the other side of the world', 'Dilemmas'];
const P2_UNITS = ['Relationships', 'Clothes and appearance', 'Exceptional people', 'Superstitions and beliefs', 'Reading and television', 'Art and music', 'Changing times', 'Buying and selling', 'Animals', 'Language and communication', 'Science and technology', 'Getting down to business'];

function passagesLessons(book, first, names) {
  // Юнит — 8 страниц (урок A и урок B), после каждых трёх — 4 страницы повторения.
  const out = [];
  let p = first;
  names.forEach((name, i) => {
    const u = i + 1;
    const base = { book, unit: u, unitTitle: name, min: 45 };
    const pdf = (a, b, label) => ({ t: 'pdf', file: book, from: a, to: b, label });
    const noAudio = { t: 'task', label: 'Аудио к книге нет: в заданиях на аудирование читай вопросы и отвечай на них устно о себе' };
    out.push(
      { ...base, id: `${book}-${u}-a1`, title: 'Урок A, часть 1', steps: [pdf(p, p + 1, `с. ${p}–${p + 1}`), { t: 'task', label: 'Вопросы для обсуждения — отвечай вслух, полными фразами' }, { t: 'task', label: 'Грамматику из рамки — пять своих примеров в заметку' }] },
      { ...base, id: `${book}-${u}-a2`, title: 'Урок A, часть 2', steps: [pdf(p + 2, p + 3, `с. ${p + 2}–${p + 3}`), noAudio] },
      { ...base, id: `${book}-${u}-b1`, title: 'Урок B, часть 1', steps: [pdf(p + 4, p + 5, `с. ${p + 4}–${p + 5}`), noAudio] },
      { ...base, id: `${book}-${u}-b2`, title: 'Урок B, часть 2: чтение', steps: [pdf(p + 6, p + 7, `с. ${p + 6}–${p + 7}`), { t: 'task', label: 'Новые слова из текста — в раздел «Слова»' }] },
      { ...base, id: `${book}-${u}-w`, title: 'Письмо', steps: [pdf(p + 3, p + 3, `Задание на письмо, с. ${p + 3}`), { t: 'task', label: 'Напиши текст по заданию (150–200 слов)' }, WI] },
      { ...base, id: `${book}-${u}-s`, title: 'Говорение', min: 30, steps: [pdf(p, p + 7, `Юнит ${u}, с. ${p}–${p + 7}`), { t: 'task', label: 'Выбери 3 вопроса для обсуждения из юнита. Запиши себя: по 2 минуты на каждый' }, { t: 'task', label: 'Переслушай и выпиши 3 фразы, которые хотела сказать, но не смогла — переведи их' }] },
    );
    p += 8;
    if (u % 3 === 0) {
      const r = { ...base, unit: u, unitTitle: `Повторение юнитов ${u - 2}–${u}` };
      out.push(
        { ...r, id: `${book}-r${u}a`, title: 'Повторение, часть 1', steps: [pdf(p, p + 1, `с. ${p}–${p + 1}`)] },
        { ...r, id: `${book}-r${u}b`, title: 'Повторение, часть 2', steps: [pdf(p + 2, p + 3, `с. ${p + 2}–${p + 3}`)] },
      );
      p += 4;
    }
  });
  return out;
}

// ── Cambridge Academic English ──────────────────────────────────

const CI_UNITS = ['Styles of learning', 'Problems in the natural world', 'Indications and trends', 'The information age', 'On budget', 'Being objective', 'Innovation', 'Sensing and understanding', 'IT issues', 'Culture shock'];

function caeLessons(book, names) {
  // Страница файла = страница книги + 1. Юнит — 12 страниц, Lecture skills — 4.
  const pg = (n) => n + 1;
  const out = [];
  const base = { book, min: 45 };
  const pdf = (a, b, label) => ({ t: 'pdf', file: book, from: pg(a), to: pg(b), label: `${label}, с. ${a}–${b}` });
  out.push({ ...base, unit: 0, unitTitle: 'Academic orientation', id: `${book}-ao`, title: 'Вводный юнит', steps: [pdf(10, 13, 'Academic orientation')] });
  const order = [1, 2, 'A', 3, 4, 'B', 5, 6, 'C', 7, 8, 'D', 9, 10, 'E'];
  let p = 14;
  for (const k of order) {
    if (typeof k === 'number') {
      const b = { ...base, unit: k, unitTitle: names[k - 1] };
      const parts = ['Чтение', 'Чтение и обсуждение', 'Говорение и аудирование', 'Письмо', 'Письмо: своя работа', 'Грамматика и лексика'];
      parts.forEach((t, j) => {
        const step = [pdf(p + 2 * j, p + 2 * j + 1, `Юнит ${k}`)];
        if (j === 4) step.push({ t: 'task', label: 'Сделай письменное задание юнита на тему своего диплома или работы' }, WI);
        if (j === 2) step.push({ t: 'task', label: 'Аудио к этой книге нет: тексты лекций — в конце книги' });
        out.push({ ...b, id: `${book}-${k}-${j + 1}`, title: t, steps: step });
      });
      p += 12;
    } else {
      const b = { ...base, unit: `LS ${k}`, unitTitle: `Lecture skills ${k}` };
      out.push(
        { ...b, id: `${book}-ls${k}-1`, title: 'Лекции: подготовка и конспект', steps: [pdf(p, p + 1, `Lecture skills ${k}`), { t: 'task', label: 'Видео к этой книге нет: читай текст лекции в конце книги и тренируй конспект' }] },
        { ...b, id: `${book}-ls${k}-2`, title: 'Лекции: язык лектора', steps: [pdf(p + 2, p + 3, `Lecture skills ${k}`)] },
      );
      p += 4;
    }
  }
  return out;
}

// ── Speakout (бумажная книга) ──────────────────────────────────

function speakoutLessons() {
  const out = [];
  for (let u = 1; u <= 12; u++) {
    const base = { book: 'so', unit: u, unitTitle: `Юнит ${u}`, min: 30, paper: true };
    const s = (k, title, steps) => out.push({ ...base, id: `so-${u}-${k}`, title, steps: steps.map((label) => ({ t: 'task', label })) });
    s(1, `Урок ${u}.1`, ['Учебник: лексика, чтение, аудирование', 'Новые слова — в раздел «Слова»']);
    s(2, `Урок ${u}.2 и Language bank`, ['Учебник: грамматика урока', 'Правило и упражнения в Language bank в конце книги', 'Непонятно — справочник Логвиной']);
    s(3, `Урок ${u}.3`, ['Учебник: фразы для реальных ситуаций', 'Повтори диалоги вслух за диктором']);
    s(4, `Урок ${u}.4: видео BBC`, ['Посмотри видео: сначала без текста, потом с паузами', 'Задания к видео в учебнике']);
    s(5, `Урок ${u}.4: говорение и письмо`, ['Задание на говорение — запиши себя на 2 минуты', 'Письменное задание урока', 'Проверь текст в Write & Improve']);
    s(6, 'Рабочая тетрадь, первая половина юнита', ['Упражнения к урокам 1–2', 'Проверь по ключу в конце тетради']);
    s(7, 'Рабочая тетрадь, вторая половина юнита', ['Упражнения к урокам 3–4 и аудио', 'Проверь по ключу']);
    s(8, 'Lookback', ['Страница повторения Lookback', 'Слова юнита — повтори в разделе «Слова»']);
    s(9, 'Повторение юнита', ['Перескажи вслух, о чём был юнит, 2 минуты', 'Ошибки из тетради — переделай']);
  }
  return out;
}

// ── Особые занятия ─────────────────────────────────────────────

const EFSET = { t: 'link', url: 'https://www.efset.org/', label: 'Пройти EF SET (бесплатно, 50 минут)' };
function special() {
  return [
    { id: 'start-setup', book: 'misc', unitTitle: 'Старт', title: 'Подключить файлы и пройти диагностику', min: 45, test: true, steps: [
      { t: 'task', label: 'Раздел «Материалы» → «Выбрать папку». Выбери папку, где лежат учебники и аудио (например, «Загрузки»)' },
      { t: 'pdf', file: named('Gold_Exp_A2P_Diagnostic_Test_A.pdf'), from: 1, to: null, label: 'Диагностический тест Gold Experience' },
      { t: 'pdf', file: 'ge-key', from: KEY_PAGES.diag[0], to: KEY_PAGES.diag[1], key: true, label: 'Ключ к диагностическому тесту' },
      { t: 'score', label: 'Результат' },
    ] },
    { id: 'efset-0', book: 'misc', unitTitle: 'Контроль', title: 'EF SET: стартовый уровень', min: 50, efset: true, steps: [EFSET, { t: 'score', label: 'Балл EF SET', max: 100 }] },
    { id: 'efset-1', book: 'misc', unitTitle: 'Контроль', title: 'EF SET: итог этапа A2 → B1', min: 50, efset: true, steps: [EFSET, { t: 'score', label: 'Балл EF SET', max: 100 }] },
    { id: 'efset-2', book: 'misc', unitTitle: 'Контроль', title: 'EF SET: середина второго этапа', min: 50, efset: true, steps: [EFSET, { t: 'score', label: 'Балл EF SET', max: 100 }] },
    { id: 'efset-3', book: 'misc', unitTitle: 'Контроль', title: 'EF SET: итог года', min: 50, efset: true, steps: [EFSET, { t: 'score', label: 'Балл EF SET', max: 100 }] },
  ];
}

// ── Очереди и календарь ────────────────────────────────────────

function interleave(a, b) {
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

export const BOOKS = {
  ge: { short: 'Gold Experience', title: 'Gold Experience A2+', level: 'A2 → B1' },
  so: { short: 'Speakout', title: 'Speakout Pre-intermediate (бумажная)', level: 'A2 → B1' },
  p1: { short: 'Passages 1', title: 'Passages 1', level: 'B1+ → B2' },
  ci: { short: 'Academic English', title: 'Cambridge Academic English Intermediate', level: 'B1' },
  p2: { short: 'Passages 2', title: 'Passages 2', level: 'B2 → C1' },
  misc: { short: 'Контроль', title: 'Контроль уровня', level: '' },
};

// Буферные недели без нового материала: каникулы и защита диплома.
export const BUFFERS = [
  { from: '2026-12-28', to: '2027-01-03', title: 'Новогодняя неделя' },
  { from: '2027-06-14', to: '2027-06-27', title: 'Защита диплома' },
];
const inBuffer = (d) => BUFFERS.find((b) => d >= b.from && d <= b.to) || null;

export const PHASES = [
  { id: 1, title: 'Этап 1. A2 → B1', text: 'Speakout на бумаге и Gold Experience на сайте, каждый день понемногу.' },
  { id: 2, title: 'Этап 2. B1 → B1+', text: 'Passages 1 для разговорной речи и Cambridge Academic English для чтения и письма — пригодится для диплома.' },
  { id: 3, title: 'Этап 3. Начало B2', text: 'Passages 2: темы сложнее, больше письма и обсуждений.' },
];

let cache = null;
export function buildPlan() {
  if (cache) return cache;
  const sp = special();
  const so = speakoutLessons();
  const ge = geLessons();
  const p1 = passagesLessons('p1', 2, P1_UNITS);
  const ci = caeLessons('ci', CI_UNITS);
  const p2 = passagesLessons('p2', 6, P2_UNITS);
  const site = [...ge, ...interleave(p1, ci), ...p2];
  const lessons = [...sp, ...so, ...site];
  const byId = new Map(lessons.map((l) => [l.id, l]));

  const paperQ = so.map((l) => l.id);
  const siteQ = site.map((l) => l.id);
  const days = [];
  const planned = new Map(); // id -> date
  const put = (day, id) => {
    day.items.push(id);
    planned.set(id, day.date);
  };

  let soEnd = null;
  let efset1 = null;
  for (let d = START; d <= END; d = addDays(d, 1)) {
    const day = { date: d, kind: 'work', items: [], note: '' };
    const wd = weekday(d);
    const buf = inBuffer(d);
    if (d === START) put(day, 'start-setup');
    else if (d === addDays(START, 1)) {
      day.kind = 'light';
      put(day, 'efset-0');
    } else if (d === END) {
      day.kind = 'special';
      put(day, 'efset-3');
    } else if (buf) {
      day.kind = 'buffer';
      day.note = `${buf.title}: только слова, 10–15 минут. Если отстаёшь — догоняй`;
    } else if (wd === 0) {
      day.kind = 'light';
      if (soEnd && !efset1) {
        efset1 = d;
        put(day, 'efset-1');
      } else if (d === '2027-08-01') put(day, 'efset-2');
      else day.note = 'Лёгкий день: слова и 20–30 минут английского для удовольствия — Бебрис, сериал, подкаст';
    } else {
      if (paperQ.length) put(day, paperQ.shift());
      if (siteQ.length) put(day, siteQ.shift());
      if (!paperQ.length && !soEnd && day.items.some((id) => id.startsWith('so-'))) soEnd = d;
      if (!day.items.length) day.note = 'Повторение: слова и заметки к занятиям';
    }
    days.push(day);
  }

  const order = [...sp.slice(0, 2), ...days.flatMap((d) => d.items.filter((id) => !id.startsWith('start-') && id !== 'efset-0'))];
  const firstOf = (book) => site.find((l) => l.book === book);
  const lastPlanned = (book) => {
    let last = null;
    for (const l of lessons) if (l.book === book && planned.has(l.id)) last = planned.get(l.id);
    return last;
  };
  const phaseOf = (date) => {
    const p2Start = planned.get(firstOf('p1').id);
    const p3Start = planned.get(firstOf('p2').id);
    if (p3Start && date >= p3Start) return 3;
    if (p2Start && date >= p2Start && (!soEnd || date > soEnd)) return 2;
    return 1;
  };
  cache = {
    lessons, byId, days, planned, order, phaseOf,
    queues: { paper: so.map((l) => l.id), site: site.map((l) => l.id) },
    milestones: {
      soEnd, efset1,
      geEnd: lastPlanned('ge'),
      p1Start: planned.get(firstOf('p1').id),
      p1End: lastPlanned('p1'),
      ciEnd: lastPlanned('ci'),
      p2Start: planned.get(firstOf('p2').id),
      unplanned: lessons.filter((l) => !planned.has(l.id)).map((l) => l.id),
    },
  };
  return cache;
}

export const lessonMinutes = (ids) => ids.reduce((s, id) => s + (buildPlan().byId.get(id)?.min || 0), 0);
