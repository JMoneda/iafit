import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { adoGet, adoPatch, isAzureError, workItemUrl } from '../../utils/azureDevOpsClient.js';

/** Tipo de relación de Azure DevOps para el vínculo hacia el work item padre. */
const REL_PARENT = 'System.LinkTypes.Hierarchy-Reverse';

export const definition: Tool = {
  name: 'update_work_item',
  description:
    'Actualiza campos y/o el vínculo padre de un work item existente en Azure DevOps. Los campos van en `fields`; el padre en `parent` (se aplica como relación jerárquica, no como campo). REQUIERE CONFIRMACIÓN EXPLÍCITA: llama primero con confirmed=false para ver un preview de los cambios (incluye el estado actual del item), muéstraselo al usuario, y solo llama con confirmed=true tras su aprobación explícita.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'ID del work item a actualizar.' },
      fields: {
        type: 'object',
        description:
          'Campos a actualizar (opcional). Claves son reference names de campo de Azure DevOps. Ej: { "System.Title": "Nuevo título", "System.State": "Active" }',
        additionalProperties: true,
      },
      parent: {
        type: 'number',
        description:
          'ID del work item padre (opcional). Crea el vínculo jerárquico padre-hijo. Se aplica como relación, no como campo (por eso "System.Parent" no funciona).',
      },
      project: { type: 'string', description: 'Proyecto de Azure DevOps (opcional).' },
      confirmed: {
        type: 'boolean',
        description:
          'false = devuelve preview sin ejecutar nada. true = ejecuta la actualización en Azure DevOps.',
      },
    },
    required: ['id', 'confirmed'],
  },
};

export async function handler(args: Record<string, unknown>): Promise<unknown> {
  const id = args.id as number;
  const fields = (args.fields as Record<string, unknown> | undefined) ?? {};
  const parent = args.parent as number | undefined;
  const project = args.project as string | undefined;
  const confirmed = args.confirmed as boolean;

  const tieneCampos = Object.keys(fields).length > 0;
  const tienePadre = typeof parent === 'number';

  if (!tieneCampos && !tienePadre) {
    return {
      error: 'nothing_to_update',
      message: 'No se indicó ningún cambio: pasa `fields` (campos) y/o `parent` (vínculo padre).',
    };
  }

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
      preview: { id, currentFields, changes: fields, parent: parent ?? null },
      message: 'Revisa los cambios y llama de nuevo con confirmed=true para actualizar el work item.',
    };
  }

  const patchDoc: Array<{ op: string; path: string; value: unknown }> = Object.entries(fields).map(
    ([key, value]) => ({
      op: 'add',
      path: `/fields/${key}`,
      value,
    }),
  );

  // El vínculo padre-hijo es una relación, no un campo: se agrega en /relations/-.
  if (tienePadre) {
    patchDoc.push({
      op: 'add',
      path: '/relations/-',
      value: { rel: REL_PARENT, url: workItemUrl(parent as number) },
    });
  }

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
    parent: parent ?? null,
  };
}
