import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { adoGet, adoPatch, isAzureError } from '../../utils/azureDevOpsClient.js';

export const definition: Tool = {
  name: 'update_work_item',
  description:
    'Actualiza campos de un work item existente en Azure DevOps. REQUIERE CONFIRMACIÓN EXPLÍCITA: llama primero con confirmed=false para ver un preview de los cambios (incluye el estado actual del item), muéstraselo al usuario, y solo llama con confirmed=true tras su aprobación explícita.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'ID del work item a actualizar.' },
      fields: {
        type: 'object',
        description:
          'Campos a actualizar. Claves son nombres de campo de Azure DevOps. Ej: { "System.Title": "Nuevo título", "System.State": "Active" }',
        additionalProperties: true,
      },
      project: { type: 'string', description: 'Proyecto de Azure DevOps (opcional).' },
      confirmed: {
        type: 'boolean',
        description:
          'false = devuelve preview sin ejecutar nada. true = ejecuta la actualización en Azure DevOps.',
      },
    },
    required: ['id', 'fields', 'confirmed'],
  },
};

export async function handler(args: Record<string, unknown>): Promise<unknown> {
  const id = args.id as number;
  const fields = args.fields as Record<string, unknown>;
  const project = args.project as string | undefined;
  const confirmed = args.confirmed as boolean;

  if (!confirmed) {
    let currentFields: Record<string, unknown> | null = null;
    const current = await adoGet<Record<string, unknown>>(`wit/workitems/${id}`, project);
    if (!isAzureError(current)) {
      const f = (current.fields ?? {}) as Record<string, unknown>;
      const assignedTo = f['System.AssignedTo'] as Record<string, unknown> | undefined;
      currentFields = {
        'System.Title': f['System.Title'],
        'System.State': f['System.State'],
        'System.AssignedTo': assignedTo?.displayName ?? null,
      };
    }
    return {
      requires_confirmation: true,
      preview: { id, currentFields, changes: fields },
      message: 'Revisa los cambios y llama de nuevo con confirmed=true para actualizar el work item.',
    };
  }

  const patchDoc = Object.entries(fields).map(([key, value]) => ({
    op: 'add',
    path: `/fields/${key}`,
    value,
  }));

  const result = await adoPatch<Record<string, unknown>>(
    `wit/workitems/${id}`,
    patchDoc,
    project,
    'application/json-patch+json',
  );
  if (isAzureError(result)) return result;

  const resultFields = (result.fields ?? {}) as Record<string, unknown>;
  const links = result._links as Record<string, unknown> | undefined;
  const html = links?.['html'] as Record<string, unknown> | undefined;

  const updatedFields: Record<string, unknown> = {};
  for (const key of Object.keys(fields)) {
    updatedFields[key] = resultFields[key] ?? null;
  }

  return {
    id: result.id,
    url: html?.['href'] ?? null,
    updatedFields,
  };
}
