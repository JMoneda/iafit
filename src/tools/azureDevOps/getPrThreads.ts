import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { adoGet, isAzureError } from '../../utils/azureDevOpsClient.js';

export const definition: Tool = {
  name: 'get_pr_threads',
  description:
    'Devuelve todos los hilos de comentarios de un pull request, incluyendo comentarios de revisores y threads resueltos. Úsala para entender el estado de revisión de un PR.',
  inputSchema: {
    type: 'object',
    properties: {
      repository: { type: 'string', description: 'Nombre del repositorio.' },
      pullRequestId: { type: 'number', description: 'ID del pull request.' },
      project: { type: 'string', description: 'Proyecto de Azure DevOps (opcional).' },
    },
    required: ['repository', 'pullRequestId'],
  },
};

export async function handler(args: Record<string, unknown>): Promise<unknown> {
  const repository = args.repository as string;
  const pullRequestId = args.pullRequestId as number;
  const project = args.project as string | undefined;

  const result = await adoGet<Record<string, unknown>>(
    `git/repositories/${encodeURIComponent(repository)}/pullrequests/${pullRequestId}/threads`,
    project,
  );
  if (isAzureError(result)) return result;

  const value = (result.value as Array<Record<string, unknown>>) ?? [];

  return {
    threads: value.map(thread => {
      const comments = (thread.comments as Array<Record<string, unknown>>) ?? [];
      const author = (c: Record<string, unknown>) =>
        (c.author as Record<string, unknown> | undefined)?.displayName ?? null;

      return {
        id: thread.id,
        status: thread.status,
        comments: comments.map(c => ({
          id: c.id,
          author: author(c),
          content: c.content,
          date: c.publishedDate,
        })),
      };
    }),
  };
}
