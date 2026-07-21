import { z } from 'zod';
import type { ToolDefinition } from '../types.js';
import { isValidCategory, getRule, VALID_CATEGORIES } from '../../utils/rulesReader.js';

export const definition: ToolDefinition = {
  name: 'get_rule',
  description:
    'Lee el contenido completo de una regla específica por categoría y slug. Úsala cuando necesites los detalles, ejemplos o justificación de una regla antes de implementar algo. Obtén el slug desde list_rules.',
  inputSchema: {
    category: z
      .string()
      .describe(
        `Categoría de la regla (ver list_rule_categories). Válidas: ${VALID_CATEGORIES.join(', ')}.`,
      ),
    slug: z.string().describe('Identificador único de la regla (ver list_rules).'),
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
