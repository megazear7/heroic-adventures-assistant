import type { Context } from '@netlify/functions';
import { createMcpServer } from 'static-mcpify';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import path from 'path';

const contentDir = path.join(process.cwd(), 'assets/content');

export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', server: 'heroic-adventures-mcp' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const server = createMcpServer(contentDir);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);

  try {
    return await transport.handleRequest(req);
  } finally {
    await server.close();
  }
};

export const config = {
  path: '/mcp',
  includedFiles: ['../../assets/content/**'],
};
