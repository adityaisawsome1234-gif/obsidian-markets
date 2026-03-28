"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Button } from "@/components/ui/button";
import { ThesisCard } from "./thesis-card";
import { ThesisForm } from "./thesis-form";
import { useTheses, useCreateThesis } from "@/hooks/use-thesis";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { Plus, FileText } from "lucide-react";

interface ThesisTrackerProps {
  ticker: string;
}

export function ThesisTracker({ ticker }: ThesisTrackerProps) {
  const [formOpen, setFormOpen] = useState(false);
  const theses = useTheses(ticker);
  const createThesis = useCreateThesis();

  const handleCreate = (data: {
    title: string;
    description: string;
    assumptions: string[];
  }) => {
    createThesis({ ticker, ...data });
  };

  return (
    <>
      <Panel>
        <PanelHeader
          label="Thesis Tracker"
          actions={
            <Button variant="ghost" size="sm" onClick={() => setFormOpen(true)}>
              <Plus size={10} />
              <span>New Thesis</span>
            </Button>
          }
        />

        {theses.length === 0 ? (
          /* Empty state */
          <div className="p-6 flex flex-col items-center text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-s2 flex items-center justify-center">
              <FileText size={16} className="text-w5" />
            </div>
            <p className="text-[12px] text-w4">
              No theses yet for {ticker}
            </p>
            <p className="text-[10px] text-w5 max-w-[260px]">
              Create a thesis to track your investment assumptions and monitor their health over time.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFormOpen(true)}
              className="mt-1"
            >
              <Plus size={10} />
              <span>Create your first thesis</span>
            </Button>
          </div>
        ) : (
          /* Thesis list */
          <motion.div
            className="p-3.5 space-y-2"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {theses.map((thesis) => (
              <motion.div key={thesis.id} variants={staggerItem}>
                <ThesisCard thesis={thesis} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </Panel>

      <ThesisForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        ticker={ticker}
      />
    </>
  );
}
