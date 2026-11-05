// Твои файлы: учебники и аудио выбираются с диска и открываются прямо в браузере.
// В интернет ничего не загружается. Открытые файлы запоминаются в этом браузере (IndexedDB),
// чтобы в следующий раз не выбирать папку заново.
import { FILES } from './plan.js';

const picked = new Map(); // имя в нижнем регистре -> File
const listeners = new Set();
let cachedNames = new Set(); // имена файлов, сохранённых в браузере

export const onFilesChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach((fn) => fn());

const base = (f) => (f.webkitRelativePath || f.name).split('/').pop();

const MEDIA = /\.(pdf|mp3|m4a|wav|mp4)$/i;

function put(name, value) {
  const k = name.toLowerCase();
  // Дубликаты (одна и та же папка вложена дважды) — оставляем первый.
  if (picked.has(k)) return 0;
  picked.set(k, value);
  return 1;
}

// Добавить файлы. Архив .zip (как для iPad) раскрывается прямо в браузере, без распаковки на диск.
export async function addFiles(fileList, { zips = true } = {}) {
  let n = 0;
  for (const f of fileList) {
    const name = base(f);
    if (zips && /\.zip$/i.test(name)) {
      try {
        n += await addZip(f);
      } catch {}
    } else if (MEDIA.test(name)) n += put(name, f);
  }
  emit();
  return n;
}

// ── Чтение zip без распаковки ──────────────────────────────────
// Файлы, сохранённые без сжатия (zip -0), берутся срезом исходного файла — память не тратится.
// Сжатые (deflate) распаковываются по требованию, когда файл открывают.

const u16 = (v, o) => v.getUint16(o, true);
const u32 = (v, o) => v.getUint32(o, true);
const u64 = (v, o) => u32(v, o) + u32(v, o + 4) * 2 ** 32;
const view = async (blob, a, b) => new DataView(await blob.slice(a, b).arrayBuffer());
const TYPES = { pdf: 'application/pdf', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', mp4: 'video/mp4' };

export async function addZip(zip) {
  const size = zip.size;
  const tailStart = Math.max(0, size - 65557);
  const tail = await view(zip, tailStart, size);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) if (u32(tail, i) === 0x06054b50) {
    eocd = i;
    break;
  }
  if (eocd < 0) throw new Error('not a zip');
  let count = u16(tail, eocd + 10);
  let cdSize = u32(tail, eocd + 12);
  let cdOff = u32(tail, eocd + 16);
  if (cdOff === 0xffffffff || count === 0xffff) {
    const loc = eocd - 20;
    if (loc >= 0 && u32(tail, loc) === 0x07064b50) {
      const recOff = u64(tail, loc + 8);
      const rec = await view(zip, recOff, recOff + 56);
      count = u64(rec, 32);
      cdSize = u64(rec, 40);
      cdOff = u64(rec, 48);
    }
  }
  const cd = await view(zip, cdOff, cdOff + cdSize);
  const dec = new TextDecoder('utf-8');
  let p = 0;
  let n = 0;
  for (let e = 0; e < count && p + 46 <= cd.byteLength; e++) {
    if (u32(cd, p) !== 0x02014b50) break;
    const method = u16(cd, p + 10);
    let comp = u32(cd, p + 20);
    let plain = u32(cd, p + 24);
    const nl = u16(cd, p + 28);
    const xl = u16(cd, p + 30);
    const cl = u16(cd, p + 32);
    let lho = u32(cd, p + 42);
    const path = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nl));
    // zip64: настоящие размеры и смещение лежат в дополнительном поле 0x0001.
    if (comp === 0xffffffff || plain === 0xffffffff || lho === 0xffffffff) {
      let x = p + 46 + nl;
      const end = x + xl;
      while (x + 4 <= end) {
        const id = u16(cd, x);
        const len = u16(cd, x + 2);
        if (id === 1) {
          let q = x + 4;
          if (plain === 0xffffffff) (plain = u64(cd, q)), (q += 8);
          if (comp === 0xffffffff) (comp = u64(cd, q)), (q += 8);
          if (lho === 0xffffffff) lho = u64(cd, q);
        }
        x += 4 + len;
      }
    }
    p += 46 + nl + xl + cl;
    const name = path.split('/').pop();
    if (!name || path.endsWith('/') || path.includes('__MACOSX') || name.startsWith('._') || !MEDIA.test(name)) continue;
    const lh = await view(zip, lho, lho + 30);
    const start = lho + 30 + u16(lh, 26) + u16(lh, 28);
    const type = TYPES[name.split('.').pop().toLowerCase()] || '';
    if (method === 0) {
      n += put(name, new File([zip.slice(start, start + comp)], name, { type }));
    } else if (method === 8 && globalThis.DecompressionStream) {
      const raw = zip.slice(start, start + comp);
      n += put(name, { lazy: async () => new File([await new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob()], name, { type }) });
    }
  }
  return n;
}

export const pickedCount = () => picked.size;

// Ключ из плана -> имя файла.
function findName(key) {
  if (key.startsWith('name:')) {
    const want = key.slice(5).toLowerCase();
    if (picked.has(want) || cachedNames.has(want)) return want;
    return null;
  }
  const def = FILES[key];
  if (!def) return null;
  for (const k of picked.keys()) if (k.endsWith('.pdf') && def.match.test(k)) return k;
  for (const k of cachedNames) if (k.endsWith('.pdf') && def.match.test(k)) return k;
  return null;
}

export function status(key) {
  const k = findName(key);
  if (!k) return 'missing';
  return picked.has(k) ? 'ready' : 'cached';
}

export function displayName(key) {
  return findName(key) || (key.startsWith('name:') ? key.slice(5) : FILES[key]?.title || key);
}

export async function getFile(key) {
  const k = findName(key);
  if (!k) return null;
  if (picked.has(k)) {
    let f = picked.get(k);
    if (f && f.lazy) {
      f = await f.lazy();
      picked.set(k, f);
    }
    remember(k, f);
    return f;
  }
  return idbGet(k);
}

// ── IndexedDB ──────────────────────────────────────────────────

const DB = 'grind-english-files';
let dbp = null;
function db() {
  if (!dbp) {
    dbp = new Promise((resolve) => {
      try {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore('files');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => resolve(null);
        r.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbp;
}

function tx(mode, fn) {
  return db().then(
    (d) =>
      new Promise((resolve) => {
        if (!d) return resolve(null);
        try {
          const t = d.transaction('files', mode);
          const req = fn(t.objectStore('files'));
          t.oncomplete = () => resolve(req ? req.result : true);
          t.onerror = () => resolve(null);
          t.onabort = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

const idbGet = (k) => tx('readonly', (s) => s.get(k));

const saving = new Set();
async function remember(k, file) {
  if (cachedNames.has(k) || saving.has(k)) return;
  saving.add(k);
  // Blob в IndexedDB хранится как копия файла; при нехватке места просто не сохраняем.
  const ok = await tx('readwrite', (s) => s.put(file, k));
  saving.delete(k);
  if (ok) {
    cachedNames.add(k);
    emit();
  }
}

export async function loadCachedIndex() {
  const keys = await tx('readonly', (s) => s.getAllKeys());
  cachedNames = new Set(Array.isArray(keys) ? keys : []);
  emit();
  return cachedNames.size;
}

export const cachedCount = () => cachedNames.size;

export async function forgetCached() {
  await tx('readwrite', (s) => s.clear());
  cachedNames = new Set();
  emit();
}

export async function storageInfo() {
  try {
    const e = await navigator.storage?.estimate?.();
    return e ? { used: e.usage || 0, quota: e.quota || 0 } : null;
  } catch {
    return null;
  }
}
