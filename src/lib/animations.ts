"use client";

import { type Variants, type Transition } from "framer-motion";

// --- Shared Transitions ---
export const springBounce: Transition = { type: "spring", stiffness: 400, damping: 25 };
export const springGentle: Transition = { type: "spring", stiffness: 300, damping: 30 };
export const springSnap: Transition = { type: "spring", stiffness: 500, damping: 30 };
export const easeOut: Transition = { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] };
export const easeInOut: Transition = { duration: 0.3, ease: [0.4, 0, 0.2, 1] };

// --- Page Transitions ---
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};
export const pageTransition: Transition = { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] };

// --- Panel Entrance ---
export const panelVariants: Variants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
};
export const panelTransition: Transition = { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] };

// --- Staggered Lists ---
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04 } },
};
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// --- Overlay/Dialog ---
export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
export const dialogVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 8 },
};

// --- Dropdown/Menu ---
export const dropdownVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: -4 },
};

// --- Button Hover/Tap ---
export const buttonHover = { y: -1, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" };
export const buttonTap = { scale: 0.96 };

// --- Price Flash ---
export const priceFlashUp = {
  backgroundColor: ["rgba(34,197,94,0.2)", "rgba(34,197,94,0)"],
  transition: { duration: 0.6 },
};
export const priceFlashDown = {
  backgroundColor: ["rgba(239,68,68,0.2)", "rgba(239,68,68,0)"],
  transition: { duration: 0.6 },
};

// --- Notification Pulse ---
export const pulseBadge: Variants = {
  animate: {
    scale: [1, 1.15, 1],
    transition: { duration: 2, repeat: Infinity },
  },
};

// --- Fade In ---
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// --- Slide Up ---
export const slideUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

// --- Scale In ---
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};
