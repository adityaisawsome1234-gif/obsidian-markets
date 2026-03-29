/**
 * Personal Alpha Engine — Service Barrel Export
 */

export { DEFAULT_SCORING_CONFIG } from "./config";
export { computeScore, type ScoringInput, type ScoringResult } from "./scoring.service";
export {
  createTrade,
  updateTrade,
  closeTrade,
  getTrade,
  listTrades,
  getOpenPositions,
  getRecentClosedTrades,
  getClosedTrades,
  getHoldingPeriodBucket,
  importTradesFromCsv,
  type CsvImportResult,
} from "./trade.service";
export {
  computeAllPatternStats,
  generateInsights,
  buildEdgeSnapshot,
} from "./pattern-stats.service";
export {
  generateRecommendations,
  getLatestRecommendations,
  getRecommendation,
  getRecommendationsByRun,
  getAllRuns,
  updateRecommendationStatus,
  recordOutcome,
  evaluateOutcomesFromTrades,
  getRecommendationStats,
  type CandidateSymbol,
} from "./recommendation.service";
export {
  generateWeeklyReport,
  getLatestWeeklyReport,
  getWeeklyReports,
} from "./weekly-report.service";
