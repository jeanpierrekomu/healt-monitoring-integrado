// Cliente base de la API. Mientras NEXT_PUBLIC_USE_MOCK no sea "false",
// los servicios devuelven los datos ficticios de services/mock.
// Para conectar FastAPI: NEXT_PUBLIC_USE_MOCK=false y NEXT_PUBLIC_API_URL=https://...

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new ApiError(res.status, `GET ${path} falló (${res.status})`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, `POST ${path} falló (${res.status})`);
  return res.json() as Promise<T>;
}
