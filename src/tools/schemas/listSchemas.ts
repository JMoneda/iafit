import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { listSchemas } from '../../utils/schemasReader.js';

export const definition: Tool = {
  name: 'list_schemas',
  description:
    'Lista los schemas de OpenSpec que IAFIT provee para instalar en un proyecto (ej. research, inventario-tecnico, migracion-incremental). Devuelve nombre, versión y descripción. Úsala durante el onboarding para saber qué flujos de trabajo configurar, y get_schema para obtener su contenido.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export function handler(_args: Record<string, unknown>): unknown {
  return { schemas: listSchemas() };
}
