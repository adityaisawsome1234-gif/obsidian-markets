"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";
import { overlayVariants, dialogVariants, springGentle } from "@/lib/animations";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                variants={overlayVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                variants={dialogVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={springGentle}
                className={cn(
                  "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
                  "w-full max-w-md bg-s1 border border-[var(--brd2)] rounded-[var(--rad)] p-5",
                  "shadow-xl",
                  className
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <DialogPrimitive.Title className="text-[15px] font-medium text-w tracking-[-0.2px]">
                    {title}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Close className="text-w5 hover:text-w3 transition-colors cursor-pointer">
                    <X size={16} />
                  </DialogPrimitive.Close>
                </div>
                {description && (
                  <DialogPrimitive.Description className="text-[13px] text-w3 mb-4">
                    {description}
                  </DialogPrimitive.Description>
                )}
                {children}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
