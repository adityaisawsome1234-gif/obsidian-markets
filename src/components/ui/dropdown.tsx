"use client";

import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import { dropdownVariants, springBounce } from "@/lib/animations";

interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "start" | "center" | "end";
}

export function Dropdown({ trigger, items, align = "end" }: DropdownProps) {
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          align={align}
          sideOffset={4}
          asChild
        >
          <motion.div
            variants={dropdownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springBounce}
            className="z-50 min-w-[160px] bg-s2 border border-[var(--brd2)] rounded-[var(--rad-sm)] p-1 shadow-lg"
          >
            {items.map((item) => (
              <DropdownPrimitive.Item
                key={item.label}
                onClick={item.onClick}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded cursor-pointer outline-none transition-colors",
                  item.destructive
                    ? "text-r hover:bg-[var(--rbg)]"
                    : "text-w3 hover:bg-s3 hover:text-w2"
                )}
              >
                {item.icon}
                {item.label}
              </DropdownPrimitive.Item>
            ))}
          </motion.div>
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}
