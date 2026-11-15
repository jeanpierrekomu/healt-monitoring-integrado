// Voz de las alertas. Pide el audio a nuestra ruta /api/tts (que habla con ElevenLabs en el servidor:
// la clave nunca llega al navegador). Si no hay clave, falla la red o se acaban los créditos,
// usa la voz del navegador para que la demo no se quede muda.
export type VoiceEngine = "elevenlabs" | "browser";

const cache = new Map<string, string>(); // texto → URL del audio (para no pagar dos veces la misma frase)
const queue: { text: string; onEngine?: (e: VoiceEngine) => void; tone?: ToneLevel }[] = [];
let playing = false;
let current: HTMLAudioElement | null = null;
let elevenUnavailable = false; // tras un 503 (sin clave) no se vuelve a intentar

async function elevenAudio(text: string): Promise<string | null> {
  if (elevenUnavailable) return null;
  const hit = cache.get(text);
  if (hit) return hit;
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.status === 503) elevenUnavailable = true;
    if (!res.ok) return null;
    const url = URL.createObjectURL(await res.blob());
    cache.set(text, url);
    return url;
  } catch {
    return null;
  }
}

function browserSpeak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-ES";
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("es"));
    if (voice) u.voice = voice;
    u.rate = 1.02;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

function playUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    current = audio;
    audio.onended = () => resolve(true);
    audio.onerror = () => resolve(false);
    audio.play().catch(() => resolve(false));
  });
}

// Efectos de sonido sintetizados en el navegador (sin archivos ni créditos), imitando los niveles del
// sistema de Precaución y Advertencia de la Estación Espacial: más urgente = más agudo y más rápido.
// Sin sirenas de ambulancia: máxima = ráfagas de pitidos de monitor, grave = tonos medios, leve = campanita.
// Las grabaciones reales de la ISS no se publican con licencia libre, por eso se recrean aquí.
// También sigue la norma de alarmas médicas IEC 60601-1-8 (más urgente = más agudo y más rápido).
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function audio() {
  ctx ??= new AudioContext();
  if (!master) {
    master = ctx.createGain();
    master.gain.value = 0.9;
    // Compresor para que la sirena suene fuerte sin saturar.
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
  }
  return { ac: ctx, out: master };
}

function envelope(ac: AudioContext, t: number, len: number, vol: number) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.setValueAtTime(vol, t + len - 0.05);
  g.gain.linearRampToValueAtTime(0, t + len);
  return g;
}

/** Pitidos cortos tipo monitor (UCI). */
function beeps(t: number, freqs: number[], gap: number, len: number, vol: number) {
  const { ac, out } = audio();
  freqs.forEach((f, i) => {
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const s = t + i * gap;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(vol, s + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, s + len);
    o.connect(g).connect(out);
    o.start(s);
    o.stop(s + len + 0.02);
  });
  return freqs.length * gap;
}

/** Tono intermitente (Precaución): pitidos medios con pausas. */
function intermittent(t: number, count: number, on: number, off: number, f: number, vol: number) {
  const { ac, out } = audio();
  for (let i = 0; i < count; i++) {
    const s = t + i * (on + off);
    const o = ac.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    const g = envelope(ac, s, on, vol);
    o.connect(g).connect(out);
    o.start(s);
    o.stop(s + on + 0.02);
  }
  return count * (on + off);
}

/** Campanita suave (dos notas con armónicos que se apagan). */
function chime(t: number, vol: number) {
  const { ac, out } = audio();
  [
    [784, 0],
    [1175, 0.18],
  ].forEach(([f, d]) => {
    for (const [mult, v] of [[1, 1], [2.76, 0.3], [5.4, 0.12]]) {
      const o = ac.createOscillator();
      o.type = "sine";
      o.frequency.value = f * mult;
      const s = t + d;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(vol * v, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 1.2);
      o.connect(g).connect(out);
      o.start(s);
      o.stop(s + 1.25);
    }
  });
  return 0.9;
}

export type ToneLevel = "atencion" | "advertencia" | "critico" | "normal";

/** Toca el efecto de la prioridad y espera a que termine. */
export function playSiren(level: ToneLevel): Promise<void> {
  return new Promise((resolve) => {
    try {
      const { ac } = audio();
      void ac.resume();
      const t = ac.currentTime + 0.03;
      let len = 0;
      if (level === "critico") {
        // Máxima: dos ráfagas de pitidos agudos de monitor (sin sirena).
        len = beeps(t, [1568, 1568, 1568], 0.17, 0.12, 0.26);
        len += beeps(t + len + 0.25, [1568, 1568, 1568], 0.17, 0.12, 0.26) + 0.25;
      } else if (level === "advertencia") {
        // Grave: tres tonos medios, más lentos.
        len = intermittent(t, 3, 0.22, 0.16, 880, 0.15);
      } else if (level === "atencion") {
        // Leve: campanita suave.
        len = chime(t, 0.18);
      } else {
        len = chime(t, 0.22);
      }
      setTimeout(resolve, (len + 0.2) * 1000);
    } catch {
      resolve();
    }
  });
}

/** Recordatorio corto mientras una alerta máxima sigue sin atender (doble pitido agudo). */
export function alarmPing() {
  try {
    const { ac } = audio();
    beeps(ac.currentTime + 0.02, [1319, 1568], 0.18, 0.13, 0.28);
  } catch {
    // sin audio
  }
}

/** Los navegadores no dejan sonar audio hasta el primer clic o tecla en la página: si aún no hubo, se espera. */
function userGesture(): Promise<void> {
  const active = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive;
  if (active !== false) return Promise.resolve();
  return new Promise((resolve) => {
    const go = () => {
      window.removeEventListener("pointerdown", go, true);
      window.removeEventListener("keydown", go, true);
      void audio().ac.resume();
      resolve();
    };
    window.addEventListener("pointerdown", go, true);
    window.addEventListener("keydown", go, true);
  });
}

async function drain() {
  if (playing) return;
  playing = true;
  while (queue.length) {
    await userGesture();
    if (!queue.length) break;
    const item = queue.shift()!;
    // El audio se pide mientras suena el tono, para no perder tiempo.
    const [url] = await Promise.all([elevenAudio(item.text), item.tone ? playSiren(item.tone) : Promise.resolve()]);
    let ok = false;
    if (url) {
      item.onEngine?.("elevenlabs");
      ok = await playUrl(url);
    }
    if (!ok) {
      item.onEngine?.("browser");
      await browserSpeak(item.text);
    }
    current = null;
  }
  playing = false;
}

/** Pone una frase en la cola: se leen de a una, sin pisarse. */
export function speak(text: string, onEngine?: (e: VoiceEngine) => void, tone?: ToneLevel) {
  queue.push({ text, onEngine, tone });
  void drain();
}

/** Corta la frase actual y vacía la cola. */
export function stopSpeech() {
  queue.length = 0;
  current?.pause();
  current = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Desbloquea el audio (los navegadores exigen un clic antes de reproducir sonido). */
export function unlockAudio() {
  try {
    const a = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
    void a.play().catch(() => undefined);
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    void audio().ac.resume();
  } catch {
    // sin audio disponible: no pasa nada
  }
}
