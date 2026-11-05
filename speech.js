// Озвучка (Web Speech API), распознавание речи и запись голоса для shadowing.

const synth = globalThis.speechSynthesis;
let voices = [];

function loadVoices() {
  voices = synth ? synth.getVoices() : [];
}
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

const LANG = { us: 'en-US', uk: 'en-GB' };
const PREFERRED = /google|natural|neural|samantha|daniel|serena|aria|jenny|guy|libby|ryan|sonia/i;

export function pickVoice(accent = 'us') {
  const lang = LANG[accent] || 'en-US';
  const exact = voices.filter((v) => v.lang.replace('_', '-') === lang);
  const anyEn = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const pool = exact.length ? exact : anyEn;
  return pool.find((v) => PREFERRED.test(v.name)) || pool[0] || null;
}

export const canSpeak = () => !!synth;

export function speak(text, { accent = 'us', rate = 0.95 } = {}) {
  return new Promise((resolve) => {
    if (!synth) return resolve(false);
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(accent);
    if (v) u.voice = v;
    u.lang = LANG[accent] || 'en-US';
    u.rate = rate;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    synth.speak(u);
  });
}

export const stopSpeaking = () => synth && synth.cancel();

// ── Распознавание речи ──────────────────────────────────────────

// В артефакте Claude микрофон недоступен, поэтому задания на речь там заменяются письменными.
const IN_ARTIFACT = !!globalThis.__GE_ARTIFACT__ || (typeof globalThis.claude === 'object' && typeof globalThis.claude?.use === 'function');
const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
export const canRecognize = () => !IN_ARTIFACT && !!Recognition;

export function listen({ accent = 'us', timeout = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!Recognition) return reject(new Error('unsupported'));
    const r = new Recognition();
    r.lang = LANG[accent] || 'en-US';
    r.interimResults = false;
    r.maxAlternatives = 5;
    let done = false;
    const finish = (fn, v) => {
      if (done) return;
      done = true;
      clearTimeout(t);
      try { r.stop(); } catch {}
      fn(v);
    };
    const t = setTimeout(() => finish(resolve, []), timeout);
    r.onresult = (e) => {
      const alts = [];
      for (const res of e.results) for (const a of res) alts.push(a.transcript);
      finish(resolve, alts);
    };
    r.onerror = (e) => finish(reject, new Error(e.error || 'error'));
    r.onend = () => finish(resolve, []);
    r.start();
  });
}

// ── Запись голоса ───────────────────────────────────────────────

export const canRecord = () => !IN_ARTIFACT && !!(navigator.mediaDevices && globalThis.MediaRecorder);

export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start();
  return {
    stop: () =>
      new Promise((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })));
        };
        rec.stop();
      }),
  };
}

// Произношение носителями в реальных видео (YouGlish).
export const youglish = (text, accent = 'us') =>
  `https://youglish.com/pronounce/${encodeURIComponent(text)}/english/${accent === 'uk' ? 'uk' : 'us'}`;
