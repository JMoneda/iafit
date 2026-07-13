import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { adoGet, isAzureError } from '../../utils/azureDevOpsClient.js';

export const definition: Tool = {
  name: 'list_pull_requests',
  description:
    'Lista los pull requests de un repositorio de Azure DevOps. Filtra por estado (active, completed, abandoned) y por creador. Úsala para ver el estado actual de revisiones de código.',
  inputSchema: {
    type: 'object',
    properties: {
      repository: { type: 'string', description: 'Nombre del repositorio.' },
      status: {
        type: 'string',
        enum: ['active', 'completed', 'abandoned', 'all'],
        description: 'Estado de los PRs a listar (por defecto: active).',
      },
      createdBy: {
        type: 'string',
        description: 'Filtrar por nombre de usuario del creador (opcional).',
      },
      project: {
        type: 'string',
        description: 'Proyecto de Azure DevOps (opcional).',
      },
    },
    required: ['repository'],
  },
};

export async function handler(args: Record<string, unknown>): Promise<unknown> {
  const repository = args.repository as string;
  const status = (args.status as string | undefined) ?? 'active';
  const createdBy = args.createdBy as string | undefined;
  const project = args.project as string | undefined;

  let path = `git/repositories/${encodeURIComponent(repository)}/pullrequests?searchCriteria.status=${status}`;
  if (createdBy) {
    path += `&searchCriteria.creatorId=${encodeURIComponent(createdBy)}`;
  }

  const result = await adoGet<Record<string, unknown>>(path, project);
  if (isAzureError(result)) return result;

  const value = (result.value as Array<Record<string, unknown>>) ?? [];

  return {
    pullRequests: value.map(pr => {
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
  };
}
