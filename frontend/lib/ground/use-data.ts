"use client";

// Carga de datos en el navegador con estados de carga y error, y una caché corta para no repetir
// la misma consulta al cambiar de pantalla.
import { useCallback, useEffect, useState } from "react";

const cache = new Map<string, { at: number; promise: Promise<unknown> }>();

export interface DataState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

export function useData<T>(key: string | null, load: () => Promise<T>, ttlMs = 60_000): DataState<T> {
  const [state, setState] = useState<{ data: T | undefined; error: string | null; loading: boolean }>({ data: undefined, error: null, loading: Boolean(key) });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin consulta no hay nada que cargar
      setState({ data: undefined, error: null, loading: false });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    let hit = cache.get(key);
    if (!hit || Date.now() - hit.at > ttlMs) {
      hit = { at: Date.now(), promise: load() };
      cache.set(key, hit);
      hit.promise.catch(() => cache.delete(key));
    }
    hit.promise.then(
      (data) => alive && setState({ data: data as T, error: null, loading: false }),
      (e: unknown) => alive && setState({ data: undefined, error: e instanceof Error ? e.message : String(e), loading: false }),
    );
    return () => {
      alive = false;
    };
    // `load` cambia en cada render; la clave ya identifica la consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce, ttlMs]);
  const reload = useCallback(() => {
    if (key) cache.delete(key);
    setNonce((n) => n + 1);
  }, [key]);
  return { ...state, reload };
}
