import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { adoGet, isAzureError } from '../../utils/azureDevOpsClient.js';

export const definition: Tool = {
  name: 'get_work_item',
  description:
    'Lee un work item de Azure DevOps por su ID. Devuelve título, tipo, estado, asignado, descripción y criterios de aceptación. Úsala para entender el contexto de una tarea antes de implementar.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'ID del work item.' },
      project: {
        type: 'string',
        description: 'Proyecto de Azure DevOps. Si se omite, usa AZURE_DEVOPS_PROJECT.',
      },
    },
    required: ['id'],
  },
};

export async function handler(args: Record<string, unknown>): Promise<unknown> {
  const id = args.id as number;
  const project = args.project as string | undefined;

  const result = await adoGet<Record<string, unknown>>(
    `wit/workitems/${id}?$expand=all`,
    project,
  );
  if (isAzureError(result)) return result;

  const f = (result.fields ?? {}) as Record<string, unknown>;
  const assignedTo = f['System.AssignedTo'] as Record<string, unknown> | null;
  const links = result._links as Record<string, unknown> | undefined;
  const html = links?.['html'] as Record<string, unknown> | undefined;

  return {
    id: result.id,
    title: f['System.Title'],
    type: f['System.WorkItemType'],
    state: f['System.State'],
    assignedTo: assignedTo?.displayName ?? null,
    description: f['System.Description'] ?? null,
    acceptanceCriteria: f['Microsoft.VSTS.Common.AcceptanceCriteria'] ?? null,
    url: html?.['href'] ?? null,
  };
}
