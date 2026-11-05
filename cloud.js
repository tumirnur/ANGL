// Синхронизация через Supabase по REST (без библиотек), для версии сайта на GitHub Pages.
// Без интернета сайт работает как обычно, а при появлении сети досылает изменения.
import { SUPABASE } from './config.js';

const KEY = 'grind-english:auth';
const enabled = () => !!(SUPABASE.url && SUPABASE.key);

function session() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}
function setSession(s) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {}
}

export const cloudUser = () => session()?.user || null;
export const cloudConfigured = enabled;

const RU = {
  'Invalid login credentials': 'Неверная почта или пароль.',
  'Email not confirmed': 'Почта не подтверждена: открой письмо от Supabase и нажми ссылку.',
  'User already registered': 'Такой аккаунт уже есть — нажми «Войти».',
};
async function auth(path, body) {
  const r = await fetch(`${SUPABASE.url}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: SUPABASE.key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j.msg || j.error_description || j.message || `Ошибка ${r.status}`;
    throw new Error(RU[msg] || msg);
  }
  return j;
}
const keep = (j) => {
  if (j.access_token) setSession({ access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, user: { id: j.user.id, email: j.user.email } });
};

export async function signIn(email, password) {
  keep(await auth('token?grant_type=password', { email, password }));
}
export async function signUp(email, password) {
  const j = await auth('signup', { email, password });
  keep(j);
  return { needsConfirm: !j.access_token };
}
export function signOut() {
  setSession(null);
}

async function token() {
  const s = session();
  if (!s) return null;
  if (Date.now() < s.exp - 60e3) return s.access;
  try {
    keep(await auth('token?grant_type=refresh_token', { refresh_token: s.refresh }));
    return session().access;
  } catch (e) {
    if (/refresh|token|invalid/i.test(e.message)) setSession(null);
    return null;
  }
}

async function rest(path, opts = {}) {
  const t = await token();
  if (!t) throw new Error('nologin');
  const r = await fetch(`${SUPABASE.url}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SUPABASE.key, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error(`Ошибка базы ${r.status}`);
  return r.status === 204 ? null : r.json().catch(() => null);
}

// Скачать, слить с локальным и записать обратно. Возвращает слитое состояние или null.
export async function cloudSync(state, merge) {
  if (!enabled() || !session() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return null;
  const uid = session().user.id;
  const rows = await rest(`user_state?user_id=eq.${uid}&select=data`);
  const merged = merge(state, rows && rows[0] ? rows[0].data : null);
  await rest('user_state?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: uid, data: merged, updated_at: new Date().toISOString() }),
  });
  try {
    localStorage.setItem('grind-english:lastsync', String(Date.now()));
  } catch {}
  return merged;
}

export function lastSync() {
  try {
    return Number(localStorage.getItem('grind-english:lastsync')) || 0;
  } catch {
    return 0;
  }
}
