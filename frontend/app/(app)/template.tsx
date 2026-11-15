"use client";

import { motion } from "motion/react";

// Transición de entrada en cada navegación (template se vuelve a montar por ruta).
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto flex w-full max-w-[1400px] flex-col gap-6"
    >
      {children}
    </motion.div>
  );
}
