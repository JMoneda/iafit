#!/usr/bin/env node
import './loadEnv.js'; // DEBE ir primero: carga .env antes que módulos que leen process.env
import { createRequire } from 'module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  type GetPromptResult,
} from '@modelcontextprotocol/sdk/types.js';

import * as listRuleCategories from './tools/rules/listRuleCategories.js';
import * as listRules from './tools/rules/listRules.js';
import * as getRule from './tools/rules/getRule.js';
import * as searchRules from './tools/rules/searchRules.js';
import * as listSchemas from './tools/schemas/listSchemas.js';
import * as getSchema from './tools/schemas/getSchema.js';
import * as getWorkItem from './tools/azureDevOps/getWorkItem.js';
import * as queryWorkItems from './tools/azureDevOps/queryWorkItems.js';
import * as listPullRequests from './tools/azureDevOps/listPullRequests.js';
import * as getPrThreads from './tools/azureDevOps/getPrThreads.js';
import * as createWorkItem from './tools/azureDevOps/createWorkItem.js';
import * as updateWorkItem from './tools/azureDevOps/updateWorkItem.js';
import * as addPrComment from './tools/azureDevOps/addPrComment.js';
import { prompts, promptMap } from './prompts/index.js';

type ToolModule = {
  definition: { name: string; description?: string; inputSchema: object };
  handler: (args: Record<string, unknown>) => unknown;
};

const tools: ToolModule[] = [
  listRuleCategories,
  listRules,
  getRule,
  searchRules,
  listSchemas,
  getSchema,
  getWorkItem,
  queryWorkItems,
  listPullRequests,
  getPrThreads,
  createWorkItem,
  updateWorkItem,
  addPrComment,
];

const toolMap = new Map(tools.map(t => [t.definition.name, t.handler]));

// La versión se lee de package.json (única fuente de verdad) en vez de
// hardcodearla aquí, para que no se desincronice al publicar una nueva.
const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const server = new Server(
  { name: 'iafit', version },
  { capabilities: { tools: {}, prompts: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(t => t.definition),
}));

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: prompts.map(p => ({ name: p.name, description: p.description })),
}));

server.setRequestHandler(GetPromptRequestSchema, async request => {
  const prompt = promptMap.get(request.params.name);
  if (!prompt) {
    throw new Error(`Prompt '${request.params.name}' no existe.`);
  }
  return prompt.build() as unknown as GetPromptResult;
});

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args = {} } = request.params;
  const handler = toolMap.get(name);

  if (!handler) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'unknown_tool', message: `Tool '${name}' no existe.` }),
        },
      ],
    };
  }

  try {
    const result = await handler(args as Record<string, unknown>);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'internal_error',
            message: err instanceof Error ? err.message : String(err),
          }),
        },
      ],
    };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  process.stderr.write(`[IAFIT] Fatal: ${String(err)}\n`);
  process.exit(1);
});
