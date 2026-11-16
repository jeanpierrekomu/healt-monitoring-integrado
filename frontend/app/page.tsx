import type { Metadata } from "next";
import { RoleSelect } from "@/components/roles/role-select";

export const metadata: Metadata = { title: "Elige tu rol" };

/** Pantalla inicial: selección de rol (visor en Tierra o visor en el espacio). */
export default function Home() {
  return <RoleSelect />;
}
