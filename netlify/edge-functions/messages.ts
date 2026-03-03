import type { Context } from "./lib/shared.ts";
import { getQueue } from "./lib/shared.ts";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1?bundle-deps";

// --- Types ---

type JsonRpcRequest = {
  jsonrpc: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

type JsonRpcId = string | number | null;

type FileIndex = {
  knowledge_folders: string[];
  downloadable_assets?: { name: string; path: string; mimeType: string; description: string }[];
};

// --- Constants ---

const DEFAULT_INDEX: FileIndex = {
  knowledge_folders: [],
  downloadable_assets: [],
};

const KNOWLEDGE_BASE_PATH = "assets/knowledge";

const WELCOME_TEXT = `Welcome to the Heroic Adventures MCP Server!

This is a read-only MCP server for the Heroic Adventures Assistant.
It provides access to rulebook chapters, rules summaries, skills, prompts, and agent definitions.

How to use:
1. Connect an MCP client using Streamable HTTP (POST /mcp or /sse) or legacy SSE (GET /sse + POST /messages).
2. Discover tools with tools/list.
3. For each knowledge folder, three tools are available:
   - <folder>_info  — Get an overview of the folder contents
   - <folder>_list  — List all entries in the folder
   - <folder>_get   — Retrieve a specific entry by name (requires entry-name)

All content is static and served from Netlify CDN-hosted repo files.`;

const SUPPORTED_PROTOCOL_VERSIONS = ["2025-03-26", "2024-11-05"];
const MCP_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

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

async function fetchBinary(baseUrl: string, relativePath: string): Promise<Uint8Array> {
  const safePath = sanitizeRelativePath(relativePath);
  const url = `${baseUrl}/${encodePath(safePath)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Not found: ${safePath}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function fetchBinaryAsBase64(baseUrl: string, relativePath: string): Promise<string> {
  const bytes = await fetchBinary(baseUrl, relativePath);
  return uint8ArrayToBase64(bytes);
}

async function loadIndex(baseUrl: string): Promise<FileIndex> {
  try {
    const indexText = await fetchText(baseUrl, "static/file-index.json");
    const parsed = JSON.parse(indexText) as Partial<FileIndex>;
    return {
      knowledge_folders: Array.isArray(parsed.knowledge_folders) ? parsed.knowledge_folders : [],
      downloadable_assets: Array.isArray(parsed.downloadable_assets) ? parsed.downloadable_assets : [],
    };
  } catch {
    return DEFAULT_INDEX;
  }
}

// --- Dynamic tool generation ---

function buildToolDefinitions(folders: string[], index: FileIndex): unknown[] {
  const tools: unknown[] = [
    {
      name: "welcome",
      description: "Get onboarding / welcome instructions for this MCP server",
      inputSchema: { type: "object", properties: {} },
    },
  ];

  for (const asset of index.downloadable_assets ?? []) {
    tools.push({
      name: `download_${asset.name.replace(/[^a-z0-9_-]/gi, "_")}`,
      description: `Download the ${asset.description}. Returns the raw file as base64-encoded binary data that clients can save to disk.`,
      inputSchema: { type: "object", properties: {} },
    });
  }

  tools.push({
    name: "fill_character-sheet-basic",
    description:
      "Fill in the Heroic Adventures basic character sheet PDF with the provided data and return the completed form",
    inputSchema: {
      type: "object",
      properties: {
        fileName: {
          type: "string",
          description: "The desired file name for the filled PDF (without the .pdf extension)",
        },
        characterName: {
          type: "string",
          description: "The character's name to fill in the Character Name field",
        },
        skillTraining1: {
          type: "boolean",
          description: "Whether the Skill Training 1 checkbox should be checked",
        },
      },
      required: ["fileName", "characterName", "skillTraining1"],
    },
  });

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

  // Handle downloadable asset tools
  for (const asset of index.downloadable_assets ?? []) {
    const expectedName = `download_${asset.name.replace(/[^a-z0-9_-]/gi, "_")}`;
    if (toolName === expectedName) {
      const base64Data = await fetchBinaryAsBase64(baseUrl, asset.path);
      return {
        content: [
          {
            type: "text",
            text: `${asset.description} — binary data attached as an embedded resource. Save the blob content to a file with the appropriate extension.`,
          },
          {
            type: "resource",
            resource: {
              uri: `heroic://assets/${asset.name}`,
              mimeType: asset.mimeType,
              blob: base64Data,
            },
          },
        ],
      };
    }
  }

  // Fill character sheet tool
  if (toolName === "fill_character-sheet-basic") {
    const fileName = requireInput(input, "fileName");
    const characterName = typeof input.characterName === "string" ? (input.characterName as string) : "";
    const skillTraining1 = input.skillTraining1 === true;

    // Fetch the blank PDF as base64 (avoids Uint8Array constructor mismatch in edge runtime)
    const pdfBase64 = await fetchBinaryAsBase64(baseUrl, "assets/character-sheet-basic.pdf");

    // Load and fill the PDF form
    const pdfDoc = await PDFDocument.load(pdfBase64);
    const form = pdfDoc.getForm();
    const page = pdfDoc.getPages()[0];

    // Create and fill the Character Name text field
    const nameField = form.createTextField("Character Name");
    nameField.setText(characterName);
    nameField.addToPage(page, { x: 150, y: 726, width: 180, height: 16 });

    // Create and fill the Skill Training 1 checkbox
    const skillCheckbox = form.createCheckBox("Skill Training 1");
    if (skillTraining1) {
      skillCheckbox.check();
    }
    skillCheckbox.addToPage(page, { x: 45, y: 400, width: 10, height: 10 });

    // Save the filled PDF
    const filledPdfBytes = await pdfDoc.save();
    const filledBase64 = uint8ArrayToBase64(new Uint8Array(filledPdfBytes));

    return {
      content: [
        {
          type: "text",
          text: `Character sheet filled — Character Name: "${characterName}", Skill Training 1: ${skillTraining1}. File: ${fileName}.pdf`,
        },
        {
          type: "resource",
          resource: {
            uri: `heroic://assets/${encodeURIComponent(fileName)}.pdf`,
            mimeType: "application/pdf",
            blob: filledBase64,
          },
        },
      ],
    };
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
    const initParams = (body.params ?? {}) as { protocolVersion?: string };
    const clientVersion = initParams.protocolVersion;
    const negotiatedVersion =
      clientVersion && SUPPORTED_PROTOCOL_VERSIONS.includes(clientVersion)
        ? clientVersion
        : MCP_PROTOCOL_VERSION;
    return jsonRpcResult(id, {
      protocolVersion: negotiatedVersion,
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
    const tools = buildToolDefinitions(index.knowledge_folders, index);
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
      // If the handler already returned a full MCP content array, pass through directly
      if (result && typeof result === "object" && Array.isArray((result as Record<string, unknown>).content)) {
        return jsonRpcResult(id, result);
      }
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
    getQueue().push(response);
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
        const q = getQueue();
        while (q.length > 0) {
          const item = q.shift();
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
      "Access-Control-Allow-Origin": "*",
    },
  });
}
