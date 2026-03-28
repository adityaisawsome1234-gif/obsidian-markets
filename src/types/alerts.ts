export type SmartAlertType =
  | "price_above"
  | "price_below"
  | "percent_change"
  | "volume_spike"
  | "sentiment_shift"
  | "consensus_break"
  | "unusual_flow"
  | "signal_convergence"
  | "thesis_break";

export interface SmartAlert {
  id: string;
  ticker: string;
  type: SmartAlertType;
  condition: string;
  isActive: boolean;
  priority: "critical" | "high" | "medium" | "low";
  lastTriggered: string | null;
  category: "price" | "flow" | "ai" | "thesis";
  createdAt: string;
}
