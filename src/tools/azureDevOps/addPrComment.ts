import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { adoPost, isAzureError } from '../../utils/azureDevOpsClient.js';

export const definition: Tool = {
  name: 'add_pr_comment',
  description:
    'Agrega un comentario a un pull request de Azure DevOps, en un hilo nuevo o existente. REQUIERE CONFIRMACIÓN EXPLÍCITA: llama primero con confirmed=false para ver un preview del comentario, muéstraselo al usuario, y solo llama con confirmed=true tras su aprobación explícita. No publiques comentarios sin confirmación.',
  inputSchema: {
    type: 'object',
    properties: {
      repository: { type: 'string', description: 'Nombre del repositorio.' },
      pullRequestId: { type: 'number', description: 'ID del pull request.' },
      comment: { type: 'string', description: 'Texto del comentario a agregar.' },
      threadId: {
        type: 'number',
        description:
          'ID del hilo existente al que responder (ver get_pr_threads). Si se omite, crea un hilo nuevo.',
      },
      project: { type: 'string', description: 'Proyecto de Azure DevOps (opcional).' },
      confirmed: {
        type: 'boolean',
        description:
          'false = devuelve preview sin publicar nada. true = publica el comentario en Azure DevOps.',
      },
    },
    required: ['repository', 'pullRequestId', 'comment', 'confirmed'],
  },
};

export async function handler(args: Record<string, unknown>): Promise<unknown> {
  const repository = args.repository as string;
  const pullRequestId = args.pullRequestId as number;
  const comment = args.comment as string;
  const threadId = args.threadId as number | undefined;
  const project = args.project as string | undefined;
  const confirmed = args.confirmed as boolean;

  if (!confirmed) {
    return {
      requires_confirmation: true,
      preview: {
        repository,
        pullRequestId,
        comment,
        threadId: threadId ?? '(hilo nuevo)',
      },
      message: 'Revisa el comentario y llama de nuevo con confirmed=true para publicarlo.',
    };
  }

  const repoPath = `git/repositories/${encodeURIComponent(repository)}`;

  if (threadId !== undefined) {
    const result = await adoPost<Record<string, unknown>>(
      `${repoPath}/pullrequests/${pullRequestId}/threads/${threadId}/comments`,
      { content: comment, parentCommentId: 0, commentType: 1 },
      project,
    );
    if (isAzureError(result)) return result;
    return { threadId, commentId: result.id, url: null };
  }

  const result = await adoPost<Record<string, unknown>>(
    `${repoPath}/pullrequests/${pullRequestId}/threads`,
    { comments: [{ content: comment, commentType: 1 }], status: 1 },
    project,
  );
  if (isAzureError(result)) return result;

  const comments = (result.comments as Array<Record<string, unknown>>) ?? [];
  return {
    threadId: result.id,
    commentId: comments[0]?.id ?? null,
    url: null,
  };
}
