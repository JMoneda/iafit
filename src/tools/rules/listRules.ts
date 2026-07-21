import { z } from 'zod';
import type { ToolDefinition } from '../types.js';
import {
  isValidCategory,
  listRulesInCategory,
  VALID_CATEGORIES,
} from '../../utils/rulesReader.js';

export const definition: ToolDefinition = {
  name: 'list_rules',
  description:
    'Lista las reglas disponibles en una categoría. Devuelve slug, título, applies_to, status ' +
    'y superseded_by (si aplica) de cada entrada. Por defecto omite reglas obsoletas ' +
    '(deprecated/superseded); pasa include_inactive=true para verlas todas. Usa ' +
    'list_rule_categories para ver las categorías válidas, y get_rule para leer una regla.',
  inputSchema: {
    category: z
      .string()
      .describe(
        `Categoría de reglas a listar (ver list_rule_categories). Válidas: ${VALID_CATEGORIES.join(', ')}.`,
      ),
    include_inactive: z
      .boolean()
      .optional()
      .describe(
        'Incluir reglas deprecated/superseded (default false: no se listan reglas obsoletas).',
      ),
  },
};

export function handler(args: Record<string, unknown>): unknown {
  const category = args.category as string;
  const includeInactive = args.include_inactive === true;
  if (!isValidCategory(category)) {
    return {
      error: 'invalid_category',
      message: `Categorías válidas: ${VALID_CATEGORIES.join(', ')}.`,
    };
  }
  return { rules: listRulesInCategory(category, includeInactive) };
}
