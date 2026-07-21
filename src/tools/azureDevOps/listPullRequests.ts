import { z } from 'zod';
import type { ToolDefinition } from '../types.js';
import { adoGet, isAzureError } from '../../utils/azureDevOpsClient.js';

export const definition: ToolDefinition = {
  name: 'list_pull_requests',
  description:
    'Lista los pull requests de un repositorio de Azure DevOps. Filtra por estado (active, completed, abandoned) y por creador. Úsala para ver el estado actual de revisiones de código. Pagina automáticamente el resultado de Azure DevOps; devuelve hasta maxResults (default 100) y marca truncated=true si hay más.',
  inputSchema: {
    repository: z.string().describe('Nombre del repositorio.'),
    status: z
      .enum(['active', 'completed', 'abandoned', 'all'])
      .optional()
      .describe('Estado de los PRs a listar (por defecto: active).'),
    createdBy: z
      .string()
      .optional()
      .describe('Filtrar por nombre de usuario del creador (opcional).'),
    maxResults: z
      .number()
      .optional()
      .describe('Máximo de PRs a devolver (default 100). Si hay más, la respuesta trae truncated=true.'),
    project: z.string().optional().describe('Proyecto de Azure DevOps (opcional).'),
  },
};

/** Tamaño de página al consultar PRs a Azure DevOps (usa $top/$skip). */
const PAGE_SIZE = 100;

export async function handler(args: Record<string, unknown>): Promise<unknown> {
  const repository = args.repository as string;
  const status = (args.status as string | undefined) ?? 'active';
  const createdBy = args.createdBy as string | undefined;
  const project = args.project as string | undefined;
  const maxResults =
    typeof args.maxResults === 'number' && args.maxResults > 0 ? args.maxResults : 100;

  // Azure DevOps devuelve como mucho una página; para no truncar en silencio
  // paginamos con $top/$skip hasta reunir maxResults o agotar los resultados.
  const collected: Array<Record<string, unknown>> = [];
  for (let skip = 0; ; skip += PAGE_SIZE) {
    let path =
      `git/repositories/${encodeURIComponent(repository)}/pullrequests` +
      `?searchCriteria.status=${status}&$top=${PAGE_SIZE}&$skip=${skip}`;
    if (createdBy) {
      path += `&searchCriteria.creatorId=${encodeURIComponent(createdBy)}`;
    }

    const result = await adoGet<Record<string, unknown>>(path, project);
    if (isAzureError(result)) return result;

    const value = (result.value as Array<Record<string, unknown>>) ?? [];
    collected.push(...value);

    // Página incompleta = no hay más. También paramos si ya tenemos evidencia de
    // que hay más de maxResults (un elemento por encima del tope basta).
    if (value.length < PAGE_SIZE || collected.length > maxResults) break;
  }

  const truncated = collected.length > maxResults;
  const page = collected.slice(0, maxResults);

  return {
    pullRequests: page.map(pr => {
      const createdByObj = pr.createdBy as Record<string, unknown> | undefined;
      return {
        id: pr.pullRequestId,
        title: pr.title,
        status: pr.status,
        createdBy: createdByObj?.displayName ?? null,
        sourceBranch: (pr.sourceRefName as string | undefined)?.replace('refs/heads/', '') ?? null,
        targetBranch: (pr.targetRefName as string | undefined)?.replace('refs/heads/', '') ?? null,
        url: pr.url ?? null,
      };
    }),
    count: page.length,
    truncated,
  };
}
