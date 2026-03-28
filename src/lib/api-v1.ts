/**
 * V1 API Helpers — Shared middleware for the enterprise REST API.
 *
 * Usage in route handlers:
 *   const auth = v1Auth(req, "read_market");
 *   if (!auth.ok) return auth.response;
 *   // auth.key is the validated ApiKey
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateApiRequest,
  recordUsage,
  type ApiKey,
  type ApiPermission,
} from "@/services/api-keys.service";

interface V1AuthResult {
  ok: true;
  key: ApiKey;
  response?: never;
}

interface V1AuthError {
  ok: false;
  key?: never;
  response: NextResponse;
}

/**
 * Authenticate and authorize a v1 API request.
 */
export function v1Auth(
  req: NextRequest,
  permission: ApiPermission
): V1AuthResult | V1AuthError {
  const headerValue = req.headers.get("x-obsidian-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;

  const result = authenticateApiRequest(headerValue, permission);

  if (!result.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: result.error,
          code: result.status === 401 ? "unauthorized" : result.status === 403 ? "forbidden" : "rate_limited",
          docs: "https://obsidianmarkets.com/developers",
        },
        {
          status: result.status || 500,
          headers: {
            ...result.headers,
            "X-Obsidian-Version": "1.0",
          },
        }
      ),
    };
  }

  return { ok: true, key: result.key! };
}

/**
 * Build a v1 JSON response with standard headers.
 */
export function v1Response(
  data: unknown,
  key: ApiKey,
  endpoint: string,
  aiTokens = 0
): NextResponse {
  recordUsage(key.id, endpoint, aiTokens);

  return NextResponse.json(data, {
    headers: {
      "X-Obsidian-Version": "1.0",
      "X-Obsidian-Tier": key.tier,
      "X-Request-Id": `req_${Date.now().toString(36)}`,
      "Cache-Control": "private, max-age=30",
    },
  });
}

/**
 * Build a v1 error response.
 */
export function v1Error(
  message: string,
  status: number,
  code = "error"
): NextResponse {
  return NextResponse.json(
    { error: message, code, docs: "https://obsidianmarkets.com/developers" },
    { status, headers: { "X-Obsidian-Version": "1.0" } }
  );
}
