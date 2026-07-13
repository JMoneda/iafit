import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  isValidCategory,
  listRulesInCategory,
  VALID_CATEGORIES,
} from '../../utils/rulesReader.js';

export const definition: Tool = {
  name: 'list_rules',
  description:
    'Lista las reglas disponibles en una categoría. Devuelve slug, título, applies_to y status de cada entrada. Usa list_rule_categories para ver las categorías válidas, y get_rule para leer una regla en detalle.',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: [...VALID_CATEGORIES],
        description: 'Categoría de reglas a listar (ver list_rule_categories).',
      },
    },
    required: ['category'],
  },
};

export function handler(args: Record<string, unknown>): unknown {
  const category = args.category as string;
  if (!isValidCategory(category)) {
    return {
      error: 'invalid_category',
      message: `Categorías válidas: ${VALID_CATEGORIES.join(', ')}.`,
    };
  }
  return { rules: listRulesInCategory(category) };
}
