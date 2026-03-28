"use client";

import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useAIResearch } from "@/hooks/use-ai-research";
import { ConvictionGauge } from "./conviction-gauge";
import { SignalRadar } from "./signal-radar";
import { ResearchSection } from "./research-section";
import { DeepDiveSkeleton } from "./section-skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Activity,
  MessageSquare,
  Layers,
  Globe,
  ShieldAlert,
  Sparkles,
  Clock,
} from "lucide-react";

interface AIDeepDiveProps {
  ticker: string;
}

const sectionIcons: Record<string, React.ReactNode> = {
  fundamental: <BarChart3 size={16} />,
  technical: <Activity size={16} />,
  sentiment: <MessageSquare size={16} />,
  optionsFlow: <Layers size={16} />,
  macro: <Globe size={16} />,
  risk: <ShieldAlert size={16} />,
};

export function AIDeepDive({ ticker }: AIDeepDiveProps) {
  const { data: report, isLoading } = useAIResearch(ticker);

  if (isLoading || !report) {
    return <DeepDiveSkeleton />;
  }

  const sectionOrder: (keyof typeof report.sections)[] = [
    "fundamental",
    "technical",
    "sentiment",
    "optionsFlow",
    "macro",
    "risk",
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-a" />
        <span className="text-[13px] font-semibold text-w tracking-[-0.2px]">
          AI Deep Dive Analysis
        </span>
        <Badge variant="ai">Claude Opus 4.6</Badge>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-[10px] text-w5">
          <Clock size={10} />
          Generated {new Date(report.generatedAt).toLocaleTimeString()}
        </div>
      </motion.div>

      {/* Conviction + Radar */}
      <motion.div
        variants={staggerItem}
        className="bg-s1 border border-[var(--abr)] rounded-[var(--rad)] p-6 glow-ai"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="flex justify-center">
            <ConvictionGauge score={report.convictionScore} verdict={report.verdict} />
          </div>
          <div className="flex justify-center">
            <SignalRadar signals={report.signals} />
          </div>
        </div>
      </motion.div>

      {/* Research Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sectionOrder.map((key, i) => (
          <ResearchSection
            key={key}
            section={report.sections[key]}
            icon={sectionIcons[key]}
            delay={0.1 + i * 0.08}
          />
        ))}
      </div>

      {/* Disclaimer */}
      <motion.div variants={staggerItem} className="text-center py-3">
        <p className="text-[10px] text-w5">
          AI-generated analysis is for informational purposes only. Not investment advice. Always do your own research.
        </p>
      </motion.div>
    </motion.div>
  );
}
