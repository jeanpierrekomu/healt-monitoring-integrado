// Voz de las alertas con ElevenLabs. Es la ÚNICA parte que conoce la clave (variables de entorno del servidor).
// Variables (en frontend/web/.env.local, ignorado por git):
//   ELEVENLABS_API_KEY   clave de la cuenta
//   ELEVENLABS_VOICE_ID  opcional: voz elegida en la cuenta. Si falta, se elige sola una voz en español.
//   ELEVENLABS_MODEL_ID  opcional (por defecto eleven_multilingual_v2, habla español)
const MAX_CHARS = 300;
// Solo frases generadas por la app (services/alert-messages.ts): nadie puede usar la clave para leer texto arbitrario.
// Solo frases de alerta, en español o en inglés.
const ALLOWED = /^(Alerta (leve|grave|máxima)|(Minor|Serious|Critical) alert)\. [\p{L}\p{N} ,.:%°ºáéíóúñü¿?¡!'-]+$/u;

let autoVoice: string | null = null;

/** Si no se eligió voz, toma de la cuenta la primera en español (o la primera disponible). */
async function pickVoice(key: string): Promise<string | null> {
  if (autoVoice) return autoVoice;
  const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": key } });
  if (!res.ok) return null;
  const { voices } = (await res.json()) as { voices: { voice_id: string; labels?: Record<string, string> }[] };
  const spanish = voices.find((v) => /spanish|español|es\b|latin|mexic|castil/i.test(Object.values(v.labels ?? {}).join(" ")));
  autoVoice = (spanish ?? voices[0])?.voice_id ?? null;
  return autoVoice;
}

export async function POST(request: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return Response.json({ error: "Voz de ElevenLabs no configurada: falta ELEVENLABS_API_KEY en .env.local." }, { status: 503 });
  }
  const voice = process.env.ELEVENLABS_VOICE_ID || (await pickVoice(key));
  if (!voice) return Response.json({ error: "No se encontró ninguna voz en la cuenta de ElevenLabs." }, { status: 503 });

  // Solo se acepta desde la propia app.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }

  let text: unknown;
  try {
    ({ text } = await request.json());
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  if (typeof text !== "string" || text.length > MAX_CHARS || !ALLOWED.test(text)) {
    return Response.json({ error: "Texto no permitido." }, { status: 400 });
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
      // Voz de alarma: estable y clara (como una torre de control), sin dramatizar.
      voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.1 },
    }),
  });
  if (!res.ok || !res.body) {
    return Response.json({ error: `ElevenLabs respondió ${res.status}.` }, { status: 502 });
  }
  return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
