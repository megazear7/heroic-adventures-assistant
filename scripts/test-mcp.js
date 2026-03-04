const BASE_URL = "http://localhost:8888";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function jsonRpcCall(method, params = {}, id = 1) {
  const response = await fetchWithTimeout(
    `${BASE_URL}/mcp`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    },
    10000,
  );
  if (!response.ok) {
    throw new Error(`${method} returned HTTP ${response.status}`);
  }
  return response.json();
}

async function run() {
  try {
    // 1. Verify MCP endpoint is available (GET returns status)
    console.log("1. Checking MCP endpoint...");
    const healthResponse = await fetchWithTimeout(`${BASE_URL}/mcp`, {}, 5000);
    if (!healthResponse.ok) {
      throw new Error(`MCP health check failed: HTTP ${healthResponse.status}`);
    }
    const health = await healthResponse.json();
    if (health.status !== "ok") {
      throw new Error("MCP health check did not return ok status");
    }
    console.log("   MCP endpoint OK");

    // 2. Initialize
    console.log("2. Sending initialize...");
    const initResult = await jsonRpcCall("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    });
    if (!initResult.result?.serverInfo?.name) {
      throw new Error("initialize did not return serverInfo");
    }
    console.log(`   Server: ${initResult.result.serverInfo.name} v${initResult.result.serverInfo.version}`);

    // 3. Send initialized notification
    console.log("3. Sending initialized notification...");
    await fetchWithTimeout(
      `${BASE_URL}/mcp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      },
      5000,
    );

    // 4. List tools
    console.log("4. Listing tools...");
    const toolsResult = await jsonRpcCall("tools/list", {}, 2);
    const tools = toolsResult.result?.tools ?? [];
    console.log(`   Found ${tools.length} tools: ${tools.map((t) => t.name).join(", ")}`);

    // Verify expected tools exist (static-mcpify auto-generated tools)
    const expectedTools = [
      "list_chapter", "get_chapter", "get_chapter_content",
      "list_rule", "get_rule", "get_rule_content",
      "list_skill", "get_skill", "get_skill_content",
      "list_agent", "get_agent", "get_agent_content",
      "list_assets", "get_asset",
    ];
    for (const name of expectedTools) {
      if (!tools.find((t) => t.name === name)) {
        throw new Error(`Expected tool "${name}" not found`);
      }
    }
    console.log("   All expected tools present");

    // 5. Call list_chapter
    console.log("5. Calling list_chapter...");
    const chaptersResult = await jsonRpcCall("tools/call", { name: "list_chapter", arguments: {} }, 3);
    const chaptersText = chaptersResult.result?.content?.[0]?.text;
    if (!chaptersText) {
      throw new Error("list_chapter returned no content");
    }
    console.log(`   list_chapter OK (${chaptersText.length} chars)`);

    // 6. Call get_chapter
    console.log("6. Calling get_chapter...");
    const chapterResult = await jsonRpcCall(
      "tools/call",
      { name: "get_chapter", arguments: { title: "chapter-01-introduction" } },
      4,
    );
    const chapterText = chapterResult.result?.content?.[0]?.text;
    if (!chapterText) {
      throw new Error("get_chapter returned no content");
    }
    console.log(`   get_chapter OK (${chapterText.length} chars)`);

    // 7. Call get_chapter_content
    console.log("7. Calling get_chapter_content...");
    const chapterContentResult = await jsonRpcCall(
      "tools/call",
      { name: "get_chapter_content", arguments: { title: "chapter-01-introduction" } },
      5,
    );
    const chapterContent = chapterContentResult.result?.content?.[0]?.text;
    if (!chapterContent) {
      throw new Error("get_chapter_content returned no content");
    }
    console.log(`   get_chapter_content OK (${chapterContent.length} chars)`);

    // 8. Call list_rule
    console.log("8. Calling list_rule...");
    const rulesResult = await jsonRpcCall("tools/call", { name: "list_rule", arguments: {} }, 6);
    const rulesText = rulesResult.result?.content?.[0]?.text;
    if (!rulesText) {
      throw new Error("list_rule returned no content");
    }
    console.log(`   list_rule OK`);

    // 9. Call list_agent
    console.log("9. Calling list_agent...");
    const agentsResult = await jsonRpcCall("tools/call", { name: "list_agent", arguments: {} }, 7);
    const agentsText = agentsResult.result?.content?.[0]?.text;
    if (!agentsText) {
      throw new Error("list_agent returned no content");
    }
    console.log(`   list_agent OK`);

    // 10. Call list_skill
    console.log("10. Calling list_skill...");
    const skillsResult = await jsonRpcCall("tools/call", { name: "list_skill", arguments: {} }, 8);
    const skillsText = skillsResult.result?.content?.[0]?.text;
    if (!skillsText) {
      throw new Error("list_skill returned no content");
    }
    console.log(`   list_skill OK`);

    // 11. Call list_assets
    console.log("11. Calling list_assets...");
    const assetsResult = await jsonRpcCall("tools/call", { name: "list_assets", arguments: {} }, 9);
    const assetsText = assetsResult.result?.content?.[0]?.text;
    if (!assetsText) {
      throw new Error("list_assets returned no content");
    }
    console.log(`   list_assets OK`);

    // 12. Test error handling - unknown tool
    console.log("12. Testing error handling...");
    const errorResult = await jsonRpcCall("tools/call", { name: "nonexistent_tool", arguments: {} }, 10);
    if (!errorResult.result?.isError && !errorResult.error) {
      throw new Error("Expected error for unknown tool");
    }
    console.log("    Error handling OK");

    console.log("\nMCP smoke test passed.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

run();
