"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { Plus, X } from "lucide-react";

interface ThesisFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; description: string; assumptions: string[] }) => void;
  ticker: string;
}

export function ThesisForm({ open, onOpenChange, onSubmit, ticker }: ThesisFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assumptions, setAssumptions] = useState<string[]>([""]);

  const handleAddAssumption = () => {
    setAssumptions((prev) => [...prev, ""]);
  };

  const handleRemoveAssumption = (index: number) => {
    setAssumptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAssumptionChange = (index: number, value: string) => {
    setAssumptions((prev) => prev.map((a, i) => (i === index ? value : a)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validAssumptions = assumptions.filter((a) => a.trim().length > 0);
    if (!title.trim() || validAssumptions.length === 0) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      assumptions: validAssumptions,
    });
    // Reset form
    setTitle("");
    setDescription("");
    setAssumptions([""]);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`New Thesis — ${ticker}`}
      description="Define your investment thesis and the key assumptions that must hold for it to remain valid."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold tracking-[0.4px] text-w4 uppercase">
            Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. AI Capex Cycle Thesis"
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold tracking-[0.4px] text-w4 uppercase">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your thesis and expected catalysts..."
            rows={3}
            className={cn(
              "w-full bg-s2 border border-[var(--brd)] rounded-[var(--rad-sm)] px-2.5 py-1.5 text-[12px] text-w2 placeholder:text-w5 outline-none transition-colors duration-150 resize-none",
              "focus:border-[var(--brd3)] focus:bg-s3"
            )}
          />
        </div>

        {/* Assumptions */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold tracking-[0.4px] text-w4 uppercase">
            Key Assumptions
          </label>
          <div className="space-y-1.5">
            {assumptions.map((assumption, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <Input
                  value={assumption}
                  onChange={(e) => handleAssumptionChange(index, e.target.value)}
                  placeholder={`Assumption ${index + 1}`}
                  className="flex-1"
                />
                {assumptions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAssumption(index)}
                    className="text-w5 hover:text-r transition-colors p-1 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddAssumption}
            className="flex items-center gap-1 text-[11px] text-a hover:opacity-80 transition-opacity cursor-pointer mt-1"
          >
            <Plus size={12} />
            <span>Add assumption</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!title.trim() || assumptions.every((a) => !a.trim())}
          >
            Create Thesis
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
