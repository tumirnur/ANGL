// Просмотр PDF (pdf.js работает прямо в странице) и плеер для аудио из твоих папок.
import { h, icon } from './ui.js';
import { getFile, displayName, status } from './files.js';

const docs = new Map(); // ключ файла -> Promise<PDFDocumentProxy>

function lib() {
  return globalThis.pdfjsLib || null;
}

async function openDoc(key) {
  if (!docs.has(key)) {
    const p = (async () => {
      const L = lib();
      if (!L) throw new Error('nolib');
      const file = await getFile(key);
      if (!file) throw new Error('missing');
      const data = new Uint8Array(await file.arrayBuffer());
      return L.getDocument({ data, isEvalSupported: false, disableFontFace: false, useSystemFonts: true }).promise;
    })();
    p.catch(() => docs.delete(key));
    docs.set(key, p);
  }
  return docs.get(key);
}

// Панель PDF: показывает страницы from..to (можно листать дальше), масштаб по ширине.
export function pdfPanel({ file, from = 1, to = null, label = '' }, { onMissing } = {}) {
  const canvas = h('canvas', { class: 'pdf-canvas' });
  const pageInfo = h('span', { class: 'pdf-page mono' }, '…');
  const wrap = h('div', { class: 'pdf-scroll' }, canvas);
  const msg = h('div', { class: 'pdf-msg', hidden: true });
  let doc = null;
  let page = from || 1;
  let zoom = 1;
  let rendering = null;
  let pending = false;

  const range = to ? `с. ${from}–${to}` : '';
  const prev = h('button', { class: 'btn ghost sm', 'aria-label': 'Предыдущая страница', onclick: () => go(page - 1) }, icon('back', 18));
  const next = h('button', { class: 'btn ghost sm', 'aria-label': 'Следующая страница', onclick: () => go(page + 1) }, icon('next', 18));
  const zoomOut = h('button', { class: 'btn ghost sm', 'aria-label': 'Уменьшить', onclick: () => setZoom(zoom / 1.2) }, '−');
  const zoomIn = h('button', { class: 'btn ghost sm', 'aria-label': 'Увеличить', onclick: () => setZoom(zoom * 1.2) }, '+');
  const toStart = to && to !== from ? h('button', { class: 'btn ghost sm', onclick: () => go(from) }, `к с. ${from}`) : null;

  const el = h(
    'section',
    { class: 'panel pdf' },
    h('div', { class: 'panel-bar' },
      h('div', { class: 'panel-title' }, h('strong', null, label || displayName(file)), range ? h('span', { class: 'muted' }, ` · ${range}`) : null),
      h('div', { class: 'panel-tools' }, prev, pageInfo, next, toStart, zoomOut, zoomIn),
    ),
    msg,
    wrap,
  );

  function setZoom(z) {
    zoom = Math.min(3, Math.max(0.5, z));
    render();
  }
  function go(n) {
    if (!doc) return;
    page = Math.min(doc.numPages, Math.max(1, n));
    render();
    wrap.scrollTop = 0;
  }

  async function render() {
    if (!doc) return;
    if (rendering) {
      pending = true;
      return;
    }
    pageInfo.textContent = `${page} / ${doc.numPages}`;
    const inRange = !to || (page >= from && page <= to);
    pageInfo.classList.toggle('off', !inRange);
    rendering = (async () => {
      const p = await doc.getPage(page);
      const w = Math.max(280, wrap.clientWidth - 2);
      const v1 = p.getViewport({ scale: 1 });
      const scale = (w / v1.width) * zoom;
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      const vp = p.getViewport({ scale: scale * dpr });
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      canvas.style.width = `${Math.floor(vp.width / dpr)}px`;
      canvas.style.height = `${Math.floor(vp.height / dpr)}px`;
      await p.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    })();
    try {
      await rendering;
    } catch {}
    rendering = null;
    if (pending) {
      pending = false;
      render();
    }
  }

  function showMissing() {
    msg.hidden = false;
    wrap.hidden = true;
    msg.replaceChildren(
      h('p', null, h('strong', null, 'Файл не подключён: '), h('span', { class: 'mono' }, displayName(file))),
      h('p', { class: 'muted' }, 'Открой раздел «Материалы» и выбери папку, где он лежит.'),
      onMissing ? h('button', { class: 'btn', onclick: onMissing }, 'Подключить файлы') : null,
    );
  }

  (async () => {
    if (status(file) === 'missing') return showMissing();
    msg.hidden = false;
    msg.textContent = 'Открываю файл…';
    try {
      doc = await openDoc(file);
      msg.hidden = true;
      page = Math.min(doc.numPages, Math.max(1, from || 1));
      await new Promise((r) => requestAnimationFrame(r));
      render();
    } catch (e) {
      if (e && e.message === 'missing') return showMissing();
      msg.hidden = false;
      msg.textContent = e && e.message === 'nolib' ? 'Просмотрщик PDF не загрузился. Обнови страницу.' : 'Не получилось открыть файл. Возможно, он повреждён.';
    }
  })();

  // Перерисовать при изменении ширины.
  let lastW = 0;
  const ro = new ResizeObserver(() => {
    const w = wrap.clientWidth;
    if (doc && Math.abs(w - lastW) > 24) {
      lastW = w;
      render();
    }
  });
  ro.observe(wrap);
  el.destroy = () => ro.disconnect();
  return el;
}

// ── Аудио ───────────────────────────────────────────────────────

let current = null; // { audio, url }

export function stopAudio() {
  if (current) {
    current.audio.pause();
    URL.revokeObjectURL(current.url);
    current = null;
  }
}

export function audioPanel({ files, label }, { onMissing } = {}) {
  const audio = h('audio', { controls: true, preload: 'auto', class: 'audio' });
  const nowEl = h('span', { class: 'muted' }, 'Выбери трек');
  let rate = 1;
  const rateBtn = h('button', { class: 'btn ghost sm mono', title: 'Скорость', onclick: () => {
    rate = rate === 1 ? 0.85 : rate === 0.85 ? 0.75 : 1;
    audio.playbackRate = rate;
    rateBtn.textContent = `${rate}×`;
  } }, '1×');
  const back5 = h('button', { class: 'btn ghost sm', onclick: () => (audio.currentTime = Math.max(0, audio.currentTime - 5)) }, '−5 с');
  let loop = false;
  const loopBtn = h('button', { class: 'btn ghost sm', 'aria-pressed': 'false', onclick: () => {
    loop = !loop;
    audio.loop = loop;
    loopBtn.setAttribute('aria-pressed', String(loop));
  } }, 'Повтор');

  const list = h('div', { class: 'tracks' });
  const anyMissing = files.some((f) => status(`name:${f.name}`) === 'missing');
  const allMissing = files.every((f) => status(`name:${f.name}`) === 'missing');
  for (const f of files) {
    const key = `name:${f.name}`;
    const st = status(key);
    const b = h('button', {
      class: `track${st === 'missing' ? ' off' : ''}`,
      title: f.name,
      disabled: st === 'missing',
      onclick: async () => {
        const file = await getFile(key);
        if (!file) return;
        stopAudio();
        const url = URL.createObjectURL(file);
        current = { audio, url };
        audio.src = url;
        audio.playbackRate = rate;
        list.querySelectorAll('.track').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        nowEl.textContent = `Трек ${f.label}`;
        audio.play().catch(() => {});
      },
    }, f.label);
    list.append(b);
  }

  return h(
    'section',
    { class: 'panel audio-panel' },
    h('div', { class: 'panel-bar' }, h('div', { class: 'panel-title' }, h('strong', null, label || 'Аудио'), ' ', nowEl), h('div', { class: 'panel-tools' }, back5, rateBtn, loopBtn)),
    allMissing
      ? h('div', { class: 'pdf-msg' }, h('p', null, 'Аудио не подключено.'), h('p', { class: 'muted' }, 'В «Материалах» выбери папку с аудио (например, «Gold Experience A2+ SB audio»).'), onMissing ? h('button', { class: 'btn', onclick: onMissing }, 'Подключить файлы') : null)
      : [h('p', { class: 'muted small' }, 'Номер трека напечатан у задания в книге.' + (anyMissing ? ' Серые треки не найдены в выбранных папках.' : '')), list, audio],
  );
}
