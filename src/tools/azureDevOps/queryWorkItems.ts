import { z } from 'zod';
import type { ToolDefinition } from '../types.js';
import { adoPost, adoGet, isAzureError } from '../../utils/azureDevOpsClient.js';

export const definition: ToolDefinition = {
  name: 'query_work_items',
  description:
    "Ejecuta una query WIQL en Azure DevOps y devuelve los work items resultantes. Útil para encontrar tareas de un sprint, items bloqueados, o cualquier filtro personalizado. Ejemplo WIQL: \"SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.State] = 'Active'\".",
  inputSchema: {
    wiql: z.string().describe('Query en formato WIQL.'),
    project: z.string().optional().describe('Proyecto de Azure DevOps (opcional).'),
    maxResults: z
      .number()
      .optional()
      .describe('Número máximo de resultados a retornar (por defecto 50).'),
  },
};

/** Máximo de ids por lote en la API de work items de Azure DevOps. */
const BATCH_SIZE = 200;

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

  if (ids.length === 0) return { items: [], totalCount: 0, truncated: false };

  // La API de batch acepta como máximo 200 ids por llamada: troceamos para no
  // fallar (ni truncar en silencio) cuando maxResults supera ese límite.
  const items: Array<Record<string, unknown>> = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE);
    const batchResult = await adoGet<Record<string, unknown>>(
      `wit/workitems?ids=${chunk.join(',')}&fields=System.Id,System.Title,System.WorkItemType,System.State`,
      project,
    );
    if (isAzureError(batchResult)) return batchResult;

    const value = (batchResult.value as Array<Record<string, unknown>>) ?? [];
    for (const wi of value) {
      const f = (wi.fields ?? {}) as Record<string, unknown>;
      items.push({
        id: wi.id,
        title: f['System.Title'],
        type: f['System.WorkItemType'],
        state: f['System.State'],
      });
    }
  }

  return {
    items,
    totalCount: allItems.length,
    // La query casó más items de los que se devuelven (sube maxResults para ver más).
    truncated: allItems.length > ids.length,
  };
}
