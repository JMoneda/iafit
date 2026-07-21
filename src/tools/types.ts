import type { ZodRawShape } from 'zod';

/**
 * Contrato de una tool de IAFIT. `inputSchema` es un ZodRawShape (un objeto plano
 * de validadores zod, p. ej. `{ query: z.string() }`), NO un JSON Schema: el SDK
 * lo envuelve en un `z.object(...)` y lo valida en la frontera de `registerTool`,
 * antes de invocar el handler. Así los argumentos malformados (tipo incorrecto,
 * requerido ausente) se rechazan con un error claro sin tocar el handler.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ZodRawShape;
}

/** Handler de una tool. Recibe los argumentos ya validados por zod. */
export type ToolHandler = (
  args: Record<string, unknown>,
) => unknown | Promise<unknown>;

export interface ToolModule {
  definition: ToolDefinition;
  handler: ToolHandler;
}
