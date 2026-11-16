"use client";

// Pantalla inicial: "¿Quién eres?". Selección de rol como en un videojuego de pelea: dos mitades a pantalla
// completa (Tierra y Espacio). La que tiene el foco crece y se enciende; la otra se apaga.
// Ratón, toque o teclado (← → y Enter). La elección se recuerda en este navegador.
import { CornerDownLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LangToggle } from "@/components/i18n/translator";
import type { RoleKind } from "@/components/three/role-avatar";
import { audio } from "@/services/tts";

const RoleAvatar = dynamic(() => import("@/components/three/role-avatar"), { ssr: false });

export const ROLE_KEY = "hm-rol";

interface RoleInfo {
  kind: RoleKind;
  href: string;
  num: string;
  word: string;
  title: string;
  who: string;
  verbs: string[];
  accent: string;
  bg: string;
}

const ROLES: RoleInfo[] = [
  {
    kind: "ground",
    href: "/ground",
    num: "01",
    word: "Tierra",
    title: "Visor en Tierra",
    who: "Especialista médico · Control de misión",
    verbs: ["Revisa las alertas", "Compara tendencias", "Aconseja a la nave"],
    accent: "#2ee59d",
    bg: "#03130d",
  },
  {
    kind: "space",
    href: "/dashboard",
    num: "02",
    word: "Espacio",
    title: "Visor en el espacio",
    who: "Médico de vuelo · A bordo",
    verbs: ["Mide en vivo", "Atiende alertas", "Usa la cámara"],
    accent: "#5b9bff",
    bg: "#040a1d",
  },
];

/** Sonidos cortos de menú, sintetizados (sin archivos). */
function blip(freqs: number[], step = 0.07, vol = 0.07) {
  try {
    const { ac, out } = audio();
    void ac.resume();
    freqs.forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      const t = ac.currentTime + i * step;
      o.type = "square";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.14);
    });
  } catch {
    // sin audio
  }
}

export function RoleSelect() {
  const router = useRouter();
  const [focus, setFocus] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Al volver a esta pantalla (botón atrás o "Cambiar de rol") se puede elegir de nuevo:
  // la app guarda la pantalla en memoria y, sin esto, quedaría bloqueada con la elección anterior.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- se reinicia la selección al mostrarse
    setChosen(null);
    const onShow = () => setChosen(null);
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("pageshow", onShow);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const choose = useCallback(
    (i: number) => {
      if (chosen !== null) return;
      setFocus(i);
      setChosen(i);
      blip([392, 523, 659, 1047], 0.06, 0.06);
      try {
        window.localStorage.setItem(ROLE_KEY, ROLES[i].kind);
      } catch {
        // sin almacenamiento
      }
      timer.current = setTimeout(() => router.push(ROLES[i].href), 950);
    },
    [chosen, router],
  );
  const hover = useCallback(
    (i: number) => {
      if (chosen !== null || i === focus) return;
      setFocus(i);
      blip([660], 0.05, 0.035);
    },
    [chosen, focus],
  );

  // Teclado: ← → (o ↑ ↓) para cambiar, Enter o Espacio para elegir.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") hover(0);
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") hover(1);
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        choose(focus);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, hover, focus]);

  useEffect(() => {
    router.prefetch("/ground");
    router.prefetch("/dashboard");
  }, [router]);

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-black text-white md:flex-row">
      {ROLES.map((r, i) => {
        const on = focus === i;
        const picked = chosen === i;
        const grow = chosen === null ? (on ? 1.8 : 1) : picked ? 40 : 0.0001;
        return (
          <motion.button
            key={r.kind}
            type="button"
            onMouseEnter={() => hover(i)}
            onFocus={() => hover(i)}
            onClick={() => choose(i)}
            aria-label={r.title}
            aria-pressed={on}
            initial={{ flexGrow: 1 }}
            animate={{ flexGrow: grow }}
            transition={{ type: "spring", stiffness: 160, damping: 24 }}
            className="group relative min-h-0 min-w-0 basis-0 cursor-pointer overflow-hidden text-left outline-none"
            style={{ backgroundColor: r.bg }}
          >
            {/* Palabra gigante detrás del personaje */}
            <motion.span
              aria-hidden
              animate={{ opacity: on ? 1 : 0.18, y: on ? 0 : 30 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute top-[22%] left-1/2 -translate-x-1/2 text-[26vw] leading-[0.75] font-black tracking-[-0.075em] whitespace-nowrap uppercase select-none md:top-[19%] md:text-[15vw]"
              style={{ color: r.accent }}
            >
              {r.word}
            </motion.span>

            {/* Personaje 3D */}
            <motion.div
              className="absolute inset-0"
              animate={{ filter: on ? "grayscale(0) brightness(1)" : "grayscale(1) brightness(0.45)" }}
              transition={{ duration: 0.45 }}
            >
              <RoleAvatar kind={r.kind} active={on} />
            </motion.div>

            {/* Sombra inferior para leer el texto */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black via-black/75 to-transparent" />

            {/* Texto del rol */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 pb-6 md:p-10 md:pb-20">
              <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.28em] uppercase" style={{ color: r.accent }}>
                <span className="text-2xl leading-none font-black tracking-normal" style={{ color: "transparent", WebkitTextStroke: `1px ${r.accent}` }}>
                  {r.num}
                </span>
                {r.who}
              </p>
              <h2 className="mt-2 text-3xl leading-none font-black tracking-tight md:text-5xl">{r.title}</h2>
              <motion.ul
                initial={false}
                animate={{ opacity: on ? 1 : 0, height: on ? "auto" : 0, marginTop: on ? 18 : 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-wrap gap-x-7 gap-y-2 overflow-hidden"
              >
                {r.verbs.map((v, k) => (
                  <li key={v} className="flex items-baseline gap-2 text-sm font-semibold md:text-base">
                    <span className="font-mono text-xs" style={{ color: r.accent }}>
                      {String(k + 1).padStart(2, "0")}
                    </span>
                    {v}
                  </li>
                ))}
              </motion.ul>
              <motion.span
                initial={false}
                animate={{ opacity: on ? 1 : 0, x: on ? 0 : -20 }}
                transition={{ duration: 0.3 }}
                className="mt-6 inline-flex h-12 items-center gap-3 pr-8 pl-6 text-sm font-black tracking-[0.2em] text-black uppercase"
                style={{ backgroundColor: r.accent, clipPath: "polygon(0 0, 100% 0, calc(100% - 16px) 100%, 0 100%)" }}
              >
                Entrar <CornerDownLeft className="size-4" />
              </motion.span>
            </div>

            {/* Borde de foco */}
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              animate={{ boxShadow: on ? `inset 0 0 0 3px ${r.accent}` : "inset 0 0 0 0px transparent" }}
            />

            {/* Barrido al elegir */}
            <AnimatePresence>
              {picked && (
                <motion.div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  initial={{ clipPath: "inset(0 100% 0 0)" }}
                  animate={{ clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)", "inset(0 0% 0 100%)"] }}
                  transition={{ duration: 0.85, times: [0, 0.45, 1], ease: "easeInOut" }}
                  style={{ backgroundColor: r.accent }}
                >
                  <span className="text-4xl font-black tracking-tight text-black uppercase md:text-7xl">{r.title}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}

      {/* Cabecera */}
      <header className="pointer-events-none z-20 order-first flex shrink-0 items-start justify-between gap-4 bg-black p-5 md:absolute md:inset-x-0 md:top-0 md:order-none md:bg-transparent md:p-8">
        <div>
          <p className="font-mono text-[11px] font-bold tracking-[0.3em] text-white/60 uppercase">Healt Monitoring · Elige tu rol</p>
          <h1 className="mt-1.5 text-2xl leading-none font-black tracking-tight drop-shadow-[0_2px_12px_rgb(0_0_0/0.8)] md:text-5xl">¿Quién eres?</h1>
        </div>
        <div className="pointer-events-auto">
          <LangToggle />
        </div>
      </header>

      {/* Ayuda de teclado */}
      <p className="pointer-events-none absolute inset-x-0 bottom-4 z-20 hidden text-center font-mono text-[11px] tracking-[0.2em] text-white/50 uppercase md:block">
        ← → cambiar · ↵ elegir
      </p>
    </main>
  );
}
