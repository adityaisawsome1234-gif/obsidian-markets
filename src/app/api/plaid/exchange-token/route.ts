import { NextRequest, NextResponse } from "next/server";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

/**
 * POST /api/plaid/exchange-token
 *
 * Exchanges the temporary public_token from Plaid Link for a
 * persistent access_token. The access_token is stored server-side
 * and used to fetch holdings on demand.
 *
 * Body: { publicToken: string }
 */

// In-memory token store (production: encrypt + store in DB per user)
const accessTokenStore = new Map<string, string>();

export { accessTokenStore };

export async function POST(req: NextRequest) {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV || "sandbox";

  if (!clientId || !secret) {
    return NextResponse.json({ error: "Plaid not configured" }, { status: 503 });
  }

  try {
    const { publicToken } = await req.json();

    if (!publicToken || typeof publicToken !== "string") {
      return NextResponse.json({ error: "publicToken required" }, { status: 400 });
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

    const response = await plaid.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Store the access token (keyed by a user ID — using "default" for now)
    accessTokenStore.set("default", accessToken);

    return NextResponse.json({
      success: true,
      itemId,
      message: "Brokerage connected successfully",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Plaid exchange error:", msg);
    return NextResponse.json({ error: "Failed to exchange token", detail: msg }, { status: 500 });
  }
}
