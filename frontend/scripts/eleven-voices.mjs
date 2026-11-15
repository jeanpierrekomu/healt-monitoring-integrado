// Lista las voces de tu cuenta de ElevenLabs (nombre, idioma e id) sin mostrar la clave.
// Uso: node scripts/eleven-voices.mjs   (lee ELEVENLABS_API_KEY de .env.local)
import { readFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": env.ELEVENLABS_API_KEY } });
if (!res.ok) {
  console.error("ElevenLabs respondió", res.status, await res.text());
  process.exit(1);
}
const { voices } = await res.json();
for (const v of voices) console.log(v.voice_id.padEnd(24), v.name.padEnd(28), Object.values(v.labels ?? {}).join(", "));
