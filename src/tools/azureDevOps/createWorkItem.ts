import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { adoPost, isAzureError } from '../../utils/azureDevOpsClient.js';

export const definition: Tool = {
  name: 'create_work_item',
  description:
    'Crea un nuevo work item en Azure DevOps. REQUIERE CONFIRMACIÓN EXPLÍCITA: llama primero con confirmed=false para obtener un preview de lo que se crearía, muéstraselo al usuario, y solo llama con confirmed=true tras su aprobación explícita. No ejecutes con confirmed=true sin mostrar el preview primero.',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Tipo de work item. Ej: "Task", "Bug", "User Story".',
      },
      title: { type: 'string', description: 'Título del work item.' },
      description: { type: 'string', description: 'Descripción (HTML permitido, opcional).' },
      assignedTo: {
        type: 'string',
        description: 'Email o nombre para mostrar del asignado (opcional).',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags a aplicar (opcional).',
      },
      project: { type: 'string', description: 'Proyecto de Azure DevOps (opcional).' },
      confirmed: {
        type: 'boolean',
        description:
          'false = devuelve preview sin ejecutar nada. true = ejecuta la creación en Azure DevOps.',
      },
    },
    required: ['type', 'title', 'confirmed'],
  },
};

export async function handler(args: Record<string, unknown>): Promise<unknown> {
  const type = args.type as string;
  const title = args.title as string;
  const description = args.description as string | undefined;
  const assignedTo = args.assignedTo as string | undefined;
  const tags = args.tags as string[] | undefined;
  const project = args.project as string | undefined;
  const confirmed = args.confirmed as boolean;

  const preview = { type, title, description, assignedTo, tags };

  if (!confirmed) {
    return {
      requires_confirmation: true,
      preview,
      message: 'Revisa los datos y llama de nuevo con confirmed=true para crear el work item.',
    };
  }

  const patchDoc: Array<{ op: string; path: string; value: unknown }> = [
    { op: 'add', path: '/fields/System.Title', value: title },
  ];
  if (description) {
    patchDoc.push({ op: 'add', path: '/fields/System.Description', value: description });
  }
  if (assignedTo) {
    patchDoc.push({ op: 'add', path: '/fields/System.AssignedTo', value: assignedTo });
  }
  if (tags?.length) {
    patchDoc.push({ op: 'add', path: '/fields/System.Tags', value: tags.join('; ') });
  }

  const result = await adoPost<Record<string, unknown>>(
    `wit/workitems/$${encodeURIComponent(type)}`,
    patchDoc,
    project,
    'application/json-patch+json',
  );
  if (isAzureError(result)) return result;

  const f = (result.fields ?? {}) as Record<string, unknown>;
  const links = result._links as Record<string, unknown> | undefined;
  const html = links?.['html'] as Record<string, unknown> | undefined;

  return {
    id: result.id,
    title: f['System.Title'],
    state: f['System.State'],
    url: html?.['href'] ?? null,
  };
}
