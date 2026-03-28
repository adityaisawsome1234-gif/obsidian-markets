"use client";

import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { ChevronRight } from "lucide-react";

interface FindingListProps {
  findings: string[];
}

export function FindingList({ findings }: FindingListProps) {
  return (
    <motion.ul
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-1.5"
    >
      {findings.map((finding, i) => (
        <motion.li
          key={i}
          variants={staggerItem}
          className="flex items-start gap-2 text-[12px] text-w2 leading-relaxed"
        >
          <ChevronRight size={12} className="text-w5 mt-0.5 shrink-0" />
          <span>{finding}</span>
        </motion.li>
      ))}
    </motion.ul>
  );
}
