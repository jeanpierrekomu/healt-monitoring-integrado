// Utilidades de consulta: convierten errores de Supabase en excepciones legibles.
import { supabase } from "@/lib/supabase";

export async function rows<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export async function one<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T | null> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? null) as T | null;
}

/** Cantidad de filas de una tabla sin descargarlas. */
export async function count(table: string, filter?: (q: ReturnType<ReturnType<typeof supabase>["from"]>["select"] extends (...a: never[]) => infer R ? R : never) => unknown): Promise<number> {
  let q = supabase().from(table).select("id", { count: "exact", head: true });
  if (filter) q = filter(q as never) as typeof q;
  const { count: n, error } = await q;
  if (error) throw new Error(error.message);
  return n ?? 0;
}

/** Mapa id → fila para unir tablas en el navegador (sin depender de relaciones declaradas en la base). */
export function byId<T extends { id: string }>(list: T[]): Map<string, T> {
  return new Map(list.map((x) => [x.id, x]));
}
