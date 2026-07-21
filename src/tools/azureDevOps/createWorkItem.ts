import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { adoGet, adoPost, isAzureError, workItemUrl } from '../../utils/azureDevOpsClient.js';

/** Tipo de relación de Azure DevOps para el vínculo hacia el work item padre. */
const REL_PARENT = 'System.LinkTypes.Hierarchy-Reverse';

export const definition: Tool = {
  name: 'create_work_item',
  description:
    'Crea un nuevo work item en Azure DevOps. Soporta campos personalizados del proceso (p. ej. "Task Type") vía el parámetro `fields`. REQUIERE CONFIRMACIÓN EXPLÍCITA: llama primero con confirmed=false para obtener un preview de lo que se crearía, muéstraselo al usuario, y solo llama con confirmed=true tras su aprobación explícita. Si el proyecto exige un campo obligatorio que no enviaste, la creación NO se realiza y la tool responde con requires_input=true y la lista de campos faltantes (con sus valores permitidos): pídeselos al usuario y reintenta con confirmed=true incluyéndolos en `fields`.',
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
      fields: {
        type: 'object',
        description:
          'Campos adicionales o personalizados del proceso. Claves = reference name del campo en Azure DevOps. Ej: { "Custom.TaskType": "Development", "Microsoft.VSTS.Common.Priority": 2 }. Úsalo para campos obligatorios del proceso que no cubren title/description/assignedTo/tags.',
        additionalProperties: true,
      },
      parent: {
        type: 'number',
        description:
          'ID del work item padre (opcional). Crea el vínculo jerárquico padre-hijo (p. ej. una Task bajo su User Story). Se aplica como relación, no como campo.',
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

interface WorkItemTypeField {
  referenceName: string;
  name: string;
  alwaysRequired?: boolean;
  allowedValues?: string[];
}

/**
 * Lee la definición de campos del tipo de work item (nombre, reference name,
 * si es obligatorio y sus valores permitidos). Lectura best-effort: si falla,
 * devuelve [] para no bloquear el flujo principal.
 */
async function getTypeFields(type: string, project?: string): Promise<WorkItemTypeField[]> {
  const res = await adoGet<{ value?: WorkItemTypeField[] }>(
    `wit/workitemtypes/${encodeURIComponent(type)}/fields?$expand=allowedValues`,
    project,
  );
  if (isAzureError(res) || !res.value) return [];
  return res.value;
}

/** Extrae los nombres de campo de un mensaje de regla de Azure DevOps. */
function parseRuleErrorFields(message: string): string[] {
  const nombres = new Set<string>();
  // Ej: "TF401320: Rule Error for field Task Type. Error code: Required, ..."
  const re = /Rule Error for field ([^.]+?)\./gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(message)) !== null) {
    nombres.add(m[1].trim());
  }
  return [...nombres];
}

function esErrorDeCampoObligatorio(message: string): boolean {
  return /Rule Error for field|\bRequired\b|TF401320/i.test(message);
}

export async function handler(args: Record<string, unknown>): Promise<unknown> {
  const type = args.type as string;
  const title = args.title as string;
  const description = args.description as string | undefined;
  const assignedTo = args.assignedTo as string | undefined;
  const tags = args.tags as string[] | undefined;
  const customFields = (args.fields as Record<string, unknown> | undefined) ?? {};
  const parent = args.parent as number | undefined;
  const project = args.project as string | undefined;
  const confirmed = args.confirmed as boolean;

  // Campos base derivados de los parámetros de conveniencia.
  const baseFields: Record<string, unknown> = { 'System.Title': title };
  if (description) baseFields['System.Description'] = description;
  if (assignedTo) baseFields['System.AssignedTo'] = assignedTo;
  if (tags?.length) baseFields['System.Tags'] = tags.join('; ');

  // Los campos personalizados explícitos tienen precedencia sobre los base.
  const allFields: Record<string, unknown> = { ...baseFields, ...customFields };

  if (!confirmed) {
    return {
      requires_confirmation: true,
      preview: { type, title, description, assignedTo, tags, fields: customFields, parent: parent ?? null },
      message:
        'Revisa los datos y llama de nuevo con confirmed=true para crear el work item. ' +
        'Si el proceso del proyecto exige campos obligatorios (p. ej. "Task Type"), inclúyelos en `fields`; ' +
        'si no los conoces, al confirmar la tool te dirá cuáles faltan y sus valores permitidos.',
    };
  }

  const patchDoc: Array<{ op: string; path: string; value: unknown }> = Object.entries(
    allFields,
  ).map(([key, value]) => ({
    op: 'add',
    path: `/fields/${key}`,
    value,
  }));

  // El vínculo padre-hijo es una relación, no un campo: se agrega en /relations/-.
  if (typeof parent === 'number') {
    patchDoc.push({
      op: 'add',
      path: '/relations/-',
      value: { rel: REL_PARENT, url: workItemUrl(parent) },
    });
  }

  const result = await adoPost<Record<string, unknown>>(
    `wit/workitems/$${encodeURIComponent(type)}`,
    patchDoc,
    project,
    'application/json-patch+json',
  );

  if (isAzureError(result)) {
    // Si el rechazo es por un campo obligatorio del proceso, no propagamos un
    // error crudo: devolvemos qué falta (y sus valores permitidos) para que el
    // agente se lo pida al usuario y reintente con `fields`.
    if (result.error === 'api_error' && esErrorDeCampoObligatorio(result.message)) {
      const nombresFaltantes = parseRuleErrorFields(result.message);
      const definiciones = await getTypeFields(type, project);
      const missingFields = (nombresFaltantes.length
        ? definiciones.filter(f => nombresFaltantes.includes(f.name))
        : definiciones.filter(f => f.alwaysRequired)
      ).map(f => ({
        referenceName: f.referenceName,
        name: f.name,
        allowedValues: f.allowedValues ?? [],
      }));

      return {
        requires_input: true,
        created: false,
        message:
          'El proyecto exige uno o más campos obligatorios que no se enviaron; el work item NO se creó. ' +
          'Pídele al usuario el valor de cada campo faltante (respetando allowedValues si tiene) y ' +
          'reintenta create_work_item con confirmed=true incluyéndolos en `fields`.',
        missingFields:
          missingFields.length > 0
            ? missingFields
            : nombresFaltantes.map(name => ({ name, referenceName: null, allowedValues: [] })),
        azureMessage: result.message,
      };
    }
    return result;
  }

  const f = (result.fields ?? {}) as Record<string, unknown>;
  const links = result._links as Record<string, unknown> | undefined;
  const html = links?.['html'] as Record<string, unknown> | undefined;

  return {
    id: result.id,
    title: f['System.Title'],
    state: f['System.State'],
    parent: parent ?? null,
    url: html?.['href'] ?? null,
  };
}
