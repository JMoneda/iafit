import { z } from 'zod';
import type { ToolDefinition } from '../types.js';
import { getSchema } from '../../utils/schemasReader.js';

export const definition: ToolDefinition = {
  name: 'get_schema',
  description:
    'Devuelve el contenido completo de un schema de OpenSpec provisto por IAFIT: el schema.yaml y todas sus plantillas. Úsalo para escribir el schema en el proyecto destino, en openspec/schemas/<nombre>/ (schema.yaml + templates/*.md). Obtén el nombre desde list_schemas.',
  inputSchema: {
    name: z.string().describe('Nombre del schema a obtener (ver list_schemas).'),
  },
};

export function handler(args: Record<string, unknown>): unknown {
  const name = args.name as string;
  return getSchema(name);
}
