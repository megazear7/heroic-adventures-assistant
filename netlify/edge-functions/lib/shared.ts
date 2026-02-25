export type Context = {
  site?: {
    url?: string;
  };
};

export function getQueue(): unknown[] {
  const globalScope = globalThis as { __HEROIC_MCP_QUEUE__?: unknown[] };
  if (!globalScope.__HEROIC_MCP_QUEUE__) {
    globalScope.__HEROIC_MCP_QUEUE__ = [];
  }
  return globalScope.__HEROIC_MCP_QUEUE__;
}
