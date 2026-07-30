import type { ToolDefinition } from '../types.js';
import {
  VALID_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  countRulesInCategory,
  listRulesInCategory,
} from '../../utils/rulesReader.js';

export const definition: ToolDefinition = {
  name: 'list_rule_categories',
  description:
    'Devuelve las categorías de reglas disponibles con el número de entradas en cada una. `count` es lo que devuelve list_rules por defecto (solo activas); `inactive` cuenta las deprecated/superseded, visibles con include_inactive: true. Úsala primero para orientarte antes de explorar una categoría específica con list_rules.',
  inputSchema: {},
};

export function handler(_args: Record<string, unknown>): unknown {
  return {
    categories: VALID_CATEGORIES.map(cat => {
      // `count` DEBE coincidir con lo que devuelve list_rules por defecto: si aquí se
      // contaran también las inactivas, el agente leería "2 reglas", pediría la lista,
      // recibiría 1 y no podría distinguir un filtro de un fallo del servidor.
      const activas = listRulesInCategory(cat).length;
      const inactivas = countRulesInCategory(cat) - activas;
      return {
        name: cat,
        description: CATEGORY_DESCRIPTIONS[cat],
        count: activas,
        ...(inactivas > 0 ? { inactive: inactivas } : {}),
      };
    }),
  };
}
