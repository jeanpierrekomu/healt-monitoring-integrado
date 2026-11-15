# Healt Monitoring · Frontend

Panel web para vigilar la salud de astronautas en misión (NASA Space Apps 2026).
Hecho con Next.js 16, React 19, TypeScript, Tailwind 4, Motion y Three.js.

> La tripulación, las alertas y los hallazgos del modelo se leen del backend del equipo (Supabase).
> Lo demás sigue siendo de demostración: ver "Qué es real y qué es simulado".

## Cómo ejecutarlo

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>. `npm install` copia solo los archivos del detector corporal a `public/mediapipe/`.

Para la versión de producción:

```bash
npm run build
npm run start
```

## Backend (Supabase)

1. Copia `.env.example` como `.env.local`.
2. Completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_KEY` (la clave **publicable**, nunca la secreta).
3. Reinicia el servidor.

Sin esas variables, o si el backend no responde, la app usa los datos de ejemplo de `services/mock/`.
Los datos se guardan un minuto en caché; los pop-ups piden alertas nuevas cada 15 segundos.

| Tabla del backend | Dónde se ve |
| --- | --- |
| `crew_members` | Astronautas y todos los selectores |
| `alerts` | Alertas, notificaciones y pop-ups (las repetidas se agrupan) |
| `readings` | Última lectura de cada tripulante (pulso, oxigenación, temperatura de contacto) |
| `missions`, `mission_members` | Misiones (si están vacías, se muestran las de ejemplo con la tripulación real) |
| `findings`, `model_runs` | Laboratorio IA → Hallazgos reales |
| `musculoskeletal_scans` | Gemelo muscular: cuerpo 3D, simetría postural y carga por grupo muscular |
| `scan_commands` | El botón "Iniciar reconstrucción profunda" deja aquí el pedido para la estación con cámara |

La conexión está en `services/supabase.ts` y `services/backend.ts`; las traducciones de los textos del modelo, en `services/backend-text.ts`.

## Voz de las alertas (opcional)

Las alertas pueden hablar con una voz de ElevenLabs. Sin clave, la app usa la voz del navegador.

1. Copia `.env.example` como `.env.local`.
2. Pon tu clave en `ELEVENLABS_API_KEY` (o ejecuta `bash scripts/set-eleven-key.sh`, que la pide sin mostrarla).
3. Reinicia el servidor.

La clave solo se usa en el servidor (`app/api/tts`); nunca llega al navegador. `.env.local` no se sube a git.

## Secciones

| Sección | Ruta | Qué muestra |
| --- | --- | --- |
| Dashboard | `/dashboard` | Resumen de la misión, tripulación, descanso y botón "Probar alertas" |
| Astronautas | `/astronauts` | Lista y perfil de cada astronauta, con sus valores habituales |
| Misiones | `/missions` | Misiones en curso, planificadas y completadas |
| Monitorización | `/monitoring` | Holograma del cuerpo, corazón en vivo, salud ósea y modo sueño |
| Medición en vivo | `/live` | Cámara que sigue hasta a dos personas y cuatro lecturas (pulso, oxigenación, temperatura, movimiento) |
| Gemelo muscular | `/twin` | Cuerpo 3D en rojo con fibras, ajustado a las proporciones del último escaneo, con postura y carga muscular |
| Masa corporal | `/camera` | Estima la masa con la cámara: una vista de frente y otra de perfil |
| Alertas | `/alerts` | Historial de alertas y su revisión |
| Laboratorio IA | `/ai/vision` | Demostraciones de visión, audio y evaluación del modelo |
| Simulaciones | `/simulations` | Escenarios médicos para practicar |

## Qué es real y qué es simulado

- **Real (backend):** tripulación, alertas y hallazgos del modelo.
- **Real (cámara):** el seguimiento del cuerpo y la silueta (MediaPipe Pose, corre en el navegador; el video no se graba ni se envía).
- **Simulado:** las gráficas de signos vitales en vivo, la HRV (el dispositivo no la mide), la ficha médica de cada tripulante y las lecturas de "Medición en vivo" (reaccionan al movimiento que ve la cámara).
- **Estimación:** la masa corporal usa la silueta y la estatura; no es una medida médica.
- Los rangos por sexo, los valores habituales de cada astronauta y los umbrales de alerta son valores de ejemplo.

## Estructura

- `app/` — pantallas (App Router). `app/(app)/` es el panel; `app/api/tts/` es la voz.
- `components/` — piezas de interfaz (alertas, 3D, signos vitales, sonido ambiente).
- `services/` — datos de demostración y lógica (`services/mock/`, alertas, voz, pose, masa corporal).
- `lib/types.ts` — tipos compartidos.
- `public/models/` — modelos 3D y el modelo de pose.
