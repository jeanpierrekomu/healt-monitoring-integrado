import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Escribe un correo válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  remember: z.boolean(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const inviteSchema = z.object({
  name: z.string().min(3, "Escribe el nombre completo"),
  email: z.email("Escribe un correo válido"),
  role: z.enum(["Médico", "Investigador", "Administrador", "Observador"]),
});
export type InviteInput = z.infer<typeof inviteSchema>;
