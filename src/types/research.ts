export interface AIResearchReport {
  ticker: string;
  companyName: string;
  generatedAt: string;
  convictionScore: number; // 0-100
  verdict: "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell";
  sections: {
    fundamental: ResearchSection;
    technical: ResearchSection;
    sentiment: ResearchSection;
    optionsFlow: ResearchSection;
    macro: ResearchSection;
    risk: ResearchSection;
  };
  signals: SignalRadar;
}

export interface ResearchSection {
  title: string;
  score: number; // 0-100, 50 = neutral, >50 = bullish
  confidence: number; // 0-100
  keyFindings: string[];
  summary: string;
  dataPoints: { label: string; value: string; trend?: "up" | "down" | "flat" }[];
}

export interface SignalRadar {
  fundamental: number;
  technical: number;
  sentiment: number;
  optionsFlow: number;
  macro: number;
  convergenceStrength: "strong" | "moderate" | "weak" | "conflicting";
}

export interface Thesis {
  id: string;
  ticker: string;
  title: string;
  description: string;
  assumptions: ThesisAssumption[];
  status: "active" | "validated" | "invalidated";
  health: "green" | "yellow" | "red";
  createdAt: string;
  updatedAt: string;
}

export interface ThesisAssumption {
  id: string;
  description: string;
  status: "holding" | "weakening" | "broken";
  lastChecked: string;
}
