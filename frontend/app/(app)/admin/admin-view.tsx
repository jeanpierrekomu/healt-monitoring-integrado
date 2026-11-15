"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, Bell, Loader2, Plus, Search, Shield, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PageHeader, Segmented } from "@/components/ui/animated";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { Avatar, Button, Pill, type PillTone } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/stat-card";
import type { PlatformUser, Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { inviteSchema, type InviteInput } from "@/schemas/forms";
import { inviteUser } from "@/services/users";

const ROLE_TONE: Record<Role, PillTone> = { Médico: "primary", Investigador: "atencion", Administrador: "advertencia", Observador: "muted" };
const STATE_DOT = { Activo: "bg-normal", "Invitación pendiente": "bg-atencion", Inactivo: "bg-muted" } as const;

function InviteModal({ onClose, onInvite }: { onClose: () => void; onInvite: (u: PlatformUser) => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "Médico" },
  });
  const submit = async (v: InviteInput) => {
    await inviteUser(v);
    const initials = v.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
    onInvite({ id: crypto.randomUUID(), initials, name: v.name, email: v.email, role: v.role, state: "Invitación pendiente", lastAccess: "—" });
  };
  const field = "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary/60";
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit(submit)}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold">Invitar usuario</p>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:text-fg"><X className="size-4" /></button>
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
          Nombre completo
          <input {...register("name")} className={field} placeholder="Dra. Laura Gómez" />
          {errors.name && <span className="text-critico">{errors.name.message}</span>}
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
          Correo
          <input {...register("email")} className={field} placeholder="laura.gomez@healt.space" />
          {errors.email && <span className="text-critico">{errors.email.message}</span>}
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
          Rol
          <select {...register("role")} className={field}>
            {Object.keys(ROLE_TONE).map((r) => <option key={r} className="bg-surface">{r}</option>)}
          </select>
        </label>
        <div className="mt-2 flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />} Enviar invitación
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
}

export function AdminView({ initialUsers }: { initialUsers: PlatformUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [tab, setTab] = useState("usuarios");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const shown = users.filter((u) => (u.name + u.email).toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Administración"
        subtitle="Usuarios, roles, permisos y fuentes de datos de la plataforma"
        actions={<Button onClick={() => setModal(true)}><Plus className="size-4" /> Invitar usuario</Button>}
      />
      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StaggerItem><StatCard icon={Users} title="Usuarios activos" value={users.filter((u) => u.state === "Activo").length + 10} /></StaggerItem>
        <StaggerItem><StatCard icon={Shield} title="Roles definidos" value={4} /></StaggerItem>
        <StaggerItem><StatCard icon={Activity} title="Fuentes conectadas" value={3} /></StaggerItem>
        <StaggerItem><StatCard icon={Bell} title="Invitaciones pendientes" value={users.filter((u) => u.state === "Invitación pendiente").length} tone="text-atencion" /></StaggerItem>
      </Stagger>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented id="admin-tab" value={tab} onChange={setTab} options={[
          { value: "usuarios", label: "Usuarios" },
          { value: "roles", label: "Roles y permisos" },
          { value: "fuentes", label: "Fuentes de datos" },
          { value: "auditoria", label: "Auditoría" },
        ]} />
        <label className="ml-auto flex h-10 w-full items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 focus-within:border-primary/60 sm:w-72">
          <Search className="size-4 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o correo" className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted" />
        </label>
      </div>
      {tab === "usuarios" ? (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead>
              <tr className="bg-surface-2/70 text-[11px] tracking-wider text-muted">
                {["NOMBRE", "CORREO", "ROL", "ESTADO", "ÚLTIMO ACCESO", ""].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {shown.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    layout
                    initial={{ opacity: 0, backgroundColor: "rgba(79,140,255,0.18)" }}
                    animate={{ opacity: 1, backgroundColor: "rgba(79,140,255,0)", transition: { delay: i * 0.03, backgroundColor: { duration: 1.6 } } }}
                    exit={{ opacity: 0 }}
                    className="border-t border-border hover:bg-surface-2/50"
                  >
                    <td className="px-5 py-3"><span className="flex items-center gap-2.5 font-semibold"><Avatar initials={u.initials} size={30} />{u.name}</span></td>
                    <td className="px-5 py-3 text-muted">{u.email}</td>
                    <td className="px-5 py-3"><Pill tone={ROLE_TONE[u.role]}>{u.role}</Pill></td>
                    <td className="px-5 py-3"><span className="flex items-center gap-2"><span className={cn("size-2 rounded-full", STATE_DOT[u.state])} />{u.state}</span></td>
                    <td className="px-5 py-3 text-muted">{u.lastAccess}</td>
                    <td className="px-5 py-3 text-right"><button className="text-[13px] font-semibold text-primary hover:underline">Editar</button></td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      ) : (
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-10 text-center text-[13px] text-muted">
          Esta sección se conectará con la API de administración.
        </motion.div>
      )}
      <AnimatePresence>
        {modal && (
          <InviteModal
            onClose={() => setModal(false)}
            onInvite={(u) => {
              setUsers((prev) => [u, ...prev]);
              setModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
