import { GroundShell } from "@/components/ground/shell";

/** Visor en Tierra: sistema de consulta y simulación conectado a la base de Supabase actual. */
export default function GroundLayout({ children }: { children: React.ReactNode }) {
  return <GroundShell>{children}</GroundShell>;
}
