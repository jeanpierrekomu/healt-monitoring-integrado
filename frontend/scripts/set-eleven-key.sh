#!/usr/bin/env bash
# Guarda tu clave de ElevenLabs en .env.local sin mostrarla en pantalla ni en el historial.
set -euo pipefail
cd "$(dirname "$0")/.."
read -rsp "Pega tu clave de ElevenLabs y presiona Enter (no se verá): " KEY
echo
if [ -z "$KEY" ]; then
  echo "No se escribió ninguna clave. No se cambió nada."
  exit 1
fi
touch .env.local
# Reemplaza la clave anterior si ya había una.
grep -v '^ELEVENLABS_API_KEY=' .env.local > .env.local.tmp || true
echo "ELEVENLABS_API_KEY=$KEY" >> .env.local.tmp
mv .env.local.tmp .env.local
chmod 600 .env.local
unset KEY
echo "Listo: clave guardada en frontend/web/.env.local (ignorado por git)."
echo "Ahora reinicia el servidor (Ctrl+C y npm run dev) y toca 'Activar voz' en la app."
