import { z } from 'zod';
import type { ToolDefinition } from '../types.js';
import { adoGet, adoPatch, isAzureError, workItemUrl } from '../../utils/azureDevOpsClient.js';

/** Tipo de relación de Azure DevOps para el vínculo hacia el work item padre. */
const REL_PARENT = 'System.LinkTypes.Hierarchy-Reverse';

interface WorkItemRelation {
  rel?: string;
  url?: string;
}

/**
 * Localiza la relación de padre (Hierarchy-Reverse) dentro del arreglo `relations`
 * de un work item y devuelve su índice (necesario para removerla vía JSON-Patch) y
 * el id del padre actual (parseado del final de la URL). Devuelve null si el item no
 * tiene padre. Un work item solo puede tener UN padre por esta relación.
 */
function findParentRelation(
  relations: unknown,
): { index: number; parentId: number | null } | null {
  if (!Array.isArray(relations)) return null;
  for (let i = 0; i < relations.length; i++) {
    const rel = relations[i] as WorkItemRelation;
    if (rel?.rel === REL_PARENT) {
      const match = typeof rel.url === 'string' ? rel.url.match(/(\d+)\s*$/) : null;
      return { index: i, parentId: match ? Number(match[1]) : null };
    }
  }
  return null;
}

export const definition: ToolDefinition = {
  name: 'update_work_item',
  description:
    'Actualiza campos y/o el vínculo padre de un work item existente en Azure DevOps. Los campos van en `fields`; el padre en `parent` (se aplica como relación jerárquica, no como campo). REQUIERE CONFIRMACIÓN EXPLÍCITA: llama primero con confirmed=false para ver un preview de los cambios (incluye el estado actual del item), muéstraselo al usuario, y solo llama con confirmed=true tras su aprobación explícita.',
  inputSchema: {
    id: z.number().describe('ID del work item a actualizar.'),
    fields: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'Campos a actualizar (opcional). Claves son reference names de campo de Azure DevOps. Ej: { "System.Title": "Nuevo título", "System.State": "Active" }',
      ),
    parent: z
      .number()
      .optional()
      .describe(
        'ID del work item padre (opcional). Crea el vínculo jerárquico padre-hijo. Se aplica como relación, no como campo (por eso "System.Parent" no funciona).',
      ),
    project: z.string().optional().describe('Proyecto de Azure DevOps (opcional).'),
    confirmed: z
      .boolean()
      .describe(
        'false = devuelve preview sin ejecutar nada. true = ejecuta la actualización en Azure DevOps.',
      ),
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
    let currentParent: number | null = null;
    // $expand=relations para poder mostrar el padre actual en el preview (y avisar
    // que una reasignación reemplazará el vínculo existente).
    const current = await adoGet<Record<string, unknown>>(
      `wit/workitems/${id}?$expand=relations`,
      project,
    );
    if (!isAzureError(current)) {
      const f = (current.fields ?? {}) as Record<string, unknown>;
      const assignedTo = f['System.AssignedTo'] as Record<string, unknown> | undefined;
      currentFields = {
        'System.Title': f['System.Title'],
        'System.State': f['System.State'],
        'System.AssignedTo': assignedTo?.displayName ?? null,
      };
      currentParent = findParentRelation(current.relations)?.parentId ?? null;
    }
    return {
      requires_confirmation: true,
      preview: { id, currentFields, changes: fields, parent: parent ?? null, currentParent },
      message: 'Revisa los cambios y llama de nuevo con confirmed=true para actualizar el work item.',
    };
  }

  const patchDoc: Array<{ op: string; path: string; value?: unknown }> = Object.entries(fields).map(
    ([key, value]) => ({
      op: 'add',
      path: `/fields/${key}`,
      value,
    }),
  );

  // El vínculo padre-hijo es una relación, no un campo. Azure DevOps solo admite UN
  // padre por Hierarchy-Reverse: para REASIGNARLO hay que remover primero la relación
  // existente (por su índice) y luego agregar la nueva; hacer solo `add` cuando ya hay
  // padre falla. Por eso primero leemos las relaciones actuales.
  if (tienePadre) {
    const current = await adoGet<Record<string, unknown>>(
      `wit/workitems/${id}?$expand=relations`,
      project,
    );
    // Best-effort: si la lectura falla, se intenta agregar directo (comportamiento
    // válido para un item huérfano; si ya tuviera padre, Azure devolverá el error).
    const existing = isAzureError(current)
      ? null
      : findParentRelation(current.relations);

    if (existing && existing.parentId === parent) {
      // El padre ya es el solicitado: no se emite ninguna op de relación (no-op).
    } else {
      if (existing) {
        patchDoc.push({ op: 'remove', path: `/relations/${existing.index}` });
      }
      patchDoc.push({
        op: 'add',
        path: '/relations/-',
        value: { rel: REL_PARENT, url: workItemUrl(parent as number) },
      });
    }
  }

  // Puede quedar vacío si solo se pidió reasignar al MISMO padre y no hay campos.
  if (patchDoc.length === 0) {
    return {
      id,
      unchanged: true,
      parent: parent ?? null,
      message: 'El work item ya estaba en el estado solicitado; no se realizaron cambios.',
    };
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
