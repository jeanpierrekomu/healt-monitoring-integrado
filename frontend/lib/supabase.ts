// Configuración única de Supabase (base actual). La usan las consultas de lib/queries.
// La clave es la PUBLICABLE (anon): solo permite leer lo que la base deja ver al público.
// La base anterior tiene su propia conexión aislada en services/supabase.ts.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const HAS_SUPABASE = Boolean(URL && KEY);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!HAS_SUPABASE) throw new Error("Supabase no está configurado: faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  client ??= createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export type PhotoBucket = "astronaut-photos" | "hardware-photos";

/** URL pública de una foto guardada en Supabase Storage (null si no hay ruta). */
export function photoUrl(bucket: PhotoBucket, path: string | null | undefined): string | null {
  if (!path || !HAS_SUPABASE) return null;
  if (/^https?:\/\//.test(path)) return path;
  return supabase().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
