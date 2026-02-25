You will be **updating the exact repo** (no cloning needed). The goal is to add a deployable Netlify-based SSE MCP server that exposes read-only access to the repo's static content via the listed tools. All data comes from files already in the repo (or simple listings of them), served via Netlify's CDN after deploy.

### Key Adaptations
- **No dynamic generation** — tools are purely informational / retrieval-based.
- **Tools** exactly as you listed:
  - `get_info` → full content of `.github/copilot-instructions.md`
  - `list_assets` / `get_asset` → list files in `assets/`, get content of a specific one
  - `list_rules` / `get_rule` → list rule-* skills, get content of a specific rule skill
  - `list_chapters` / `get_chapter` → list chapter-* skills, get content of a specific chapter skill
  - `list_skills` / `get_skill` → list other skills (non chapter-*/rule-*), get content of one
  - `list_prompts` / `get_prompt` → list any prompt-related files (if they exist; fallback to empty or known ones)
  - `list_custom_agents` / `get_custom_agent` → list agent-related files/skills, get one
  - `welcome` → returns fixed onboarding text explaining the MCP (you provide the content or use a simple template)
- **List tools** accept an optional `filter` string → substring match on file names or titles (case-insensitive)
- All content is fetched from static paths on the deployed Netlify site (your repo files become CDN-hosted)

### Step 1: Add Netlify Configuration to the Repo
1. In the root of the repo, create these files/folders:

   - `netlify.toml` (commit this):
     ```toml
     [[edge_functions]]
       path = "/messages"
       function = "messages"

     [[edge_functions]]
       path = "/sse"
       function = "sse"

     [build]
       publish = "."
       command = ""  # No build step needed
     ```

   - Create folder `netlify/edge-functions/` and add two files inside it (TypeScript):

     - `messages.ts`
     - `sse.ts`

   - Create folder `static/.well-known/` and add `mcp.json` (for discovery):
     ```json
     {
       "transports": ["http+sse"],
       "sse_endpoint": "/sse",
       "messages_endpoint": "/messages",
       "description": "MCP server for Heroic Adventures Assistant - read-only access to rules, assets, skills, prompts, agents, and onboarding info."
     }
     ```

### Step 2: Implement the Edge Functions

#### messages.ts (POST /messages – handles requests & tool calls)
This file defines all tools and handles listing/fetching. It uses the Netlify site URL to build CDN links to your repo files.

```ts
// netlify/edge-functions/messages.ts
import type { Context } from "@netlify/edge-functions";

const responseQueue: any[] = [];

// Helper: case-insensitive substring match
function matchesFilter(name: string, filter?: string): boolean {
  if (!filter) return true;
  return name.toLowerCase().includes(filter.toLowerCase());
}

// Predefined welcome message (customize as needed)
const WELCOME_TEXT = `
Welcome to the Galactic Adventures MCP Server!

This is a read-only remote MCP server for the Galactic Adventures RPG Assistant.
It provides direct access to:
- Onboarding & instructions
- Core assets & rules
- Chapter/rule/skill files from .github/skills/
- Prompts, custom agents (if present)

Purpose: Allow AI clients (Claude, Cursor, etc.) to query game content reliably without needing the full repo locally.

How to use:
1. Connect your AI client to this server's URL with HTTP+SSE transport.
2. Call tools like get_rule, get_chapter, list_assets, etc.
3. All content is static and served from Netlify CDN.

Enjoy your adventures in the stars!
`;

export default async (request: Request, context: Context) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await request.json();
  if (body.jsonrpc !== "2.0" || !body.method) {
    return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" } }), { status: 400 });
  }

  const site = context.site.url; // e.g. your-site.netlify.app

  // get_tools – list all available tools
  if (body.method === "get_tools") {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: body.id,
      result: [
        { name: "welcome", description: "Get onboarding / welcome instructions for this MCP server" },
        { name: "get_info", description: "Get full contents of copilot-instructions.md" },
        { name: "list_assets", description: "List files in assets/ (optional filter substring)", input_schema: { type: "object", properties: { filter: { type: "string" } } } },
        { name: "get_asset", description: "Get content of a specific asset file", input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
        { name: "list_rules", description: "List rule-* skill files (optional filter)", input_schema: { type: "object", properties: { filter: { type: "string" } } } },
        { name: "get_rule", description: "Get content of a specific rule skill file", input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
        { name: "list_chapters", description: "List chapter-* skill files (optional filter)", input_schema: { type: "object", properties: { filter: { type: "string" } } } },
        { name: "get_chapter", description: "Get content of a specific chapter skill file", input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
        { name: "list_skills", description: "List other (non-rule/chapter) skill files (optional filter)", input_schema: { type: "object", properties: { filter: { type: "string" } } } },
        { name: "get_skill", description: "Get content of a specific non-rule/chapter skill file", input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
        { name: "list_prompts", description: "List prompt-related files (if any; optional filter)", input_schema: { type: "object", properties: { filter: { type: "string" } } } },
        { name: "get_prompt", description: "Get content of a specific prompt file", input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
        { name: "list_custom_agents", description: "List custom agent files/skills (optional filter)", input_schema: { type: "object", properties: { filter: { type: "string" } } } },
        { name: "get_custom_agent", description: "Get content of a specific custom agent file", input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } }
      ]
    }), { headers: { "Content-Type": "application/json" } });
  }

  // Tool implementations
  if (body.method === "tool_call") {
    const { name, input = {} } = body.params;
    const { filter, path, name: fileName } = input;
    let result: any;

    try {
      switch (name) {
        case "welcome":
          result = { content: WELCOME_TEXT };
          break;

        case "get_info":
          const infoUrl = `https://${site}/.github/copilot-instructions.md`;
          result = { content: await fetch(infoUrl).then(r => r.text()) };
          break;

        case "list_assets":
          // For simplicity: you'd ideally list dynamically, but since static, hardcode known or return note
          // In practice, maintain a static list or use repo conventions
          result = { items: ["Galactic Adventures.docx", "rules-full.md" /* add known assets */].filter(n => matchesFilter(n, filter)) };
          break;

        case "get_asset":
          const assetUrl = `https://${site}/assets/${path}`;
          result = { content: await fetch(assetUrl).then(r => r.ok ? r.text() : "Not found") };
          break;

        // Similar pattern for rules, chapters, skills...
        case "list_rules":
          result = { items: ["rule-combat.md", "rule-characters.md" /* maintain list or convention */].filter(n => matchesFilter(n, filter)) };
          break;
        case "get_rule":
          const ruleUrl = `https://${site}/.github/skills/rules/${fileName}`;
          result = { content: await fetch(ruleUrl).then(r => r.ok ? r.text() : "Not found") };
          break;

        case "list_chapters":
          result = { items: ["chapter-1-introduction.md" /* etc */].filter(n => matchesFilter(n, filter)) };
          break;
        case "get_chapter":
          const chapUrl = `https://${site}/.github/skills/rules/${fileName}`;
          result = { content: await fetch(chapUrl).then(r => r.ok ? r.text() : "Not found") };
          break;

        case "list_skills":
          result = { items: ["onboarding.md", "character-creation.md" /* non-rule/chapter */].filter(n => matchesFilter(n, filter)) };
          break;
        case "get_skill":
          const skillUrl = `https://${site}/.github/skills/${fileName}`;
          result = { content: await fetch(skillUrl).then(r => r.ok ? r.text() : "Not found") };
          break;

        // For prompts & agents – adjust paths if they exist in repo
        case "list_prompts":
          result = { items: [] /* populate if prompts folder/files added */ };
          break;
        case "get_prompt":
          result = { content: "No prompts configured yet" };
          break;

        case "list_custom_agents":
          result = { items: [] /* populate if agents exist */ };
          break;
        case "get_custom_agent":
          result = { content: "No custom agents configured yet" };
          break;

        default:
          throw new Error("Unknown tool");
      }

      responseQueue.push({ jsonrpc: "2.0", id: body.id, result });
    } catch (err) {
      responseQueue.push({ jsonrpc: "2.0", id: body.id, error: { code: -32000, message: (err as Error).message } });
    }

    return new Response(null, { status: 202 });
  }

  return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32601, message: "Method not found" } }), { status: 404 });
};
```

#### sse.ts (GET /sse – streaming responses)
Same as before (unchanged):

```ts
// netlify/edge-functions/sse.ts
import type { Context } from "@netlify/edge-functions";

extern const responseQueue: any[];

export default async (request: Request, context: Context) => {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`data: {"type": "heartbeat"}\n\n`));
      }, 15000);

      const poller = setInterval(() => {
        while (responseQueue.length > 0) {
          const msg = responseQueue.shift();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
        }
      }, 1000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        clearInterval(poller);
        controller.close();
      });
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
};
```

### Step 3: Important Notes on Listing Tools
Because Netlify Edge Functions cannot read the filesystem at build/deploy time (and we want to avoid hardcoding everything forever), the `list_*` tools currently use hardcoded example arrays for demonstration.

**Recommended improvements (choose one):**
- Maintain a static JSON manifest in the repo (e.g. `static/file-index.json`) with all relevant file paths → load that in `list_*` tools.
- After adding files, manually update the arrays in `messages.ts`.
- For a more dynamic feel, accept that lists are approximate and users can guess/use `get_*` directly.

### Step 4: Deploy & Test
1. Commit & push all changes to the main branch of https://github.com/megazear7/galactic-adventures-assistant
2. Go to Netlify dashboard → Add new site → Import from Git → select this repo
3. Deploy (Netlify auto-detects netlify.toml)
4. After deploy, get your URL (e.g. `https://galactic-adventures-assistant.netlify.app`)
5. Test:
   - `curl https://<your-site>.netlify.app/sse` → should stream heartbeats
   - POST example:
     ```
     curl -X POST https://<your-site>.netlify.app/messages \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tool_call","params":{"name":"get_rule","input":{"name":"rule-combat.md"}}}'
     ```
   - Watch SSE for the streamed result

Customize `WELCOME_TEXT`, add real file lists to the code, and expand as you add more content to the repo.

This keeps everything static, CDN-backed, and directly tied to your repo's files. Let me know if you want a version with a shared `file-index.json` or Streamable HTTP instead!