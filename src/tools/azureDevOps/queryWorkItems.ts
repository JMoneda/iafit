import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { adoPost, adoGet, isAzureError } from '../../utils/azureDevOpsClient.js';

export const definition: Tool = {
  name: 'query_work_items',
  description:
    "Ejecuta una query WIQL en Azure DevOps y devuelve los work items resultantes. Útil para encontrar tareas de un sprint, items bloqueados, o cualquier filtro personalizado. Ejemplo WIQL: \"SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.State] = 'Active'\".",
  inputSchema: {
    type: 'object',
    properties: {
      wiql: {
        type: 'string',
        description: 'Query en formato WIQL.',
      },
      project: {
        type: 'string',
        description: 'Proyecto de Azure DevOps (opcional).',
      },
      maxResults: {
        type: 'number',
        description: 'Número máximo de resultados a retornar (por defecto 50).',
      },
    },
    required: ['wiql'],
  },
};

export async function handler(args: Record<string, unknown>): Promise<unknown> {
  const wiql = args.wiql as string;
  const project = args.project as string | undefined;
  const maxResults = (args.maxResults as number | undefined) ?? 50;

  const queryResult = await adoPost<Record<string, unknown>>(
    'wit/wiql',
    { query: wiql },
    project,
  );
  if (isAzureError(queryResult)) return queryResult;

  const allItems = (queryResult.workItems as Array<{ id: number }>) ?? [];
  const ids = allItems.slice(0, maxResults).map(wi => wi.id);

  if (ids.length === 0) return { items: [], totalCount: 0 };

  const batchResult = await adoGet<Record<string, unknown>>(
    `wit/workitems?ids=${ids.join(',')}&fields=System.Id,System.Title,System.WorkItemType,System.State`,
    project,
  );
  if (isAzureError(batchResult)) return batchResult;

  const value = (batchResult.value as Array<Record<string, unknown>>) ?? [];

  return {
    items: value.map(wi => {
      const f = (wi.fields ?? {}) as Record<string, unknown>;
      return {
        id: wi.id,
        title: f['System.Title'],
        type: f['System.WorkItemType'],
        state: f['System.State'],
      };
    }),
    totalCount: allItems.length,
  };
}
