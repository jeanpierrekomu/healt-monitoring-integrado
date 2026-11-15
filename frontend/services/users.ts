import type { PlatformUser, Role } from "@/lib/types";
import { apiGet, apiPost, USE_MOCK } from "./api";
import { users } from "./mock/data";

export async function getUsers(): Promise<PlatformUser[]> {
  if (USE_MOCK) return users;
  return apiGet<PlatformUser[]>("/admin/users");
}

export async function inviteUser(input: { name: string; email: string; role: Role }): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 700));
    return;
  }
  await apiPost("/admin/users/invite", input);
}

export async function signIn(input: { email: string; password: string }): Promise<{ ok: true }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 900));
    return { ok: true };
  }
  return apiPost("/auth/login", input);
}
