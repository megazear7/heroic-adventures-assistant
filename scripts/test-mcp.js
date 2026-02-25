const BASE_URL = "http://localhost:8888";
const SSE_TIMEOUT_MS = 10000;

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

async function run() {
  let devProcess = null;
  let startedByScript = false;

  try {
    // 1. Connect to SSE endpoint
    const sseResponse = await fetchWithTimeout(
      `${BASE_URL}/sse`,
      { headers: { Accept: "text/event-stream" } },
      5000,
    );
    if (!sseResponse.ok || !sseResponse.body) {
      throw new Error(`SSE connection failed: HTTP ${sseResponse.status}`);
    }

    const reader = sseResponse.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";

    // Wait for the endpoint event
    const endpointStart = Date.now();
    while (Date.now() - endpointStart < SSE_TIMEOUT_MS) {
      const { value, done } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });
      if (sseBuffer.includes("event: endpoint")) break;
    }
    if (!sseBuffer.includes("event: endpoint")) {
      throw new Error("Did not receive endpoint event from SSE");
    }

    // Helper to wait for a JSON-RPC response with a specific id on the SSE stream
    async function waitForResponse(id) {
      const start = Date.now();
      while (Date.now() - start < SSE_TIMEOUT_MS) {
        const { value, done } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        // Look for a complete event containing our id
        if (sseBuffer.includes(`"id":${id}`) && sseBuffer.includes(`"result"`)) {
          return true;
        }
      }
      return false;
    }

    // 2. Send initialize request
    const initResponse = await fetchWithTimeout(
      `${BASE_URL}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test-client", version: "1.0.0" },
          },
        }),
      },
      5000,
    );
    if (initResponse.status !== 202) {
      throw new Error(`initialize did not return 202: HTTP ${initResponse.status}`);
    }

    if (!(await waitForResponse(1))) {
      throw new Error("Did not receive initialize response on SSE stream");
    }

    // 3. Send initialized notification
    await fetchWithTimeout(
      `${BASE_URL}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      },
      5000,
    );

    // 4. Send tools/list
    const toolsResponse = await fetchWithTimeout(
      `${BASE_URL}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      },
      5000,
    );
    if (toolsResponse.status !== 202) {
      throw new Error(`tools/list did not return 202: HTTP ${toolsResponse.status}`);
    }

    if (!(await waitForResponse(2))) {
      throw new Error("Did not receive tools/list response on SSE stream");
    }

    // 5. Send tools/call for welcome
    const testId = 4242;
    const callResponse = await fetchWithTimeout(
      `${BASE_URL}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: testId,
          method: "tools/call",
          params: { name: "welcome", arguments: {} },
        }),
      },
      5000,
    );

    if (callResponse.status !== 202) {
      throw new Error(`tools/call did not return 202: HTTP ${callResponse.status}`);
    }

    if (!(await waitForResponse(testId))) {
      throw new Error("Did not receive tools/call result on SSE stream in time");
    }

    await reader.cancel();
    console.log("MCP smoke test passed.");
  } finally {
    if (startedByScript && devProcess) {
      devProcess.kill("SIGTERM");
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
