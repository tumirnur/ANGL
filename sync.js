// Синхронизация через базу артефакта Claude (capability db).
// Один документ — отметки и время, слова разложены по 8 документам (у документа предел 256 КБ).
// Вне артефакта всё хранится только в браузере.

export const IN_ARTIFACT = !!globalThis.__GE_ARTIFACT__ || (typeof globalThis.claude === 'object' && typeof globalThis.claude?.use === 'function');

const CHUNKS = 8;
const chunkOf = (id) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % CHUNKS;
};

let tried = null;
async function base() {
  if (!IN_ARTIFACT) return null;
  if (!tried) {
    tried = (async () => {
      try {
        for (let i = 0; i < 30 && !(globalThis.claude && globalThis.claude.use); i++) await new Promise((r) => setTimeout(r, 100));
        if (!globalThis.claude?.use) return null;
        const [db, user] = await Promise.all([globalThis.claude.use('db'), globalThis.claude.use('user')]);
        if (!db || !user) return null;
        const id = await user.id();
        if (!id) return null;
        return (name) => db.doc(`data/users/${id}/${name}`);
      } catch {
        return null;
      }
    })();
  }
  return tried;
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export async function cloudLoad() {
  const doc = await base();
  if (!doc) return null;
  try {
    const names = ['plan', ...Array.from({ length: CHUNKS }, (_, i) => `words-${i}`)];
    const snaps = await withTimeout(Promise.all(names.map((n) => doc(n).get())), 10000);
    const plain = (s) => (s.exists ? JSON.parse(JSON.stringify(s.data())) : null);
    const main = plain(snaps[0]);
    if (!main && snaps.every((s) => !s.exists)) return null;
    const out = { ...(main || {}), words: {} };
    snaps.slice(1).forEach((s) => Object.assign(out.words, plain(s)?.words || {}));
    names.forEach((n, i) => (last[n] = snaps[i].exists ? JSON.stringify(plain(snaps[i])) : ''));
    return out;
  } catch {
    return null;
  }
}

let chain = Promise.resolve(true);
const last = {};
export function cloudSave(state) {
  chain = chain.then(async () => {
    const doc = await base();
    if (!doc) return false;
    const { words = {}, ...rest } = state;
    const parts = { plan: rest };
    for (let i = 0; i < CHUNKS; i++) parts[`words-${i}`] = { words: {} };
    for (const [id, w] of Object.entries(words)) parts[`words-${chunkOf(id)}`].words[id] = w;
    let ok = true;
    for (const [name, body] of Object.entries(parts)) {
      const json = JSON.stringify(body);
      if (json === last[name]) continue;
      if (name !== 'plan' && !last[name] && json === '{"words":{}}') continue;
      try {
        await doc(name).set(JSON.parse(json));
        last[name] = json;
      } catch {
        ok = false;
      }
    }
    return ok;
  });
  return chain;
}

export async function cloudReady() {
  return !!(await base());
}
