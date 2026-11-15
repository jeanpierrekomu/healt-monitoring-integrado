// Sonido ambiente de la estación, generado en el navegador (sin archivos ni créditos).
// Sigue lo que hacen los juegos espaciales (Alien: Isolation, Dead Space, Starfield):
// 1) la nave "está viva": zumbido eléctrico + ventilación que respira, nunca silencio total;
// 2) detalles ocasionales: telemetría que pita, estructura que cruje, relés;
// 3) el ambiente reacciona al peligro: se tensa con una alerta grave y se agacha para dejar pasar
//    la sirena y la voz en una alerta máxima;
// 4) sonidos de interfaz suaves al tocar botones.
import { audio } from "./tts";

export type Mood = "calm" | "tense" | "alarm";

interface Engine {
  bus: GainNode; // volumen general del ambiente
  duck: GainNode; // se agacha en alarma
  tension: GainNode; // capa disonante (alerta grave)
  airFilter: BiquadFilterNode;
  echo: GainNode; // entrada a la reverberación de los detalles
  stop: () => void;
}

let engine: Engine | null = null;
let volume = 0.5;
let detailTimer: ReturnType<typeof setTimeout> | null = null;

function noiseBuffer(ac: AudioContext, brown: boolean) {
  const buf = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = white;
  }
  return buf;
}

function build(): Engine {
  const { ac, out } = audio();
  const sources: AudioScheduledSourceNode[] = [];
  const bus = ac.createGain();
  bus.gain.value = 0;
  const duck = ac.createGain();
  duck.connect(bus).connect(out);

  // 1) Zumbido eléctrico: dos graves casi iguales que "baten" lento + un armónico.
  for (const [f, type, g] of [
    [55, "sine", 0.34],
    [55.6, "sine", 0.26],
    [110.4, "triangle", 0.06],
    [164.8, "sine", 0.025],
  ] as const) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const gain = ac.createGain();
    gain.gain.value = g;
    o.connect(gain).connect(duck);
    o.start();
    sources.push(o);
  }

  // 2) Ventilación: ruido grave filtrado cuyo filtro sube y baja muy despacio (la nave respira).
  const air = ac.createBufferSource();
  air.buffer = noiseBuffer(ac, true);
  air.loop = true;
  const airFilter = ac.createBiquadFilter();
  airFilter.type = "lowpass";
  airFilter.frequency.value = 520;
  const airGain = ac.createGain();
  airGain.gain.value = 0.5;
  air.connect(airFilter).connect(airGain).connect(duck);
  air.start();
  sources.push(air);
  const breath = ac.createOscillator();
  breath.frequency.value = 0.09;
  const breathDepth = ac.createGain();
  breathDepth.gain.value = 170;
  breath.connect(breathDepth).connect(airFilter.frequency);
  breath.start();
  sources.push(breath);

  // Siseo muy tenue de aire en los conductos.
  const hiss = ac.createBufferSource();
  hiss.buffer = noiseBuffer(ac, false);
  hiss.loop = true;
  const hissFilter = ac.createBiquadFilter();
  hissFilter.type = "bandpass";
  hissFilter.frequency.value = 5200;
  hissFilter.Q.value = 0.7;
  const hissGain = ac.createGain();
  hissGain.gain.value = 0.012;
  hiss.connect(hissFilter).connect(hissGain).connect(duck);
  hiss.start();
  sources.push(hiss);

  // 3) Capa de tensión: una nota disonante que solo entra con alerta grave.
  const tension = ac.createGain();
  tension.gain.value = 0;
  tension.connect(duck);
  for (const f of [58.3, 87.6, 233.1]) {
    const o = ac.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;
    const g = ac.createGain();
    g.gain.value = f > 200 ? 0.03 : 0.1;
    o.connect(lp).connect(g).connect(tension);
    o.start();
    sources.push(o);
  }

  // Reverberación sencilla (eco con realimentación) para los detalles: da sensación de pasillo metálico.
  const echo = ac.createGain();
  const delay = ac.createDelay(1);
  delay.delayTime.value = 0.21;
  const fb = ac.createGain();
  fb.gain.value = 0.42;
  const wet = ac.createGain();
  wet.gain.value = 0.5;
  echo.connect(duck);
  echo.connect(delay);
  delay.connect(fb).connect(delay);
  delay.connect(wet).connect(duck);

  return {
    bus,
    duck,
    tension,
    airFilter,
    echo,
    stop: () => sources.forEach((s) => s.stop()),
  };
}

// Detalles ocasionales -----------------------------------------------------------

function telemetry(e: Engine) {
  const { ac } = audio();
  const t = ac.currentTime + 0.02;
  const notes = [1760, 2093, 2637, 1568];
  const n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.value = notes[Math.floor(Math.random() * notes.length)];
    const g = ac.createGain();
    const s = t + i * 0.09;
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(0.03, s + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.07);
    o.connect(g).connect(e.echo);
    o.start(s);
    o.stop(s + 0.1);
  }
}

function creak(e: Engine) {
  const { ac } = audio();
  const t = ac.currentTime + 0.02;
  const o = ac.createOscillator();
  o.type = "sawtooth";
  const f0 = 70 + Math.random() * 60;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + 1.1);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 240;
  bp.Q.value = 6;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.09, t + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  o.connect(bp).connect(g).connect(e.echo);
  o.start(t);
  o.stop(t + 1.3);
}

function relay(e: Engine) {
  const { ac } = audio();
  const t = ac.currentTime + 0.02;
  for (const d of [0, 0.07 + Math.random() * 0.1]) {
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac, false);
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.06, t + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.03);
    src.connect(hp).connect(g).connect(e.echo);
    src.start(t + d);
    src.stop(t + d + 0.05);
  }
}

function scheduleDetail() {
  detailTimer = setTimeout(
    () => {
      if (!engine) return;
      const r = Math.random();
      if (r < 0.55) telemetry(engine);
      else if (r < 0.8) relay(engine);
      else creak(engine);
      scheduleDetail();
    },
    5000 + Math.random() * 9000,
  );
}

// API ---------------------------------------------------------------------------

export function startAmbience() {
  if (engine) return;
  try {
    const { ac } = audio();
    void ac.resume();
    engine = build();
    engine.bus.gain.setTargetAtTime(volume * 0.5, ac.currentTime, 1.2); // entra suave
    scheduleDetail();
  } catch {
    engine = null;
  }
}

export function stopAmbience() {
  if (!engine) return;
  const e = engine;
  engine = null;
  if (detailTimer) clearTimeout(detailTimer);
  const { ac } = audio();
  e.bus.gain.setTargetAtTime(0, ac.currentTime, 0.3);
  setTimeout(() => {
    e.stop();
    e.bus.disconnect();
  }, 1500);
}

export function setAmbienceVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
  if (engine) engine.bus.gain.setTargetAtTime(volume * 0.5, audio().ac.currentTime, 0.15);
}

/** El ambiente reacciona: calma, tensión (alerta grave) o alarma (se agacha para la sirena y la voz). */
export function setMood(mood: Mood) {
  if (!engine) return;
  const t = audio().ac.currentTime;
  engine.tension.gain.setTargetAtTime(mood === "tense" ? 1 : mood === "alarm" ? 0.5 : 0, t, 0.8);
  engine.duck.gain.setTargetAtTime(mood === "alarm" ? 0.3 : 1, t, mood === "alarm" ? 0.15 : 1.2);
  engine.airFilter.frequency.setTargetAtTime(mood === "calm" ? 520 : 900, t, 1);
}

/** Sonido de interfaz: toque corto y suave al pulsar botones y enlaces. */
export function uiClick() {
  if (!engine) return;
  const { ac } = audio();
  const t = ac.currentTime + 0.005;
  const o = ac.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(1250, t);
  o.frequency.exponentialRampToValueAtTime(820, t + 0.05);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.05 * (0.4 + volume), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o.connect(g).connect(engine.echo);
  o.start(t);
  o.stop(t + 0.08);
}
