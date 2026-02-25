// --- Types ---

type Context = {
  site?: {
    url?: string;
  };
};

type JsonRpcRequest = {
  jsonrpc: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

type JsonRpcId = string | number | null;

type FileIndex = {
  knowledge_folders: string[];
};

// --- Shared queue (module-scoped so SSE and messages share state) ---

const queue: unknown[] = [];

// --- Constants ---

const DEFAULT_INDEX: FileIndex = {
  knowledge_folders: [],
};

const KNOWLEDGE_BASE_PATH = "assets/knowledge";

const WELCOME_TEXT = `Welcome to the Heroic Adventures MCP Server!

This is a read-only MCP server for the Heroic Adventures Assistant.
It provides access to rulebook chapters, rules summaries, skills, prompts, and agent definitions.

How to use:
1. Connect an MCP client using HTTP+SSE.
2. Discover tools with tools/list.
3. For each knowledge folder, three tools are available:
   - <folder>_info  — Get an overview of the folder contents
   - <folder>_list  — List all entries in the folder
   - <folder>_get   — Retrieve a specific entry by name (requires entry-name)

All content is static and served from Netlify CDN-hosted repo files.`;

const MCP_PROTOCOL_VERSION = "2024-11-05";

const SERVER_INFO = {
  name: "heroic-adventures-mcp",
  version: "2.0.0",
};

const SERVER_CAPABILITIES = {
  tools: {},
};

// --- Path utilities ---

function sanitizeRelativePath(input: string): string {
  return input
    .replace(/^\/+/, "")
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

function encodePath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function getBaseUrl(request: Request, context: Context): string {
  const rawSite = context.site?.url?.trim();
  if (rawSite) {
    if (rawSite.startsWith("http://") || rawSite.startsWith("https://")) {
      return rawSite.replace(/\/$/, "");
    }
    return `https://${rawSite.replace(/\/$/, "")}`;
  }
  return new URL(request.url).origin;
}

// --- Input helpers ---

function requireInput(input: Record<string, unknown>, key: string): string {
  const value = typeof input[key] === "string" ? (input[key] as string) : "";
  if (!value) {
    throw new Error(`Missing required input.${key}`);
  }
  return value;
}

// --- Fetch & index loading ---

async function fetchText(baseUrl: string, relativePath: string): Promise<string> {
  const safePath = sanitizeRelativePath(relativePath);
  const url = `${baseUrl}/${encodePath(safePath)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Not found: ${safePath}`);
  }
  return response.text();
}

async function loadIndex(baseUrl: string): Promise<FileIndex> {
  try {
    const indexText = await fetchText(baseUrl, "static/file-index.json");
    const parsed = JSON.parse(indexText) as Partial<FileIndex>;
    return {
      knowledge_folders: Array.isArray(parsed.knowledge_folders) ? parsed.knowledge_folders : [],
    };
  } catch {
    return DEFAULT_INDEX;
  }
}

// --- Dynamic tool generation ---

function buildToolDefinitions(folders: string[]): unknown[] {
  const tools: unknown[] = [
    {
      name: "welcome",
      description: "Get onboarding / welcome instructions for this MCP server",
      inputSchema: { type: "object", properties: {} },
    },
  ];

  for (const folder of folders) {
    tools.push(
      {
        name: `${folder}_info`,
        description: `Get an overview of the ${folder} knowledge folder, including a summary of all available entries`,
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: `${folder}_list`,
        description: `List all entry names available in the ${folder} knowledge folder`,
        inputSchema: {
          type: "object",
          properties: {
            filter: {
              type: "string",
              description: "Optional substring filter to narrow results",
            },
          },
        },
      },
      {
        name: `${folder}_get`,
        description: `Get the full content of a specific entry from the ${folder} knowledge folder`,
        inputSchema: {
          type: "object",
          properties: {
            "entry-name": {
              type: "string",
              description: `The name of the entry to retrieve (without .md extension). Use ${folder}_list to discover available names.`,
            },
          },
          required: ["entry-name"],
        },
      },
    );
  }

  return tools;
}

// --- Entry listing via info.md parsing ---

async function listEntries(baseUrl: string, folder: string, filter?: string): Promise<{ entries: string[] }> {
  // Fetch the info.md and parse entry names from the table
  try {
    const infoText = await fetchText(baseUrl, `${KNOWLEDGE_BASE_PATH}/${folder}/info.md`);
    const entries: string[] = [];
    // Parse markdown table rows: | entry-name | description |
    const lines = infoText.split("\n");
    for (const line of lines) {
      const match = line.match(/^\|\s*([a-z0-9][\w-]*)\s*\|/);
      if (match && match[1] !== "Entry") {
        entries.push(match[1]);
      }
    }

    if (filter) {
      const lowerFilter = filter.toLowerCase();
      return { entries: entries.filter((e) => e.toLowerCase().includes(lowerFilter)) };
    }
    return { entries };
  } catch {
    return { entries: [] };
  }
}

// --- Tool dispatch ---

async function handleToolCall(
  toolName: string,
  input: Record<string, unknown>,
  baseUrl: string,
  index: FileIndex,
): Promise<unknown> {
  // Handle welcome
  if (toolName === "welcome") {
    return { content: WELCOME_TEXT };
  }

  // Dynamic folder-based tool dispatch
  for (const folder of index.knowledge_folders) {
    if (toolName === `${folder}_info`) {
      const content = await fetchText(baseUrl, `${KNOWLEDGE_BASE_PATH}/${folder}/info.md`);
      return { folder, content };
    }

    if (toolName === `${folder}_list`) {
      const filter = typeof input.filter === "string" ? (input.filter as string) : undefined;
      return listEntries(baseUrl, folder, filter);
    }

    if (toolName === `${folder}_get`) {
      const entryName = requireInput(input, "entry-name")
        .replace(/\.md$/i, "")
        .replace(/[/\\]/g, "");
      const path = `${KNOWLEDGE_BASE_PATH}/${folder}/entries/${entryName}.md`;
      const content = await fetchText(baseUrl, path);
      return { folder, entry: entryName, content };
    }
  }

  throw new Error(`Unknown tool: ${toolName}`);
}

// --- JSON-RPC helpers ---

function jsonRpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id: JsonRpcId, message: string, code = -32000) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function toolResult(text: string, isError = false) {
  return { content: [{ type: "text", text }], ...(isError && { isError: true }) };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

// --- Core JSON-RPC processor (shared by both transports) ---

export async function processJsonRpc(
  body: JsonRpcRequest,
  request: Request,
  context: Context,
): Promise<unknown | null> {
  const id = body.id ?? null;

  if (body.method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: SERVER_CAPABILITIES,
      serverInfo: SERVER_INFO,
    });
  }

  if (body.method === "notifications/initialized") {
    return null;
  }

  if (body.method === "tools/list") {
    const baseUrl = getBaseUrl(request, context);
    const index = await loadIndex(baseUrl);
    const tools = buildToolDefinitions(index.knowledge_folders);
    return jsonRpcResult(id, { tools });
  }

  if (body.method === "tools/call") {
    const params = (body.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
    const toolName = params.name;
    const input = params.arguments ?? {};

    if (!toolName) {
      return jsonRpcResult(id, toolResult("Missing tool name", true));
    }

    const baseUrl = getBaseUrl(request, context);
    const index = await loadIndex(baseUrl);

    try {
      const result = await handleToolCall(toolName, input, baseUrl, index);
      return jsonRpcResult(id, toolResult(JSON.stringify(result, null, 2)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return jsonRpcResult(id, toolResult(message, true));
    }
  }

  return jsonRpcError(id, "Method not found", -32601);
}

// --- Legacy SSE transport: request handler (POST /messages) ---

export default async (request: Request, context: Context): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: JsonRpcRequest;
  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return jsonResponse(jsonRpcError(null, "Parse error", -32700), 400);
  }

  if (body.jsonrpc !== "2.0" || !body.method) {
    return jsonResponse(jsonRpcError(body.id ?? null, "Invalid Request", -32600), 400);
  }

  const response = await processJsonRpc(body, request, context);
  if (response) {
    queue.push(response);
  }
  return new Response(null, { status: 202 });
};

// --- SSE stream handler (exported for the /sse edge function) ---

export function handleSse(request: Request): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // MCP SSE transport: first event tells the client where to POST
      controller.enqueue(encoder.encode("event: endpoint\ndata: /messages\n\n"));

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(":\n\n"));
      }, 15000);

      const poller = setInterval(() => {
        while (queue.length > 0) {
          const item = queue.shift();
          controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(item)}\n\n`));
        }
      }, 500);

      const close = () => {
        clearInterval(heartbeat);
        clearInterval(poller);
        controller.close();
      };

      request.signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      return;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
