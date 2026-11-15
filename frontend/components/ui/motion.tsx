"use client";

import { motion, type HTMLMotionProps, type Variants } from "motion/react";

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 260, damping: 26 },
  },
};

export function Stagger({ children, className, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className={className} {...rest}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={staggerItem} className={className} {...rest}>
      {children}
    </motion.div>
  );
}

/** Contenedor que se eleva un poco al pasar el mouse. */
export function HoverLift({ children, className, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
