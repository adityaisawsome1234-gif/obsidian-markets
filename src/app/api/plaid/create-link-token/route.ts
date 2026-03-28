import { NextResponse } from "next/server";
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

/**
 * POST /api/plaid/create-link-token
 *
 * Creates a Plaid Link token so the frontend can open the Plaid
 * connection modal. The user authenticates with their brokerage
 * inside Plaid's secure iframe.
 */
export async function POST() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV || "sandbox";

  if (!clientId || !secret) {
    return NextResponse.json(
      { error: "Plaid not configured. Set PLAID_CLIENT_ID and PLAID_SECRET in .env.local" },
      { status: 503 }
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
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: "obsidian_user_1" },
      client_name: "Obsidian Markets",
      products: [Products.Investments],
      country_codes: [CountryCode.Us],
      language: "en",
    });

    return NextResponse.json({ linkToken: response.data.link_token });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Plaid link token error:", msg);
    return NextResponse.json({ error: "Failed to create link token", detail: msg }, { status: 500 });
  }
}
