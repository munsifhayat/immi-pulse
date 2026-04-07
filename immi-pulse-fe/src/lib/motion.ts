import type { Variants } from "framer-motion";

const prefersReducedMotion =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: prefersReducedMotion
      ? { duration: 0 }
      : {
          delay: i * 0.1,
          duration: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
        },
  }),
};

export const stagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08 },
  },
};
