import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { isValidCategory, getRule, VALID_CATEGORIES } from '../../utils/rulesReader.js';

export const definition: Tool = {
  name: 'get_rule',
  description:
    'Lee el contenido completo de una regla específica por categoría y slug. Úsala cuando necesites los detalles, ejemplos o justificación de una regla antes de implementar algo. Obtén el slug desde list_rules.',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: [...VALID_CATEGORIES],
        description: 'Categoría de la regla (ver list_rule_categories).',
      },
      slug: {
        type: 'string',
        description: 'Identificador único de la regla (ver list_rules).',
      },
    },
    required: ['category', 'slug'],
  },
};

export function handler(args: Record<string, unknown>): unknown {
  const category = args.category as string;
  const slug = args.slug as string;

  if (!isValidCategory(category)) {
    return {
      error: 'invalid_category',
      message: `Categorías válidas: ${VALID_CATEGORIES.join(', ')}.`,
    };
  }

  return getRule(category, slug);
}
