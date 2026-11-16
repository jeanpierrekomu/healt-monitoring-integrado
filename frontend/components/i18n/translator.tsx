"use client";

// Aplica el inglés a toda la interfaz: recorre los textos ya dibujados y los reemplaza con el diccionario,
// y sigue atento a lo que cambie después (datos en vivo, pantallas nuevas). En español no hace nada.
import { useEffect } from "react";
import { getLang, loadDictionary, setLang, translate, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useState } from "react";

const ATTRS = ["title", "placeholder", "aria-label"];
const SKIP = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "NOSCRIPT"]);

function translateNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    if (!parent || SKIP.has(parent.tagName) || parent.closest("[data-no-i18n]")) return;
    const v = node.nodeValue ?? "";
    const t = translate(v);
    if (t !== v) node.nodeValue = t;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  // Cuadro de texto con un ejemplo ya escrito: se traduce solo si el usuario no lo ha tocado.
  if (el.tagName === "TEXTAREA") {
    const ta = el as HTMLTextAreaElement;
    if (ta.value && ta.value === ta.defaultValue) ta.value = translate(ta.value);
    const ph = ta.getAttribute("placeholder");
    if (ph && translate(ph) !== ph) ta.setAttribute("placeholder", translate(ph));
  }
  if (SKIP.has(el.tagName) || el.hasAttribute("data-no-i18n")) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v) {
      const t = translate(v);
      if (t !== v) el.setAttribute(a, t);
    }
  }
  for (const child of el.childNodes) translateNode(child);
}

function translateTitle() {
  const parts = document.title.split(" · ").map((p) => translate(p));
  const t = parts.join(" · ");
  if (t !== document.title) document.title = t;
}

export function Translator() {
  useEffect(() => {
    const done = () => document.documentElement.classList.remove("i18n-wait");
    if (getLang() !== "en") return done();
    let observer: MutationObserver | null = null;
    let cancelled = false;
    // Se espera a que la página termine de cargar y de activarse: si se traduce antes, React detecta que el
    // texto no coincide con el que envió el servidor y vuelve a dibujar la pantalla.
    const settled = new Promise<void>((resolve) => {
      const idle = () => {
        const ric = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 120));
        ric(() => ric(() => resolve(), { timeout: 500 }), { timeout: 500 });
      };
      if (document.readyState === "complete") idle();
      else window.addEventListener("load", idle, { once: true });
    });
    Promise.all([loadDictionary(), settled])
      .then(() => {
        if (cancelled) return;
        translateNode(document.body);
        translateTitle();
        observer = new MutationObserver((records) => {
          for (const r of records) {
            if (r.type === "characterData") translateNode(r.target);
            else if (r.type === "attributes") translateNode(r.target);
            else r.addedNodes.forEach(translateNode);
          }
          translateTitle();
        });
        observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
        const head = document.querySelector("title");
        if (head) observer.observe(head, { childList: true, characterData: true, subtree: true });
      })
      .finally(done);
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);
  return null;
}

/** Botón de idioma: inglés (por defecto) o español. */
export function LangToggle() {
  const [lang, setCurrent] = useState<Lang>("en");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preferencia guardada en el navegador
    setCurrent(getLang());
  }, []);
  return (
    <div data-no-i18n className="flex h-10 items-center rounded-xl border border-border bg-surface p-1 text-xs font-semibold" role="group" aria-label="Language / Idioma">
      {(["en", "es"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          title={l === "en" ? "English" : "Español"}
          onClick={() => lang !== l && setLang(l)}
          className={cn("h-full rounded-lg px-2.5 uppercase transition-colors", lang === l ? "bg-primary text-white" : "text-muted hover:text-fg")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
