import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';

const FINANCIAL_SYSTEM_PROMPT = `You are Obsidian AI, an expert financial research analyst and market intelligence assistant built into the Obsidian Markets platform.

Your capabilities:
- Deep fundamental analysis of public companies (financials, valuation, competitive positioning)
- Technical analysis (chart patterns, support/resistance, indicators)
- Options strategy analysis (flow analysis, Greeks interpretation, strategy construction)
- Macroeconomic analysis (Fed policy, yield curves, economic indicators)
- Market sentiment and news interpretation
- Portfolio construction and risk management

Guidelines:
- Be precise with numbers and cite specific data points
- Provide actionable insights, not just descriptions
- Flag risks and uncertainties clearly
- Use financial terminology accurately
- When analyzing a stock, consider multiple dimensions: fundamental, technical, sentiment
- For options, always consider IV rank/percentile, skew, and term structure
- Support your analysis with specific ratios, comparisons to peers, and historical context
- Present both bull and bear cases when appropriate
- Never provide specific buy/sell recommendations - present analysis for informed decision-making
- Format responses with clear headers, bullet points, and structured data when appropriate`;

interface ChatContext {
  ticker?: string;
  page?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export class AiService {
  private client: Anthropic | null = null;

  constructor() {
    if (env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.length > 0) {
      this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
  }

  /**
   * Stream a chat response. Falls back to mock streaming if no API key is configured.
   */
  async *chat(message: string, context?: ChatContext): AsyncGenerator<string> {
    if (!this.client) {
      yield* this.mockChatStream(message, context);
      return;
    }

    const messages: Anthropic.MessageParam[] = [];

    // Add history if provided
    if (context?.history) {
      for (const msg of context.history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Build the user message with context
    let userMessage = message;
    if (context?.ticker) {
      userMessage = `[Context: User is viewing ${context.ticker} on the ${context.page || 'overview'} page]\n\n${message}`;
    }
    messages.push({ role: 'user', content: userMessage });

    const stream = this.client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: FINANCIAL_SYSTEM_PROMPT,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  /**
   * Generate a deep-dive analysis for a ticker. Falls back to mock if no API key.
   */
  async *deepDive(ticker: string, aspects?: string[]): AsyncGenerator<string> {
    const selectedAspects = aspects || ['fundamental', 'technical', 'sentiment', 'options'];

    if (!this.client) {
      yield* this.mockDeepDiveStream(ticker, selectedAspects);
      return;
    }

    const prompt = `Generate a comprehensive deep-dive analysis for ${ticker}. Cover the following aspects: ${selectedAspects.join(', ')}.

Structure the analysis with clear headers for each section. Include specific data points, comparisons to peers, and actionable insights. End with a summary of key takeaways, risks, and catalysts to watch.`;

    const stream = this.client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: FINANCIAL_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  /**
   * Mock streaming for development without an API key.
   */
  private async *mockChatStream(message: string, context?: ChatContext): AsyncGenerator<string> {
    const ticker = context?.ticker || 'the market';
    const lowerMessage = message.toLowerCase();

    let response: string;

    if (lowerMessage.includes('analysis') || lowerMessage.includes('analyze')) {
      response = `## Analysis of ${ticker}\n\nBased on current market conditions, here are the key observations:\n\n**Fundamental View:**\n- Earnings growth remains strong with the most recent quarter beating estimates by 2.5%\n- Revenue growth of 8.1% YoY demonstrates sustained demand\n- Operating margins have expanded 150bps to 31.5%, reflecting operational leverage\n- Free cash flow yield of 3.5% supports the current valuation\n\n**Technical View:**\n- Price is trading above both the 50-day and 200-day moving averages\n- RSI at 58 indicates momentum without being overbought\n- Key resistance at the 52-week high; support at the 50-day SMA\n- Volume has been above average on recent up days\n\n**Sentiment:**\n- Analyst consensus is Buy with a median price target 15% above current levels\n- Institutional ownership increased 2.3% last quarter\n- Options put/call ratio of 0.72 suggests moderately bullish positioning\n\n**Key Risks:**\n- Valuation premium vs. sector average (31x vs 25x PE)\n- Upcoming Fed meeting could introduce volatility\n- Supply chain concerns in Asia-Pacific region\n\n*This analysis is for informational purposes only and does not constitute investment advice.*`;
    } else if (lowerMessage.includes('option') || lowerMessage.includes('options')) {
      response = `## Options Analysis for ${ticker}\n\n**Current IV Environment:**\n- IV Rank: 34th percentile - relatively low implied volatility\n- IV Percentile: 42% - below the median for the past year\n- Historical vs Implied: HV20 24.3% vs IV30 28.5% - slight premium\n\n**Flow Analysis:**\n- Net premium flow is bullish today: +$12.4M in calls vs $8.2M in puts\n- Notable activity: Large block trades in the March 200C strike (5,000 contracts)\n- Put/Call ratio: 0.72 (below average, suggesting bullish bias)\n\n**Strategy Considerations:**\n- Low IV favors buying strategies (long calls/puts, debit spreads)\n- Consider March or April expiry for earnings-related trades\n- The 25-delta put skew is elevated at 6.6 points, making put credit spreads attractive\n\n**GEX Analysis:**\n- Positive gamma above current price suggests dealer hedging will dampen moves higher\n- Gamma flip point is $2 below spot - breakdown below this level could accelerate selling\n\n*Monitor the upcoming earnings date and economic calendar for potential IV expansion events.*`;
    } else if (lowerMessage.includes('earnings') || lowerMessage.includes('financial')) {
      response = `## Earnings & Financial Summary for ${ticker}\n\n**Recent Quarter Highlights:**\n- EPS: $2.40 vs $2.35 estimate (+2.1% beat)\n- Revenue: $124.3B vs $124.5B estimate (slight miss)\n- Gross margin: 45.9% (up 80bps YoY)\n- Operating margin: 31.5% (up 150bps YoY)\n\n**Trend Analysis:**\n- 8 consecutive quarters of EPS beats\n- Revenue growth accelerating: 8.1% this quarter vs 6.3% prior\n- FCF conversion remains strong at 95% of net income\n\n**Estimates Going Forward:**\n- Next quarter EPS: $1.62 (32 analysts)\n- Full year EPS: $7.42 (38 analysts)\n- Revenue growth expected at 9% for the next fiscal year\n\n**Balance Sheet:**\n- Current ratio: 1.07 - adequate liquidity\n- Debt/EBITDA: 1.23x - conservative leverage\n- $65B in cash and equivalents\n\n**Peer Comparison:**\nThe current PE of 31x compares to sector median of 25x, reflecting premium growth expectations. The PEG ratio of 1.87 suggests fair value relative to growth rate.`;
    } else {
      response = `Based on your question about ${ticker}, here is my analysis:\n\nThe current market environment presents several important factors to consider:\n\n1. **Market Context**: Major indices are near all-time highs with the S&P 500 at 5,892. Breadth is positive with advancers leading decliners 287-213.\n\n2. **Sector Dynamics**: Technology continues to lead (+1.24% today) while Energy (-0.78%) and Healthcare (-0.32%) lag.\n\n3. **Key Macro Factors**:\n   - Fed funds rate at 4.25-4.50% with 92% probability of hold at next meeting\n   - 10Y Treasury at 4.52%, yield curve no longer inverted\n   - VIX at 14.23 - suggesting low near-term fear\n\n4. **What to Watch**:\n   - Upcoming economic data (PCE, consumer confidence)\n   - Options expiration impact on Friday\n   - Earnings season wind-down and guidance trends\n\nWould you like me to dive deeper into any specific aspect? I can provide detailed fundamental, technical, options, or macro analysis.`;
    }

    // Simulate streaming by yielding chunks
    const words = response.split(' ');
    for (let i = 0; i < words.length; i++) {
      const chunk = (i === 0 ? '' : ' ') + words[i];
      yield chunk;
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 15));
    }
  }

  /**
   * Mock deep dive streaming.
   */
  private async *mockDeepDiveStream(ticker: string, aspects: string[]): AsyncGenerator<string> {
    const sections: Record<string, string> = {
      fundamental: `## Fundamental Analysis - ${ticker}\n\n**Valuation:**\n- P/E Ratio: 31.2x (vs sector 25.0x) - 25% premium\n- Forward P/E: 28.6x - compression expected with earnings growth\n- PEG Ratio: 1.87 - fair value relative to growth\n- EV/EBITDA: 24.6x - in line with mega-cap tech peers\n- Price/FCF: 28.3x - reasonable for the growth profile\n\n**Growth Metrics:**\n- Revenue Growth (YoY): 8.1% and accelerating\n- EPS Growth (YoY): 12.5% - leveraging scale\n- 3-Year Revenue CAGR: 9.9%\n- 3-Year EPS CAGR: 14.2%\n\n**Profitability:**\n- Gross Margin: 45.9% (industry-leading)\n- Operating Margin: 31.5% (expanding)\n- Net Margin: 26.3%\n- ROE: 157% (capital-efficient model)\n- ROIC: 55.2%\n\n**Balance Sheet Health:**\n- Cash: $65B | Debt: $108B | Net Debt: $43B\n- Debt/EBITDA: 1.23x (conservative)\n- Interest Coverage: 29.3x (strong)\n- Current Ratio: 1.07\n\n**Capital Allocation:**\n- Dividend Yield: 0.52% (12 consecutive years of growth)\n- Buyback Yield: 3.2% ($90B annual program)\n- Total Shareholder Return: 3.7%\n\n`,
      technical: `## Technical Analysis - ${ticker}\n\n**Trend:**\n- Primary Trend: Bullish (trading above 200-day SMA)\n- Secondary Trend: Bullish (above 50-day SMA)\n- Price vs 50-SMA: +4.2%\n- Price vs 200-SMA: +18.5%\n\n**Momentum Indicators:**\n- RSI(14): 58.3 - neutral/slightly bullish\n- MACD: Positive, above signal line\n- Stochastic: 65/72 - mid-range\n- ADX: 28.5 - moderate trend strength\n\n**Key Levels:**\n- Resistance 1: $205.00 (52-week high zone)\n- Resistance 2: $215.00 (measured move target)\n- Support 1: $192.00 (50-day SMA)\n- Support 2: $185.00 (prior breakout level)\n- Support 3: $170.00 (200-day SMA)\n\n**Volume Analysis:**\n- Average Volume: 55M shares\n- Recent volume trending above average on up days\n- OBV (On-Balance Volume) confirming uptrend\n- Volume profile shows strong support at $185-190 range\n\n**Pattern Recognition:**\n- Currently forming a bull flag pattern after recent breakout\n- Measured move target: $215 if flag resolves higher\n- Fibonacci retracement levels: 38.2% at $188, 50% at $183\n\n`,
      sentiment: `## Sentiment Analysis - ${ticker}\n\n**Analyst Consensus:**\n- Rating: Buy (18 Strong Buy, 14 Buy, 8 Hold, 1 Sell, 1 Strong Sell)\n- Median Price Target: $228 (+15% upside)\n- High Target: $265 | Low Target: $170\n- Recent upgrades outnumber downgrades 3:1\n\n**News Sentiment (30-day):**\n- Overall Score: +0.45 (Bullish)\n- 234 total articles analyzed\n- 62% positive, 24% neutral, 14% negative\n- Key positive themes: AI integration, earnings beats, margin expansion\n- Key negative themes: insider selling, valuation concerns, supply chain\n\n**Social & Retail Sentiment:**\n- Trending #3 on financial social media\n- Retail flow: Net positive $45M over past week\n- Short interest: 0.8% of float (low, not crowded)\n\n**Institutional Activity:**\n- 13F filings show net buying of 12.3M shares last quarter\n- Vanguard and BlackRock both increased positions\n- Berkshire Hathaway maintained position (no changes)\n\n`,
      options: `## Options Analysis - ${ticker}\n\n**Implied Volatility:**\n- Current IV30: 28.5%\n- IV Rank: 34th percentile (low)\n- IV Percentile: 42%\n- HV20: 24.3% | HV60: 22.1%\n- IV Premium: +4.2 points over realized (slight overpricing)\n\n**Term Structure:**\n- Front-month IV: 32.1% (elevated for near-term event)\n- 30-day IV: 28.5%\n- 60-day IV: 27.2%\n- 6-month IV: 26.8%\n- Contango shape (normal)\n\n**Skew Analysis:**\n- Put 25-delta IV: 32.4%\n- ATM IV: 28.5%\n- Call 25-delta IV: 25.8%\n- Skew Index: 6.6 (moderately elevated put demand)\n\n**Flow Summary (Today):**\n- Total premium: $45.2M\n- Call premium: $28.1M | Put premium: $17.1M\n- Notable: 5,000 March 200C block at $5.20\n- Sentiment: Bullish bias with 1.64 call/put premium ratio\n\n**Gamma Exposure (GEX):**\n- Net positive gamma environment\n- Dealer hedging likely to suppress moves above current strike clusters\n- Gamma flip at $196 - watch for acceleration below this level\n- Max pain for nearest expiry: $195\n\n`,
      macro: `## Macro Context for ${ticker}\n\n**Interest Rate Environment:**\n- Fed Funds: 4.25-4.50% (on hold)\n- Next meeting: March 19 - 92% probability of hold\n- Market pricing 2.1 cuts by year-end\n- Impact on ${ticker}: Neutral to slightly positive as rate trajectory is well-understood\n\n**Economic Backdrop:**\n- GDP: 2.3% (Q4 2024) - soft landing intact\n- Unemployment: 4.0% - labor market resilient\n- CPI: 3.0% YoY - inflation sticky above target\n- Consumer Confidence: 104.1 - above long-run average\n\n**Relevant Macro Factors:**\n- Strong consumer spending supports revenue growth\n- Dollar strength could impact international revenue (40% of total)\n- AI capex cycle driving demand across tech ecosystem\n- Trade policy uncertainty remains a headwind\n\n**Upcoming Catalysts:**\n- Feb 25: Consumer Confidence\n- Feb 28: PCE Price Index (key for Fed)\n- Mar 7: Non-Farm Payrolls\n- Mar 19: FOMC Decision\n\n`,
    };

    for (const aspect of aspects) {
      const section = sections[aspect] || `## ${aspect} Analysis\n\nDetailed ${aspect} analysis for ${ticker} is being compiled...\n\n`;
      const words = section.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? '' : ' ') + words[i];
        yield chunk;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Summary section
    const summary = `## Summary & Key Takeaways\n\n**Bull Case:**\n- Accelerating revenue and earnings growth\n- Industry-leading margins with room for expansion\n- AI tailwinds providing multi-year growth runway\n- Strong capital return program (buybacks + dividends)\n\n**Bear Case:**\n- Valuation premium limits upside potential\n- Insider selling trend warrants monitoring\n- Macro headwinds from sticky inflation and dollar strength\n- Regulatory risks in key markets\n\n**Key Catalysts to Watch:**\n1. Next earnings report (April 24)\n2. FOMC decision on March 19\n3. AI product announcements at upcoming investor day\n4. Q1 revenue guidance vs consensus\n\n**Risk/Reward Assessment:**\nAt current levels, the risk/reward appears balanced. The stock trades at a premium to peers but this is justified by superior growth and profitability metrics. A pullback to the 50-day SMA ($192) would present a more attractive entry point.\n\n*This deep-dive analysis is for informational purposes only and does not constitute investment advice. Always conduct your own research and consult with a financial advisor.*`;

    const summaryWords = summary.split(' ');
    for (let i = 0; i < summaryWords.length; i++) {
      const chunk = (i === 0 ? '' : ' ') + summaryWords[i];
      yield chunk;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}
