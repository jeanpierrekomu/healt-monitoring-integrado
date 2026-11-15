# Backend (Supabase)

El backend del proyecto es una base de datos en Supabase. El frontend la consulta por su API; no hay un servidor intermedio.

| Archivo | Qué es |
| --- | --- |
| `schema_supabase.sql` | Estructura de las tablas. Es solo de referencia: no está pensado para ejecutarse tal cual. |
| `gemelo-muscular-requisitos.txt` | Lo que el backend pide al frontend para el gemelo muscular 3D (tabla `musculoskeletal_scans` y comandos en `scan_commands`). |

## Qué usa hoy el frontend

- **Lee:** `crew_members`, `alerts`, `readings`, `missions`, `mission_members`, `findings`, `model_runs`, `musculoskeletal_scans`.
- **Escribe:** solo `scan_commands`, cuando el médico pulsa "Iniciar reconstrucción profunda".
- **Todavía no usa:** `devices`, `device_assignments`, `sessions`, `profiles`, `insights`, `events`, `alert_links`, `alert_reviews`, `nasa_imports`.

## Pendiente de acordar con el backend

- La tabla `scan_commands` no aparece en `schema_supabase.sql`, aunque existe en la base.
- Los valores posibles de las listas (prioridad y estado de alerta, nivel de riesgo, roles) figuran como `USER-DEFINED`.
- El backend no guarda sexo, edad ni valores habituales de cada tripulante; el frontend usa valores de ejemplo.
- `readings` trae temperatura de contacto (piel) y no trae HRV.
- Con la clave publicable se pueden leer las alertas sin iniciar sesión.
