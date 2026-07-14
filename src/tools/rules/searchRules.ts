import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { isValidCategory, searchRules, VALID_CATEGORIES } from '../../utils/rulesReader.js';
import type { Category } from '../../utils/rulesReader.js';

export const definition: Tool = {
  name: 'search_rules',
  description:
    'Busca por texto libre en todas las reglas de todas las categorías (insensible a mayúsculas y acentos). Útil cuando no sabes en qué categoría está la regla o cuando buscas por concepto (ej. "JWT", "secrets", "pagination"). Devuelve fragmentos del contenido relevante.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Texto a buscar en el contenido de las reglas.',
      },
      category: {
        type: 'string',
        enum: [...VALID_CATEGORIES],
        description: 'Limitar la búsqueda a una categoría específica (opcional, ver list_rule_categories).',
      },
    },
    required: ['query'],
  },
};

export function handler(args: Record<string, unknown>): unknown {
  const query = args.query as string;
  const category = args.category as string | undefined;

  if (category !== undefined && !isValidCategory(category)) {
    return {
      error: 'invalid_category',
      message: `Categorías válidas: ${VALID_CATEGORIES.join(', ')}.`,
    };
  }

  const matches = searchRules(query, category as Category | undefined);
  return { matches, total: matches.length };
}
