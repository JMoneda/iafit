import { z } from 'zod';
import type { ToolDefinition } from '../types.js';
import { isValidCategory, searchRules, VALID_CATEGORIES } from '../../utils/rulesReader.js';
import type { Category } from '../../utils/rulesReader.js';

export const definition: ToolDefinition = {
  name: 'search_rules',
  description:
    'Busca por TOKENS con ranking en todas las reglas (insensible a mayúsculas y acentos). ' +
    'A diferencia de una búsqueda literal, "paginacion tablas" encuentra reglas donde ambas ' +
    'palabras aparezcan aunque no estén contiguas; los resultados vienen ordenados por ' +
    'relevancia (título pesa más que tags, y tags más que cuerpo; casar todos los términos ' +
    'rankea por encima de casar solo uno). Útil cuando no sabes en qué categoría está la ' +
    'regla o buscas por concepto (ej. "JWT", "secrets", "paginación tablas"). Devuelve ' +
    'fragmentos, score, applies_to y status. Por defecto excluye reglas obsoletas ' +
    '(deprecated/superseded).',
  inputSchema: {
    query: z.string().describe('Texto a buscar; se parte en palabras (tokens).'),
    category: z
      .string()
      .optional()
      .describe(
        `Limitar la búsqueda a una categoría específica (opcional, ver list_rule_categories). Válidas: ${VALID_CATEGORIES.join(', ')}.`,
      ),
    limit: z.number().optional().describe('Máximo de resultados a devolver (default 10).'),
    include_inactive: z
      .boolean()
      .optional()
      .describe(
        'Incluir reglas deprecated/superseded (default false: no se sugieren reglas obsoletas).',
      ),
  },
};

export function handler(args: Record<string, unknown>): unknown {
  const query = args.query as string;
  const category = args.category as string | undefined;
  const limit = typeof args.limit === 'number' ? args.limit : undefined;
  const includeInactive = args.include_inactive === true;

  if (category !== undefined && !isValidCategory(category)) {
    return {
      error: 'invalid_category',
      message: `Categorías válidas: ${VALID_CATEGORIES.join(', ')}.`,
    };
  }

  const matches = searchRules(query, {
    category: category as Category | undefined,
    limit,
    includeInactive,
  });
  return { matches, total: matches.length };
}
