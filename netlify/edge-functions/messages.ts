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
  info: string;
  assets: string[];
  rules: string[];
  chapters: string[];
  skills: string[];
  prompts: string[];
  custom_agents: string[];
};

// --- Shared queue (module-scoped so SSE and messages share state) ---

const queue: unknown[] = [];

// --- Constants ---

const DEFAULT_INDEX: FileIndex = {
  info: ".github/copilot-instructions.md",
  assets: [],
  rules: [],
  chapters: [],
  skills: [],
  prompts: [],
  custom_agents: [],
};

const WELCOME_TEXT = `Welcome to the Heroic Adventures MCP Server!

This is a read-only MCP server for the Heroic Adventures Assistant.
It provides direct access to onboarding docs, assets, chapter/rule skills, prompts, and custom agents.

How to use:
1. Connect an MCP client using HTTP+SSE.
2. Discover tools with \`get_tools\`.
3. Call retrieval tools like \`get_rule\`, \`get_chapter\`, \`list_assets\`, and \`get_asset\`.

All content is static and served from Netlify CDN-hosted repo files.`;

const MCP_PROTOCOL_VERSION = "2024-11-05";

const SERVER_INFO = {
  name: "heroic-adventures-mcp",
  version: "1.0.0",
};

const SERVER_CAPABILITIES = {
  tools: {},
};

const FILTER_SCHEMA = {
  type: "object",
  properties: { filter: { type: "string" } },
} as const;

const NAME_SCHEMA = {
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"],
} as const;

const PATH_SCHEMA = {
  type: "object",
  properties: { path: { type: "string" } },
  required: ["path"],
} as const;

const TOOL_DEFINITIONS = [
  { name: "welcome", description: "Get onboarding / welcome instructions for this MCP server", inputSchema: { type: "object", properties: {} } },
  { name: "get_info", description: "Get full contents of .github/copilot-instructions.md", inputSchema: { type: "object", properties: {} } },
  { name: "list_assets", description: "List files in assets/ (optional filter substring)", inputSchema: FILTER_SCHEMA },
  { name: "get_asset", description: "Get content of a specific asset file", inputSchema: PATH_SCHEMA },
  { name: "list_rules", description: "List rule-* skill files (optional filter)", inputSchema: FILTER_SCHEMA },
  { name: "get_rule", description: "Get content of a specific rule skill file", inputSchema: NAME_SCHEMA },
  { name: "list_chapters", description: "List chapter-* skill files (optional filter)", inputSchema: FILTER_SCHEMA },
  { name: "get_chapter", description: "Get content of a specific chapter skill file", inputSchema: NAME_SCHEMA },
  { name: "list_skills", description: "List other (non-rule/chapter) skill files (optional filter)", inputSchema: FILTER_SCHEMA },
  { name: "get_skill", description: "Get content of a specific non-rule/chapter skill file", inputSchema: NAME_SCHEMA },
  { name: "list_prompts", description: "List prompt-related files (optional filter)", inputSchema: FILTER_SCHEMA },
  { name: "get_prompt", description: "Get content of a specific prompt file", inputSchema: NAME_SCHEMA },
  { name: "list_custom_agents", description: "List custom agent files (optional filter)", inputSchema: FILTER_SCHEMA },
  { name: "get_custom_agent", description: "Get content of a specific custom agent file", inputSchema: NAME_SCHEMA },
];

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

function optionalInput(input: Record<string, unknown>, key: string): string | undefined {
  return typeof input[key] === "string" ? (input[key] as string) : undefined;
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
      info: parsed.info ?? DEFAULT_INDEX.info,
      assets: Array.isArray(parsed.assets) ? parsed.assets : [],
      rules: Array.isArray(parsed.rules) ? parsed.rules : [],
      chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      prompts: Array.isArray(parsed.prompts) ? parsed.prompts : [],
      custom_agents: Array.isArray(parsed.custom_agents) ? parsed.custom_agents : [],
    };
  } catch {
    return DEFAULT_INDEX;
  }
}

// --- Name & path resolution ---

function normalizeSkillName(input: string): string {
  return input
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.github\/skills\//, "")
    .replace(/\/SKILL\.md$/i, "")
    .replace(/\.md$/i, "");
}

function resolveIndexedPath(input: string, items: string[]): string | undefined {
  const candidate = sanitizeRelativePath(input.trim());
  const byPath = items.find((item) => item === candidate || item === `assets/${candidate}`);
  if (byPath) {
    return byPath;
  }

  const fileName = candidate.split("/").pop() ?? candidate;
  return items.find((item) => {
    const itemFileName = item.split("/").pop() ?? item;
    return itemFileName === fileName;
  });
}

// --- Filtering ---

function matchesFilter(name: string, filter?: string): boolean {
  if (!filter) {
    return true;
  }
  return name.toLowerCase().includes(filter.toLowerCase());
}

function filterItems(items: string[], filter?: string): { items: string[] } {
  return { items: items.filter((item) => matchesFilter(item, filter)) };
}

function filterByFilename(items: string[], filter?: string): { items: string[] } {
  const names = items.map((item) => item.split("/").pop() ?? item);
  return filterItems(names, filter);
}

// --- Skill & indexed-path fetchers ---

async function fetchSkill(
  baseUrl: string,
  items: string[],
  rawName: string,
  label: string,
): Promise<{ name: string; content: string }> {
  const normalized = normalizeSkillName(rawName);
  if (!items.includes(normalized)) {
    throw new Error(`${label} not found: ${rawName}`);
  }
  const content = await fetchText(baseUrl, `.github/skills/${normalized}/SKILL.md`);
  return { name: normalized, content };
}

async function fetchIndexed(
  baseUrl: string,
  items: string[],
  rawName: string,
  label: string,
): Promise<{ name: string; path: string; content: string }> {
  const resolved = resolveIndexedPath(rawName, items);
  if (!resolved) {
    throw new Error(`${label} not found: ${rawName}`);
  }
  const content = await fetchText(baseUrl, resolved);
  return { name: resolved.split("/").pop() ?? resolved, path: resolved, content };
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

// --- Tool dispatch ---

async function handleToolCall(
  toolName: string,
  input: Record<string, unknown>,
  baseUrl: string,
  index: FileIndex,
): Promise<unknown> {
  const filter = optionalInput(input, "filter");

  switch (toolName) {
    case "welcome":
      return { content: WELCOME_TEXT };

    case "get_info":
      return { content: await fetchText(baseUrl, index.info) };

    case "list_assets": {
      const assets = index.assets.map((a) => a.replace(/^assets\//, ""));
      return filterItems(assets, filter);
    }

    case "get_asset": {
      const rawPath = requireInput(input, "path");
      const resolved = resolveIndexedPath(rawPath, index.assets);
      if (!resolved || !resolved.startsWith("assets/")) {
        throw new Error(`Asset not found: ${rawPath}`);
      }
      return { path: resolved, content: await fetchText(baseUrl, resolved) };
    }

    case "list_rules":
      return filterItems(index.rules, filter);

    case "list_chapters":
      return filterItems(index.chapters, filter);

    case "list_skills":
      return filterItems(index.skills, filter);

    case "get_rule":
      return fetchSkill(baseUrl, index.rules, requireInput(input, "name"), "Rule");

    case "get_chapter":
      return fetchSkill(baseUrl, index.chapters, requireInput(input, "name"), "Chapter");

    case "get_skill":
      return fetchSkill(baseUrl, index.skills, requireInput(input, "name"), "Skill");

    case "list_prompts":
      return filterByFilename(index.prompts, filter);

    case "list_custom_agents":
      return filterByFilename(index.custom_agents, filter);

    case "get_prompt":
      return fetchIndexed(baseUrl, index.prompts, requireInput(input, "name"), "Prompt");

    case "get_custom_agent":
      return fetchIndexed(baseUrl, index.custom_agents, requireInput(input, "name"), "Custom agent");

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
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
    return jsonRpcResult(id, { tools: TOOL_DEFINITIONS });
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
