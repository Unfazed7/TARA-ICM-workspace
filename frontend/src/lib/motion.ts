/**
 * Shared motion presets (D-51). framer-motion only; every preset is switched off when the
 * system asks for reduced motion (use `useMotionPreset`).
 */

import { useReducedMotion, type Transition, type Variants } from 'framer-motion';

/** Weighty spring for interactive elements. */
export const spring: Transition = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 };

/** Ease used for fades and slides: fast start, soft landing. */
export const easeOut: Transition = { duration: 0.5, ease: [0.16, 1, 0.3, 1] };

/** Sections that rise in one after the other on page load. */
export const riseList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: easeOut },
};

/** A side sheet sliding in from the right. */
export const sheetIn: Variants = {
  hidden: { opacity: 0, x: 48 },
  show: { opacity: 1, x: 0, transition: easeOut },
  exit: { opacity: 0, x: 48, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
};

/** Returns the presets, or still versions of them under reduced motion. */
export function useMotionPreset() {
  const reduce = useReducedMotion();
  if (!reduce) return { spring, easeOut, riseList, riseItem, sheetIn };
  const still: Variants = { hidden: { opacity: 1 }, show: { opacity: 1 }, exit: { opacity: 0 } };
  return { spring: { duration: 0 }, easeOut: { duration: 0 }, riseList: still, riseItem: still, sheetIn: still };
}
