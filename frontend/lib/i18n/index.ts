// Idioma de la interfaz. La app está escrita en español; el inglés se aplica con un diccionario
// (lib/i18n/en.json) sobre los textos ya dibujados. El idioma elegido se guarda en este navegador.
export type Lang = "en" | "es";
export const LANG_KEY = "hm-lang";
export const DEFAULT_LANG: Lang = "en";

export function getLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    return v === "es" || v === "en" ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

/** Cambia el idioma y recarga la página para aplicarlo en todas partes. */
export function setLang(lang: Lang) {
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    // sin almacenamiento: el cambio no se recuerda
  }
  window.location.reload();
}

interface Dictionary {
  /** Texto exacto en español → inglés. */
  exact: Record<string, string>;
  /** Frases con datos variables: ["hace ‹1› min", "‹1› min ago"]. */
  patterns: [string, string][];
}

let exact: Map<string, string> | null = null;
let patterns: { re: RegExp; to: string; dots: boolean }[] = [];
const memo = new Map<string, string | null>();
const HAS_WORD = /[A-Za-zÁÉÍÓÚáéíóúñÑ]{2,}/;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Carga el diccionario (una sola vez). Sin él, `translate` devuelve el texto tal cual. */
export async function loadDictionary() {
  if (exact) return;
  const dict = (await import("./en.json")).default as unknown as Dictionary;
  exact = new Map(Object.entries(dict.exact));
  patterns = dict.patterns
    .filter(([from]) => from.replace(/‹\d+›/g, "").replace(/[^A-Za-zÁ-ú]/g, "").length >= 2) // sin letras fijas sería demasiado general
    .sort((a, b) => b[0].length - a[0].length) // primero las más específicas
    .map(([from, to]) => ({ re: new RegExp("^" + from.split(/‹\d+›/).map(esc).join("(.+?)") + "$", "s"), to, dots: from.includes(" · "), order: [...from.matchAll(/‹(\d+)›/g)].map((m) => m[1]) }))
    .map(({ re, to, order, dots }) => ({ re, dots, to: to.replace(/‹(\d+)›/g, (_, n: string) => `\u0000${order.indexOf(n)}\u0000`) }));
}

/** Traduce un texto de la interfaz al inglés. Devuelve el mismo texto si no hay traducción. */
export function translate(text: string): string {
  if (!exact || !text || !HAS_WORD.test(text)) return text;
  const hit = memo.get(text);
  if (hit !== undefined) return hit ?? text;
  const lead = text.match(/^\s*/)![0];
  const trail = text.match(/\s*$/)![0];
  const core = text.slice(lead.length, text.length - trail.length).replace(/\s+/g, " ");
  let out = exact.get(core) ?? null;
  const composite = core.includes(" · ");
  const tryPatterns = (onlyDots: boolean) => {
    for (const p of patterns) {
      if (onlyDots && !p.dots) continue;
      const m = core.match(p.re);
      if (!m) continue;
      // Los datos variables también se traducen si son textos conocidos (p. ej. "Alerta grave.").
      return p.to.replace(/\u0000(\d+)\u0000/g, (_, i: string) => translate(m[Number(i) + 1] ?? ""));
    }
    return null;
  };
  if (out === null && composite) {
    // Texto compuesto ("A · B · C"): primero las frases que ya incluyen los puntos; si no, cada parte por separado.
    out = tryPatterns(true);
    if (out === null) {
      const parts = core.split(" · ");
      const done = parts.map((part) => translate(part));
      if (done.some((d, i) => d !== parts[i])) out = done.join(" · ");
    }
  } else if (out === null) out = tryPatterns(false);
  const result = out === null ? null : lead + out + trail;
  if (memo.size > 5000) memo.clear();
  memo.set(text, result);
  return result ?? text;
}
