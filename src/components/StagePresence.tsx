import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Animate only the presentation wrapper; controllers and audio stay mounted. */
export function StagePresence({ show, children, className }: { show: boolean; children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <AnimatePresence initial={false}>
    {show && <motion.div className={className} initial={{ opacity: 0, y: reduced ? 0 : 10, scale: reduced ? 1 : 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reduced ? 0 : 6, scale: reduced ? 1 : 0.98 }} transition={{ duration: reduced ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>}
  </AnimatePresence>;
}