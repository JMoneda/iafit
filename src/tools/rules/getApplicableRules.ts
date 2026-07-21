import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  getApplicableRules,
  isValidTag,
  VALID_TAGS,
  TAG_DESCRIPTIONS,
} from '../../utils/rulesReader.js';

const TAGS_DOC = VALID_TAGS.filter(t => t !== 'all')
  .map(t => `"${t}" (${TAG_DESCRIPTIONS[t]})`)
  .join(', ');

export const definition: Tool = {
  name: 'get_applicable_rules',
  description:
    'Devuelve en UNA sola llamada todas las reglas ACTIVAS que aplican a un stack o ' +
    'contexto de trabajo, filtradas por sus tags de applies_to. Úsala SIEMPRE al iniciar ' +
    'una tarea de desarrollo, ANTES de escribir código, en vez de encadenar ' +
    'list_rule_categories + list_rules + get_rule. Las reglas transversales (applies_to ' +
    '"all": seguridad, observabilidad, CI/CD) se incluyen automáticamente. ' +
    `Tags válidos: ${TAGS_DOC}. ` +
    'Ejemplos: tags=["angular","frontend"] para una tarea de UI; tags=["dotnet","backend"] ' +
    'para un API. Empieza en mode="summary" (título + slug + excerpt) para decidir qué leer, ' +
    'y luego usa get_rule (o este mismo con mode="full") para el detalle de las que importan.',
  inputSchema: {
    type: 'object',
    properties: {
      tags: {
        type: 'array',
        items: { type: 'string', enum: VALID_TAGS.filter(t => t !== 'all') },
        minItems: 1,
        description:
          'Tags del contexto de trabajo a matchear contra applies_to. No incluyas "all": ' +
          'las reglas transversales entran solas.',
      },
      mode: {
        type: 'string',
        enum: ['summary', 'full'],
        description:
          'summary (default) = título, slug, applies_to y un excerpt de una línea, para ' +
          'decidir sin saturar el contexto. full = contenido completo de cada regla.',
      },
    },
    required: ['tags'],
  },
};

export function handler(args: Record<string, unknown>): unknown {
  const tags = args.tags as string[] | undefined;
  const mode = (args.mode as string | undefined) ?? 'summary';

  if (!Array.isArray(tags) || tags.length === 0) {
    return {
      error: 'invalid_tags',
      message: 'Debes indicar al menos un tag. Tags válidos: ' + VALID_TAGS.join(', ') + '.',
    };
  }

  const invalid = tags.filter(t => !isValidTag(t));
  if (invalid.length > 0) {
    return {
      error: 'invalid_tags',
      message:
        `Tags no reconocidos: ${invalid.join(', ')}. ` +
        `Tags válidos: ${VALID_TAGS.join(', ')}.`,
    };
  }

  if (mode !== 'summary' && mode !== 'full') {
    return {
      error: 'invalid_mode',
      message: "mode debe ser 'summary' o 'full'.",
    };
  }

  const rules = getApplicableRules(tags, mode);
  return { tags, mode, total: rules.length, rules };
}
