#!/usr/bin/env node
import './loadEnv.js'; // DEBE ir primero: carga .env antes que módulos que leen process.env
import { createRequire } from 'module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult, GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

import * as listRuleCategories from './tools/rules/listRuleCategories.js';
import * as listRules from './tools/rules/listRules.js';
import * as getRule from './tools/rules/getRule.js';
import * as searchRules from './tools/rules/searchRules.js';
import * as getApplicableRules from './tools/rules/getApplicableRules.js';
import * as listSchemas from './tools/schemas/listSchemas.js';
import * as getSchema from './tools/schemas/getSchema.js';
import * as getWorkItem from './tools/azureDevOps/getWorkItem.js';
import * as queryWorkItems from './tools/azureDevOps/queryWorkItems.js';
import * as listPullRequests from './tools/azureDevOps/listPullRequests.js';
import * as getPrThreads from './tools/azureDevOps/getPrThreads.js';
import * as createWorkItem from './tools/azureDevOps/createWorkItem.js';
import * as updateWorkItem from './tools/azureDevOps/updateWorkItem.js';
import * as addPrComment from './tools/azureDevOps/addPrComment.js';
import type { ToolModule } from './tools/types.js';
import { prompts } from './prompts/index.js';
import { logUsage, extractMeta } from './utils/usageLog.js';

const tools: ToolModule[] = [
  listRuleCategories,
  listRules,
  getRule,
  searchRules,
  getApplicableRules,
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

// La versión se lee de package.json (única fuente de verdad) en vez de
// hardcodearla aquí, para que no se desincronice al publicar una nueva.
const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const server = new McpServer({ name: 'iafit', version });

/**
 * Envuelve el handler de una tool para:
 *  1) serializar su resultado al formato de contenido de MCP (texto JSON),
 *  2) registrar telemetría best-effort (qué tool, si fue ok, metadata accionable),
 *  3) traducir una excepción a un error estructurado `internal_error`.
 *
 * Nota: la validación de argumentos (tipos, requeridos) la hace zod en la frontera
 * de `registerTool` ANTES de este wrapper; aquí los args ya vienen validados. Un
 * resultado con `error` string cuenta como no-ok (p. ej. invalid_category), pero
 * se devuelve como contenido normal (no isError): es una respuesta legítima que el
 * agente debe leer, no un fallo de protocolo.
 */
function withTelemetry(name: string, handler: ToolModule['handler']) {
  return async (args: Record<string, unknown>): Promise<CallToolResult> => {
    try {
      const result = await handler(args);
      const res = (result ?? {}) as Record<string, unknown>;
      logUsage({
        ts: new Date().toISOString(),
        tool: name,
        ok: typeof res.error !== 'string',
        meta: extractMeta(name, args, result),
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      logUsage({ ts: new Date().toISOString(), tool: name, ok: false, meta: { error: 'internal_error' } });
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
  };
}

for (const { definition, handler } of tools) {
  server.registerTool(
    definition.name,
    { description: definition.description, inputSchema: definition.inputSchema },
    withTelemetry(definition.name, handler),
  );
}

for (const prompt of prompts) {
  server.registerPrompt(
    prompt.name,
    { description: prompt.description },
    () => prompt.build() as unknown as GetPromptResult,
  );
}

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  process.stderr.write(`[IAFIT] Fatal: ${String(err)}\n`);
  process.exit(1);
});
