const BASE = "http://localhost:8888";

async function main() {
  // 1. Connect SSE
  console.log("1. Connecting to SSE...");
  const sse = await fetch(`${BASE}/sse`, {
    headers: { Accept: "text/event-stream" },
  });
  if (!sse.ok || !sse.body) {
    throw new Error(`SSE failed: ${sse.status}`);
  }
  const reader = sse.body.getReader();
  const decoder = new TextDecoder();

  // 2. Wait for endpoint event
  let buf = "";
  const t0 = Date.now();
  while (Date.now() - t0 < 5000) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    if (buf.includes("event: endpoint")) break;
  }
  console.log("2. Endpoint event received:", buf.includes("event: endpoint"));

  // 3. POST initialize
  console.log("3. Sending initialize...");
  const initRes = await fetch(`${BASE}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "debug", version: "1.0.0" },
      },
    }),
  });
  console.log("   POST status:", initRes.status);
  const initBody = await initRes.text();
  console.log("   POST body:", JSON.stringify(initBody));

  // 4. Wait for response on SSE
  console.log("4. Waiting for SSE response...");
  const start = Date.now();
  while (Date.now() - start < 5000) {
    const { value, done } = await reader.read();
    if (done) {
      console.log("   Stream ended");
      break;
    }
    const chunk = decoder.decode(value, { stream: true });
    buf += chunk;
    console.log("   Chunk:", JSON.stringify(chunk));
    if (buf.includes('"id":1') && buf.includes('"result"')) {
      console.log("SUCCESS!");
      await reader.cancel();
      process.exit(0);
    }
  }

  console.log("FAILED - full buffer:");
  console.log(buf);
  await reader.cancel();
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
