import type { ToolDefinition } from '../types.js';
import {
  VALID_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  countRulesInCategory,
} from '../../utils/rulesReader.js';

export const definition: ToolDefinition = {
  name: 'list_rule_categories',
  description:
    'Devuelve las categorías de reglas disponibles con el número de entradas en cada una. Úsala primero para orientarte antes de explorar una categoría específica con list_rules.',
  inputSchema: {},
};

export function handler(_args: Record<string, unknown>): unknown {
  return {
    categories: VALID_CATEGORIES.map(cat => ({
      name: cat,
      description: CATEGORY_DESCRIPTIONS[cat],
      count: countRulesInCategory(cat),
    })),
  };
}
