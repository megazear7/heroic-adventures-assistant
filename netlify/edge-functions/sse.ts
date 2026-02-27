import type { Context } from "./lib/shared.ts";
import { handleSse, processJsonRpc } from "./messages.ts";

// --- CORS headers ---

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

function withCors(headers: Record<string, string> = {}): Record<string, string> {
  return { ...CORS_HEADERS, ...headers };
}

// Handles both Streamable HTTP (POST) and legacy SSE (GET) transports.
// Mounted at /sse and /mcp — VS Code and other modern MCP clients use Streamable HTTP by default.
export default async (request: Request, context: Context): Promise<Response> => {
  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: withCors() });
  }

  // Streamable HTTP transport: POST with JSON-RPC body, return response directly
  if (request.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResp(
        { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
        400,
      );
    }

    if (body.jsonrpc !== "2.0" || !body.method) {
      return jsonResp(
        { jsonrpc: "2.0", id: body.id ?? null, error: { code: -32600, message: "Invalid Request" } },
        400,
      );
    }

    // deno-lint-ignore no-explicit-any
    const response = await processJsonRpc(body as any, request, context);
    if (!response) {
      // Notification — no response body expected
      return new Response(null, { status: 202, headers: withCors() });
    }
    return jsonResp(response);
  }

  // Legacy SSE transport: GET opens event stream
  if (request.method === "GET") {
    return handleSse(request);
  }

  // Unsupported method
  return new Response("Method Not Allowed", {
    status: 405,
    headers: withCors({ Allow: "GET, POST, OPTIONS" }),
  });
};

function jsonResp(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: withCors({
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    }),
  });
}
