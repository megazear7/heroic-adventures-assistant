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
    `${BASE_URL}/sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    // 1. Verify SSE endpoint is available
    console.log("1. Checking SSE endpoint...");
    const sseResponse = await fetchWithTimeout(
      `${BASE_URL}/sse`,
      { headers: { Accept: "text/event-stream" } },
      5000,
    );
    if (!sseResponse.ok) {
      throw new Error(`SSE connection failed: HTTP ${sseResponse.status}`);
    }
    await sseResponse.body?.cancel();
    console.log("   SSE endpoint OK");

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
      `${BASE_URL}/sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      },
      5000,
    );

    // 4. List tools
    console.log("4. Listing tools...");
    const toolsResult = await jsonRpcCall("tools/list", {}, 2);
    const tools = toolsResult.result?.tools ?? [];
    console.log(`   Found ${tools.length} tools: ${tools.map((t) => t.name).join(", ")}`);

    // Verify expected tools exist
    const expectedTools = ["welcome", "chapters_info", "chapters_list", "chapters_get", "rules_info", "rules_list", "rules_get", "skills_info", "skills_list", "skills_get", "agents_info", "agents_list", "agents_get"];
    for (const name of expectedTools) {
      if (!tools.find((t) => t.name === name)) {
        throw new Error(`Expected tool "${name}" not found`);
      }
    }
    console.log("   All expected tools present");

    // 5. Call welcome tool
    console.log("5. Calling welcome tool...");
    const welcomeResult = await jsonRpcCall("tools/call", { name: "welcome", arguments: {} }, 3);
    if (!welcomeResult.result?.content?.[0]?.text) {
      throw new Error("welcome tool returned no content");
    }
    console.log("   Welcome tool OK");

    // 6. Call chapters_list
    console.log("6. Calling chapters_list...");
    const chaptersResult = await jsonRpcCall("tools/call", { name: "chapters_list", arguments: {} }, 4);
    const chaptersData = JSON.parse(chaptersResult.result.content[0].text);
    if (!chaptersData.entries || chaptersData.entries.length === 0) {
      throw new Error("chapters_list returned no entries");
    }
    console.log(`   Found ${chaptersData.entries.length} chapters`);

    // 7. Call chapters_get
    console.log("7. Calling chapters_get...");
    const chapterResult = await jsonRpcCall(
      "tools/call",
      { name: "chapters_get", arguments: { "entry-name": chaptersData.entries[0] } },
      5,
    );
    const chapterData = JSON.parse(chapterResult.result.content[0].text);
    if (!chapterData.content) {
      throw new Error("chapters_get returned no content");
    }
    console.log(`   Got chapter: ${chapterData.entry} (${chapterData.content.length} chars)`);

    // 8. Call rules_list
    console.log("8. Calling rules_list...");
    const rulesResult = await jsonRpcCall("tools/call", { name: "rules_list", arguments: {} }, 6);
    const rulesData = JSON.parse(rulesResult.result.content[0].text);
    if (!rulesData.entries || rulesData.entries.length === 0) {
      throw new Error("rules_list returned no entries");
    }
    console.log(`   Found ${rulesData.entries.length} rules`);

    // 9. Call agents_list
    console.log("9. Calling agents_list...");
    const agentsResult = await jsonRpcCall("tools/call", { name: "agents_list", arguments: {} }, 7);
    const agentsData = JSON.parse(agentsResult.result.content[0].text);
    if (!agentsData.entries || agentsData.entries.length === 0) {
      throw new Error("agents_list returned no entries");
    }
    console.log(`   Found ${agentsData.entries.length} agents`);

    // 10. Test error handling - unknown tool
    console.log("10. Testing error handling...");
    const errorResult = await jsonRpcCall("tools/call", { name: "nonexistent_tool", arguments: {} }, 8);
    if (!errorResult.result?.isError) {
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
