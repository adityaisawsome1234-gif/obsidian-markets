import { NextResponse } from "next/server";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { accessTokenStore } from "../exchange-token/route";

/**
 * GET /api/plaid/holdings
 *
 * Fetches real investment holdings from the user's connected
 * brokerage via Plaid's Investments API.
 *
 * Returns normalized holdings array compatible with our portfolio system.
 */
export async function GET() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV || "sandbox";

  if (!clientId || !secret) {
    return NextResponse.json({ error: "Plaid not configured" }, { status: 503 });
  }

  const accessToken = accessTokenStore.get("default");
  if (!accessToken) {
    return NextResponse.json(
      { error: "No brokerage connected. Connect via Plaid Link first." },
      { status: 404 }
    );
  }

  const config = new Configuration({
    basePath: PlaidEnvironments[env as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  const plaid = new PlaidApi(config);

  try {
    const response = await plaid.investmentsHoldingsGet({
      access_token: accessToken,
    });

    const { holdings, securities, accounts } = response.data;

    // Build a lookup of security_id → security details
    const secMap = new Map(
      securities.map((s) => [s.security_id, s])
    );

    // Normalize into our portfolio format
    const normalized = holdings
      .map((h) => {
        const sec = secMap.get(h.security_id);
        if (!sec || !sec.ticker_symbol) return null;

        // Skip cash or money market
        if (sec.type === "cash" || sec.ticker_symbol === "CUR:USD") return null;

        return {
          ticker: sec.ticker_symbol,
          name: sec.name || sec.ticker_symbol,
          shares: h.quantity,
          avgCost: h.cost_basis ? h.cost_basis / h.quantity : h.institution_price,
          currentPrice: h.institution_price,
          marketValue: h.institution_value,
        };
      })
      .filter(Boolean);

    // Account summary
    const totalValue = normalized.reduce(
      (sum, h) => sum + (h?.marketValue || 0),
      0
    );

    return NextResponse.json({
      holdings: normalized,
      accounts: accounts.map((a) => ({
        id: a.account_id,
        name: a.name,
        type: a.subtype || a.type,
        balance: a.balances.current,
      })),
      totalValue,
      source: "plaid",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Plaid holdings error:", msg);
    return NextResponse.json(
      { error: "Failed to fetch holdings", detail: msg },
      { status: 500 }
    );
  }
}
