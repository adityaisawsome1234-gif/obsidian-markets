"use client";

import { motion } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { RecommendationCard } from "@/components/alpha/recommendation-card";
import { useRecommendations, useGenerateRecommendations, useRecommendationAction } from "@/hooks/use-alpha-engine";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { Loader2, RefreshCw, Zap } from "lucide-react";

export default function RecommendationsPage() {
  const { data: recs, isLoading } = useRecommendations();
  const generateRecs = useGenerateRecommendations();
  const recAction = useRecommendationAction();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-w tracking-[-0.5px]">Trade Ideas</h1>
          <p className="text-[11px] text-w4 mt-0.5">Personalized recommendations scored against your trading history</p>
        </div>
        <button
          onClick={() => generateRecs.mutate(undefined)}
          disabled={generateRecs.isPending}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium text-w bg-s3 hover:bg-s4 rounded-md transition-colors disabled:opacity-50"
        >
          {generateRecs.isPending ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <RefreshCw size={11} />
          )}
          Generate Ideas
        </button>
      </div>

      {recs?.run && (
        <div className="flex items-center gap-3 text-[10px] text-w5">
          <span>Run: {new Date(recs.run.createdAt).toLocaleString()}</span>
          <span>{recs.run.symbolsEvaluated} symbols evaluated</span>
          <span>{recs.run.recommendationsGenerated} recommendations</span>
          <span>{recs.run.durationMs}ms</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12">
          <Loader2 size={14} className="animate-spin text-w5" />
          <span className="text-[11px] text-w5">Loading recommendations...</span>
        </div>
      ) : recs?.items.length ? (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
          {recs.items.map(item => (
            <motion.div key={item.id} variants={staggerItem}>
              <RecommendationCard
                item={item}
                onAction={(id, action) => recAction.mutate({ id, action })}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <Panel>
          <div className="flex flex-col items-center py-12 text-center">
            <Zap size={24} className="text-w5 mb-3" />
            <p className="text-[12px] text-w3 mb-1">No recommendations yet</p>
            <p className="text-[11px] text-w5 max-w-[300px]">
              Click &quot;Generate Ideas&quot; to get personalized trade recommendations based on current market signals and your trading history.
            </p>
          </div>
        </Panel>
      )}
    </div>
  );
}
