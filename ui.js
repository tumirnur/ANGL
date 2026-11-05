// Мини-набор для DOM без фреймворков.

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const $ = (sel, root = document) => root.querySelector(sel);

export function mount(target, ...nodes) {
  target.replaceChildren();
  append(target, nodes);
}

let toastTimer = null;
export function toast(text) {
  let t = $('#toast');
  if (!t) {
    t = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(t);
  }
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// Нижняя шторка (модальное окно).
export function sheet(title, body, { onClose } = {}) {
  const close = () => {
    wrap.remove();
    document.removeEventListener('keydown', onKey);
    onClose && onClose();
  };
  const onKey = (e) => e.key === 'Escape' && close();
  const wrap = h(
    'div',
    { class: 'sheet-wrap', onclick: (e) => e.target === wrap && close() },
    h(
      'div',
      { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'sheet-head' }, h('h2', null, title), h('button', { class: 'icon-btn', 'aria-label': 'Закрыть', onclick: close }, icon('x'))),
      h('div', { class: 'sheet-body' }, body),
    ),
  );
  document.addEventListener('keydown', onKey);
  document.body.append(wrap);
  const first = wrap.querySelector('input, select, textarea, button.primary');
  first && setTimeout(() => first.focus(), 50);
  return close;
}

// Иконки: простые штриховые SVG, чтобы не тянуть шрифт иконок.
const PATHS = {
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  folder: 'M3 6h6l2 2h10v11H3z',
  today: 'M5 4h14v16H5zM9 9h6M9 13h6M9 17h3',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  cards: 'M4 7h12v13H4zM8 3h12v13',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4',
  trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',
  x: 'M6 6l12 12M18 6L6 18',
  play: 'M8 5l11 7-11 7z',
  slow: 'M4 15c2-6 6-9 10-9 3 0 5 2 5 5h-3M4 15h14M7 15v3M15 15v3',
  mic: 'M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3zM5 11a7 7 0 0014 0M12 18v3',
  stop: 'M7 7h10v10H7z',
  check: 'M5 12l5 5 9-10',
  plus: 'M12 5v14M5 12h14',
  flame: 'M12 3c1 4 6 6 6 11a6 6 0 01-12 0c0-3 2-4 2-7 1 1 2 2 2 4 1-2 2-5 2-8z',
  snow: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 4l3 2 3-2M9 20l3-2 3 2',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  book: 'M5 4h9a4 4 0 014 4v12H9a4 4 0 01-4-4zM5 16a4 4 0 014-4h9',
  wave: 'M3 12h2M7 8v8M11 5v14M15 8v8M19 11v2',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8zM12 12h.01',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
  sync: 'M4 12a8 8 0 0114-5l2 2M20 12a8 8 0 01-14 5l-2-2M20 4v5h-5M4 20v-5h5',
  next: 'M5 12h14M13 6l6 6-6 6',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  gem: 'M6 4h12l4 6-10 11L2 10zM2 10h20M9 4l3 6 3-6M12 10v11',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  back: 'M15 5l-7 7 7 7',
  trophy: 'M7 4h10v5a5 5 0 01-10 0zM7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3M12 14v4M8 21h8M9 18h6',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  speaker: 'M4 9h4l5-4v14l-5-4H4zM16 8a5 5 0 010 8M18.5 5.5a8.5 8.5 0 010 13',
  turtle: 'M5 14a7 5 0 0114 0zM3 14h18M7 14v3M17 14v3M19 12l2-1',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
};
export function icon(name, size = 22) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `ic ic-${name}`);
  svg.setAttribute('focusable', 'false');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', PATHS[name] || '');
  svg.append(p);
  return svg;
}

export function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

export const fmtMin = (min) => {
  const m = Math.round(min);
  if (m < 60) return `${m} мин`;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${hh} ч ${mm} мин` : `${hh} ч`;
};

export function download(name, text) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}
