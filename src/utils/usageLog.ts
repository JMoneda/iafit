import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Telemetría de uso LOCAL y opcional. Registra qué tools se llaman, si fallan y
 * un mínimo de metadata accionable (p. ej. búsquedas con 0 resultados) para poder
 * mejorar el catálogo de reglas con datos en vez de intuición.
 *
 * Principios NO negociables (transport stdio de MCP):
 * - NUNCA escribe en stdout: solo a un archivo bajo IAFIT_DATA_DIR (~/.iafit).
 *   Un byte en stdout rompe el protocolo JSON-RPC (ver README, -32000).
 * - Fire-and-forget: cualquier fallo de E/S se traga en silencio. La telemetría
 *   jamás puede tumbar una llamada de tool.
 * - Solo metadata, nunca payloads completos ni contenido de reglas.
 * - Es local (la máquina de cada quien); se desactiva con IAFIT_TELEMETRY=0.
 */

const DATA_DIR = process.env.IAFIT_DATA_DIR ?? path.join(os.homedir(), '.iafit');
const LOG_FILE = path.join(DATA_DIR, 'usage.jsonl');
/** Umbral de rotación: por encima, se renombra a usage.jsonl.1 y se empieza de cero. */
const MAX_BYTES = 5 * 1024 * 1024;

export interface UsageEntry {
  ts: string;
  tool: string;
  ok: boolean;
  /** Metadata accionable por tool; nunca payloads completos. */
  meta?: Record<string, unknown>;
}

function isEnabled(): boolean {
  return process.env.IAFIT_TELEMETRY !== '0';
}

/**
 * Extrae SOLO metadata accionable de los argumentos/resultado de cada tool.
 * Deliberadamente conservador: ante la duda, no registra el dato. Nunca captura
 * títulos, contenidos de reglas, ni cuerpos de work items.
 */
export function extractMeta(
  tool: string,
  args: Record<string, unknown>,
  result: unknown,
): Record<string, unknown> | undefined {
  const res = (result ?? {}) as Record<string, unknown>;
  const errored = typeof res.error === 'string';

  switch (tool) {
    case 'search_rules':
      // El oro está en las búsquedas con 0 resultados: qué se buscó y no existía.
      return {
        query: typeof args.query === 'string' ? args.query : undefined,
        category: typeof args.category === 'string' ? args.category : undefined,
        total: typeof res.total === 'number' ? res.total : undefined,
        zero: res.total === 0,
      };
    case 'get_applicable_rules':
      return {
        tags: Array.isArray(args.tags) ? args.tags : undefined,
        mode: typeof args.mode === 'string' ? args.mode : 'summary',
        total: typeof res.total === 'number' ? res.total : undefined,
      };
    case 'get_rule':
      return {
        category: typeof args.category === 'string' ? args.category : undefined,
        slug: typeof args.slug === 'string' ? args.slug : undefined,
        found: !errored,
      };
    case 'list_rules':
      return { category: typeof args.category === 'string' ? args.category : undefined };
    case 'get_schema':
      return { name: typeof args.name === 'string' ? args.name : undefined };
    default:
      // Azure DevOps y otras: solo si hubo error estructurado, registra el código.
      // Nunca IDs, títulos, ni contenido: podría ser sensible.
      return errored ? { error: res.error } : undefined;
  }
}

/** Rota el log si supera el umbral. Best-effort; si falla, se ignora. */
function rotateIfNeeded(): void {
  try {
    const { size } = fs.statSync(LOG_FILE);
    if (size > MAX_BYTES) {
      fs.renameSync(LOG_FILE, `${LOG_FILE}.1`);
    }
  } catch {
    // no existe aún, o no se pudo rotar: no pasa nada
  }
}

/**
 * Registra una llamada. Fire-and-forget: nunca lanza. Si la telemetría está
 * desactivada o la E/S falla, retorna sin efecto.
 */
export function logUsage(entry: UsageEntry): void {
  if (!isEnabled()) return;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    rotateIfNeeded();
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch {
    // E/S fallida: la telemetría jamás interrumpe una llamada de tool
  }
}

/** Ruta del archivo de log (para el reporte y los tests). */
export function usageLogPath(): string {
  return LOG_FILE;
}
