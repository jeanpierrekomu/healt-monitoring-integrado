"use client";

// Alertas emergentes de toda la app: cola, alertas ya vistas, enfriamiento y voz.
// Hoy las alimentan las alertas registradas y los signos vitales simulados; cuando exista el backend,
// `notify` se llamará desde la suscripción en tiempo real y la interfaz no cambia.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Astronaut, Status, VitalKey } from "@/lib/types";
import { alertFromBackend, alertFromVital, demoAlerts, feedAlert, type PopupAlert } from "@/services/alert-messages";
import { describeReason } from "@/services/backend-text";
import { HAS_BACKEND, sbSelect, type AlertRow } from "@/services/supabase";
import { statusFor, statusRank, vitalContext } from "@/services/education";
import { speak, stopSpeech, unlockAudio, type VoiceEngine } from "@/services/tts";

export type ShownAlert = PopupAlert & { engine?: VoiceEngine };

interface AlertPopupValue {
  items: ShownAlert[];
  notify: (a: PopupAlert) => void;
  dismiss: (id: string) => void;
  report: (a: Astronaut, key: VitalKey, value: number, status: Status) => void;
  voiceOn: boolean;
  setVoice: (on: boolean) => void;
  mute: () => void;
  /** true tras "Silenciar voz": calla también el pitido de recordatorio hasta la próxima alerta. */
  silenced: boolean;
  /** Alertas esperando su turno (se muestran de a una, cada 15 s). */
  pending: number;
  /** Segundos que faltan para la siguiente alerta en espera (null si no hay). */
  nextIn: number | null;
  /** Simulación en vivo: llega una alerta nueva cada 15 s (hasta que exista el backend). */
  autoOn: boolean;
  setAuto: (on: boolean) => void;
  /** Lanza las tres alertas de ejemplo: leve (grupo), grave y máxima. */
  runDemo: () => void;
}

const Ctx = createContext<AlertPopupValue | null>(null);
const AUTO_KEY = "hm-alertas-activas"; // encendidas por defecto; se apagan con el botón de la barra superior
const VOICE_KEY = "hm-voz";
const COOLDOWN_MS = 3 * 60_000; // misma variable y persona: no repetir antes de 3 min…
const WORSEN_FACTOR = 1.4; // …salvo que empeore claramente (40 % más lejos de su normal)
const GAP_MS = 15_000; // las alertas salen de a una, con al menos 15 segundos entre cada una

export function AlertPopupProvider({
  children,
  initial,
  crew,
}: {
  children: React.ReactNode;
  initial: PopupAlert[];
  crew: Pick<Astronaut, "id" | "name" | "sex" | "baseline">[];
}) {
  const [items, setItems] = useState<ShownAlert[]>([]);
  // La voz viene activada por defecto; solo se apaga si el usuario la desactivó.
  const [voiceOn, setVoiceOn] = useState(true);
  const [silenced, setSilenced] = useState(false);
  const [autoOn, setAutoOn] = useState(true);
  const autoRef = useRef(true);
  useEffect(() => {
    autoRef.current = autoOn;
  }, [autoOn]);
  const feedIndex = useRef(0);
  const busy = useRef(false);
  const [queue, setQueue] = useState<PopupAlert[]>([]);
  const [nextAt, setNextAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const lastShown = useRef(0);
  const seen = useRef<Set<string>>(new Set());
  const last = useRef(new Map<string, { time: number; rank: number; badness: number }>());
  const voiceRef = useRef(true);

  useEffect(() => {
    voiceRef.current = voiceOn;
  }, [voiceOn]);

  const setEngine = useCallback((id: string, engine: VoiceEngine) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, engine } : x)));
  }, []);

  const notify = useCallback(
    (a: PopupAlert) => {
      if (seen.current.has(a.id)) return;
      seen.current.add(a.id);
      // No se muestra de inmediato: entra a la cola y sale cuando le toca.
      setQueue((q) => [...q, a]);
    },
    [],
  );

  // Turnos: una alerta visible a la vez y al menos 15 s entre una y la siguiente.
  useEffect(() => {
    if (!queue.length) {
      setNextAt(null); // eslint-disable-line react-hooks/set-state-in-effect -- reloj de turnos
      return;
    }
    if (items.length) {
      // Mientras se ve una, la siguiente queda programada para 15 s después de que apareció esta.
      setNextAt(lastShown.current + GAP_MS);
      return;
    }
    const due = Math.max(Date.now(), lastShown.current + GAP_MS);
    setNextAt(due);
    const timer = setTimeout(() => {
      const [a, ...rest] = queue;
      lastShown.current = Date.now();
      setQueue(rest);
      setItems([a]);
      setSilenced(false);
      if (voiceRef.current) speak(a.speech, (e) => setEngine(a.id, e), a.severity);
    }, due - Date.now());
    return () => clearTimeout(timer);
  }, [items.length, queue, setEngine]);

  // Cuenta regresiva visible para la siguiente alerta.
  useEffect(() => {
    if (nextAt === null) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [nextAt]);
  const nextIn = nextAt === null ? null : Math.max(0, Math.ceil((nextAt - (nowTick || nextAt)) / 1000));

  // Simulación en vivo: cada 15 s entra una alerta nueva (si no hay otra esperando o en pantalla).
  useEffect(() => {
    busy.current = items.length > 0 || queue.length > 0;
  }, [items.length, queue.length]);
  useEffect(() => {
    if (!autoOn) return;
    if (HAS_BACKEND) {
      // Con backend: cada 15 s se piden las alertas nuevas. La misma alerta (persona y motivo) no se repite antes de 3 min.
      let since: number | null = null;
      let stopped = false;
      const poll = async () => {
        try {
          if (since === null) {
            // Al empezar solo se toma nota de la última: no se muestran las antiguas.
            const [lastRow] = await sbSelect<AlertRow>("alerts", "select=id&order=id.desc&limit=1");
            since = lastRow?.id ?? 0;
            return;
          }
          const rows = await sbSelect<AlertRow>("alerts", `select=*&id=gt.${since}&order=id.asc&limit=20`);
          if (stopped) return;
          for (const r of rows) {
            since = Math.max(since, r.id);
            const who = crew.find((c) => c.id === r.crew_member_id);
            if (!who) continue;
            const k = `${who.id}:${describeReason(r.reason).title}`;
            const prev = last.current.get(k);
            const t = Date.now();
            if (prev && t - prev.time < COOLDOWN_MS) continue;
            last.current.set(k, { time: t, rank: 0, badness: 0 });
            notify(alertFromBackend(r, who.name));
          }
        } catch {
          // sin conexión: se reintenta en la siguiente vuelta
        }
      };
      void poll();
      const id = setInterval(poll, GAP_MS);
      return () => {
        stopped = true;
        clearInterval(id);
      };
    }
    // Sin backend: simulación, una alerta nueva cada 15 s.
    const id = setInterval(() => {
      if (busy.current) return;
      notify(feedAlert(crew, feedIndex.current++));
    }, GAP_MS);
    return () => clearInterval(id);
  }, [autoOn, crew, notify]);

  const setAuto = useCallback((on: boolean) => {
    setAutoOn(on);
    if (!on) {
      // Al apagarlas se retiran las que estén en pantalla o esperando, y se calla el sonido.
      setItems([]);
      setQueue([]);
      stopSpeech();
    }
    try {
      window.localStorage.setItem(AUTO_KEY, on ? "1" : "0");
    } catch {
      // sin almacenamiento
    }
  }, []);

  const dismiss = useCallback((id: string) => setItems((prev) => prev.filter((x) => x.id !== id)), []);

  const report = useCallback(
    (a: Astronaut, key: VitalKey, value: number, status: Status) => {
      if (!autoRef.current) return; // alertas apagadas
      const rank = statusRank(status);
      if (rank < 2) return; // solo advertencia y crítico
      // "Sin pulso" es otra alerta distinta a la taquicardia: tiene su propio turno.
      const k = `${a.id}:${key === "hr" && value < 30 ? "arrest" : key}`;
      const badness = Math.abs(value - a.baseline[key]);
      const prev = last.current.get(k);
      const t = Date.now();
      const ok =
        !prev ||
        rank > prev.rank ||
        badness >= prev.badness * WORSEN_FACTOR ||
        t - prev.time > COOLDOWN_MS;
      if (!ok) return;
      last.current.set(k, { time: t, rank, badness });
      notify(alertFromVital(a, key, value, status));
    },
    [notify],
  );

  // Al entrar a la app: alertas críticas pendientes que todavía no se mostraron en esta pestaña.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferencia guardada en el navegador
      setVoiceOn(window.localStorage.getItem(VOICE_KEY) !== "0");
      const auto = window.localStorage.getItem(AUTO_KEY) !== "0";
      autoRef.current = auto;
      setAutoOn(auto);
    } catch {
      // sin almacenamiento
    }
    for (const a of initial) {
      if (a.value !== null && a.topic !== "bone" && a.topic !== "model") {
        const who = crew.find((c) => c.id === a.astronautId);
        const base = who && a.topic !== "arrest" ? who.baseline[a.topic] : a.value;
        last.current.set(`${a.astronautId}:${a.topic}`, { time: Date.now(), rank: statusRank(a.severity), badness: Math.abs(a.value - base) });
      }
    }
    const timer = setTimeout(() => {
      if (autoRef.current) for (const a of initial) notify(a);
    }, 1200);
    return () => clearTimeout(timer);
  }, [initial, notify, crew]);

  const setVoice = useCallback((on: boolean) => {
    if (on) unlockAudio();
    else stopSpeech();
    setVoiceOn(on);
    try {
      window.localStorage.setItem(VOICE_KEY, on ? "1" : "0");
    } catch {
      // sin almacenamiento
    }
  }, []);

  const mute = useCallback(() => {
    stopSpeech();
    setSilenced(true);
  }, []);

  const runDemo = useCallback(() => {
    // Al pedir la demo, la primera sale de inmediato; las siguientes, cada 15 s.
    if (!items.length && !queue.length) lastShown.current = 0;
    demoAlerts(crew).forEach((a) => notify(a));
  }, [crew, notify, items.length, queue.length]);

  const value = useMemo(
    () => ({ items, notify, dismiss, report, voiceOn, setVoice, mute, silenced, pending: queue.length, nextIn, autoOn, setAuto, runDemo }),
    [items, notify, dismiss, report, voiceOn, setVoice, mute, silenced, queue.length, nextIn, autoOn, setAuto, runDemo],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAlertPopup() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAlertPopup debe usarse dentro de <AlertPopupProvider>");
  return ctx;
}

/** Vigila un signo vital en vivo y avisa cuando su estado empeora (o sigue empeorando). */
export function useVitalWatch(a: Astronaut, key: VitalKey, value: number) {
  const { report } = useAlertPopup();
  const status = statusFor(key, value, vitalContext(a, key));
  const prev = useRef<Status | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = status;
    // No avisar al montar: solo cuando cambia (las críticas pendientes ya se muestran al entrar).
    if (before === null) return;
    if (statusRank(status) > statusRank(before) || statusRank(status) === 3) report(a, key, value, status);
  }, [a, key, value, status, report]);
}
