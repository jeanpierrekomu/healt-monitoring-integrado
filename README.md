# Healt Monitoring · Frontend + Backend

Panel web para vigilar la salud de astronautas en misión (NASA Space Apps 2026), ya conectado al backend del equipo en Supabase.

## Qué hay aquí

| Carpeta | Contenido |
| --- | --- |
| `frontend/` | La aplicación web (Next.js 16, React 19, TypeScript, Tailwind 4, Three.js). |
| `backend/` | La estructura del backend: el esquema de la base de datos en Supabase y los requisitos del gemelo muscular. El backend corre en Supabase; aquí no hay un servidor propio. |

## Cómo verlo

Requiere Node.js 20 o superior.

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Antes de `npm run dev`, abre `frontend/.env.local` y completa `NEXT_PUBLIC_SUPABASE_ANON_KEY` con la clave **publicable** de Supabase (nunca la secreta). Luego abre <http://localhost:3000>.

**Vercel:** Root Directory `frontend`; variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (base actual). Las de la base anterior (`NEXT_PUBLIC_LEGACY_SUPABASE_URL` / `_KEY`) se dejan vacías.

Sin esa clave, la app funciona igual con datos de ejemplo.

## Cómo se conectan

El **visor en Tierra** (`/ground`) lee la base de Supabase actual (ver `frontend/README.md`). La tabla siguiente es de la **base anterior**, ya deshabilitada; sin sus variables, el visor del espacio usa datos de ejemplo:

| Tabla del backend | Pantalla del frontend |
| --- | --- |
| `crew_members` | Astronautas y todos los selectores |
| `alerts` | Alertas, notificaciones y pop-ups |
| `readings` | Última lectura de cada tripulante |
| `missions`, `mission_members` | Misiones |
| `findings`, `model_runs` | Laboratorio IA → Hallazgos reales |
| `musculoskeletal_scans` | Gemelo muscular 3D |
| `scan_commands` | Botón "Iniciar reconstrucción profunda" |

Más detalle en [`frontend/README.md`](frontend/README.md) y [`backend/README.md`](backend/README.md).
