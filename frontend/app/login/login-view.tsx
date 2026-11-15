"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HeartPulse, Loader2, Lock, Mail } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/primitives";
import { loginSchema, type LoginInput } from "@/schemas/forms";
import { signIn } from "@/services/users";

const ORBITS = [
  { size: 560, dur: 60, dot: 12 },
  { size: 400, dur: 38, dot: 14 },
  { size: 240, dur: 22, dot: 9 },
];

function Orbits() {
  return (
    <div className="pointer-events-none absolute top-[38%] left-[62%] -translate-x-1/2 -translate-y-1/2">
      {ORBITS.map((o, i) => (
        <motion.div
          key={o.size}
          className="absolute rounded-full border border-primary/25"
          style={{ width: o.size, height: o.size, left: -o.size / 2, top: -o.size / 2 }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1, rotate: i % 2 ? -360 : 360 }}
          transition={{ opacity: { duration: 1, delay: i * 0.15 }, scale: { duration: 1.2, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }, rotate: { duration: o.dur, repeat: Infinity, ease: "linear" } }}
        >
          <span
            className="absolute rounded-full bg-primary shadow-[0_0_16px_#4f8cff]"
            style={{ width: o.dot, height: o.dot, top: -o.dot / 2, left: o.size / 2 - o.dot / 2 }}
          />
        </motion.div>
      ))}
      <motion.div
        className="absolute size-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#7ab0ff,#1d4aa6)] shadow-[0_0_60px_#4f8cff80]"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 12, delay: 0.3 }}
      />
    </div>
  );
}

export function LoginView() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "dra.rivera@healt.space", password: "", remember: true },
  });

  const onSubmit = async (v: LoginInput) => {
    await signIn(v);
    router.push("/dashboard");
  };

  const input = "w-full bg-transparent text-sm outline-none placeholder:text-muted";
  const wrap = "flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3.5 py-3 transition-colors focus-within:border-primary/60";

  return (
    <div className="flex min-h-dvh">
      <div className="relative hidden w-[46%] flex-col overflow-hidden bg-gradient-to-br from-[#1c2e56] via-[#0d1528] to-[#070b14] p-14 lg:flex">
        <Orbits />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[11px] bg-primary">
            <HeartPulse className="size-5 text-white" />
          </span>
          <span className="text-lg font-bold">Healt Monitoring</span>
        </div>
        <motion.div
          className="relative mt-auto flex max-w-lg flex-col gap-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-[40px] leading-[1.12] font-bold tracking-tight">Salud de la tripulación, en tiempo real y desde cualquier lugar.</h1>
          <p className="text-base text-muted">Monitorización de signos vitales, alertas tempranas y laboratorios de IA para misiones espaciales.</p>
          <div className="flex gap-10">
            {[["6", "astronautas"], ["3", "fuentes de datos"], ["24/7", "monitorización"]].map(([v, l]) => (
              <div key={l}>
                <p className="text-2xl font-bold">{v}</p>
                <p className="text-xs text-muted">{l}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <motion.form
          onSubmit={handleSubmit(onSubmit)}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="card flex w-full max-w-[400px] flex-col gap-5 p-8"
        >
          <div>
            <h2 className="text-[26px] font-bold">Iniciar sesión</h2>
            <p className="mt-1 text-[13px] text-muted">Accede con tu cuenta institucional</p>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
            Correo electrónico
            <span className={wrap}>
              <Mail className="size-4" />
              <input {...register("email")} className={input} autoComplete="email" />
            </span>
            {errors.email && <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-critico">{errors.email.message}</motion.span>}
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
            Contraseña
            <span className={wrap}>
              <Lock className="size-4" />
              <input {...register("password")} type="password" className={input} placeholder="••••••••" autoComplete="current-password" />
            </span>
            {errors.password && <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-critico">{errors.password.message}</motion.span>}
          </label>
          <div className="flex items-center justify-between text-[13px]">
            <label className="flex items-center gap-2 text-muted">
              <input type="checkbox" {...register("remember")} className="size-4 accent-primary" /> Recordarme
            </label>
            <a href="#" className="font-semibold text-primary hover:underline">¿Olvidaste tu contraseña?</a>
          </div>
          <Button type="submit" disabled={isSubmitting} className="py-3 text-sm">
            {isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Ingresando…</> : "Ingresar"}
          </Button>
          <p className="text-center text-xs text-muted">Acceso por rol: Médico · Investigador · Administrador</p>
        </motion.form>
      </div>
    </div>
  );
}
