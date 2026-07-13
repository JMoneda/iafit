import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SCHEMAS_DIR =
  process.env.IAFIT_SCHEMAS_DIR ?? path.join(__dirname, '../../schemas');

export interface SchemaEntry {
  name: string;
  version: string;
  description: string;
}

export interface SchemaPayload {
  name: string;
  schemaYaml: string;
  templates: Record<string, string>;
}

export type SchemaError = { error: string; message: string };

function isSchemaDir(name: string): boolean {
  try {
    return fs.statSync(path.join(SCHEMAS_DIR, name, 'schema.yaml')).isFile();
  } catch {
    return false;
  }
}

/**
 * Extrae la descripción del schema.yaml. Soporta valor en línea
 * (`description: texto`) y escalares plegados/literales (`description: >` o `|`),
 * en cuyo caso concatena las líneas indentadas siguientes hasta la primera línea
 * de nivel raíz.
 */
function readDescription(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const idx = lines.findIndex(l => /^description:/.test(l));
  if (idx === -1) return '';

  const inline = lines[idx].replace(/^description:\s*/, '').trim();
  if (inline && inline !== '>' && inline !== '|') {
    return inline.replace(/^["']|["']$/g, '');
  }

  const collected: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    if (!/^\s/.test(line)) break; // línea de nivel raíz: fin del bloque
    collected.push(line.trim());
  }
  return collected.join(' ').trim();
}

/** Lee los campos name/version/description desde el frontmatter-like del schema.yaml. */
function readSchemaMeta(name: string): SchemaEntry {
  const file = path.join(SCHEMAS_DIR, name, 'schema.yaml');
  let version = '';
  let description = '';
  try {
    // El schema.yaml de OpenSpec no es frontmatter; parseamos las claves de nivel raíz
    // de forma tolerante sin depender de un parser YAML completo.
    const raw = fs.readFileSync(file, 'utf8');
    const versionMatch = raw.match(/^version:\s*(.+)$/m);
    if (versionMatch) version = versionMatch[1].trim();
    description = readDescription(raw);
  } catch {
    // deja valores por defecto
  }
  return { name, version, description };
}

export function listSchemas(): SchemaEntry[] {
  let dirs: string[] = [];
  try {
    dirs = fs
      .readdirSync(SCHEMAS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && isSchemaDir(d.name))
      .map(d => d.name);
  } catch {
    return [];
  }
  return dirs.map(readSchemaMeta);
}

export function getSchema(name: string): SchemaPayload | SchemaError {
  if (!/^[a-z0-9-]+$/.test(name) || !isSchemaDir(name)) {
    return {
      error: 'schema_not_found',
      message: `No existe schema '${name}'. Usa list_schemas para ver los disponibles.`,
    };
  }

  const schemaYaml = fs.readFileSync(
    path.join(SCHEMAS_DIR, name, 'schema.yaml'),
    'utf8',
  );

  const templates: Record<string, string> = {};
  const templatesDir = path.join(SCHEMAS_DIR, name, 'templates');
  try {
    for (const file of fs.readdirSync(templatesDir)) {
      if (file.endsWith('.md')) {
        templates[file] = fs.readFileSync(path.join(templatesDir, file), 'utf8');
      }
    }
  } catch {
    // schema sin plantillas
  }

  return { name, schemaYaml, templates };
}
