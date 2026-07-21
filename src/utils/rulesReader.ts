import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const RULES_DIR =
  process.env.IAFIT_RULES_DIR ?? path.join(__dirname, '../../rules');

export type Category =
  | 'architecture'
  | 'code-standards'
  | 'adrs'
  | 'security'
  | 'migration'
  | 'observabilidad'
  | 'pruebas'
  | 'cicd';

export const VALID_CATEGORIES: Category[] = [
  'architecture',
  'code-standards',
  'adrs',
  'security',
  'migration',
  'observabilidad',
  'pruebas',
  'cicd',
];

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  architecture: 'Reglas de arquitectura por tipo de proyecto',
  'code-standards': 'Estándares de código por lenguaje o stack',
  adrs: 'Architecture Decision Records',
  security: 'Políticas de seguridad de desarrollo',
  migration: 'Reglas y matrices para migrar/actualizar proyectos entre versiones de framework',
  observabilidad: 'Logging, telemetría, auditoría y monitoreo',
  pruebas: 'Estándares de pruebas y calidad de código',
  cicd: 'CI/CD, DevOps e Infraestructura como Código',
};

export function isValidCategory(cat: string): cat is Category {
  return VALID_CATEGORIES.includes(cat as Category);
}

/**
 * Vocabulario CERRADO de tags para `applies_to`. Existe para que el matching de
 * get_applicable_rules sea confiable: si un frontmatter escribiera "net" y otro
 * "dotnet", el filtrado por intersección fallaría en silencio. El test de
 * integridad (rulesContent.test.ts) rechaza cualquier tag fuera de esta lista,
 * así que ampliar el vocabulario es un cambio deliberado (editar aquí) y no un
 * typo que se cuela.
 *
 * `all` es especial: una regla con applies_to:["all"] aplica a CUALQUIER contexto
 * (ver appliesToTags). No se pide como tag de búsqueda; se usa en las reglas
 * transversales (seguridad, observabilidad, cicd).
 */
export type Tag =
  | 'all'
  | 'backend'
  | 'frontend'
  | 'data'
  | 'dotnet'
  | 'angular'
  | 'typescript'
  | 'libreria';

export const VALID_TAGS: Tag[] = [
  'all',
  'backend',
  'frontend',
  'data',
  'dotnet',
  'angular',
  'typescript',
  'libreria',
];

export const TAG_DESCRIPTIONS: Record<Tag, string> = {
  all: 'Regla transversal: aplica a cualquier stack o contexto',
  backend: 'Servicios backend (independiente del lenguaje)',
  frontend: 'Aplicaciones y librerías de front-end',
  data: 'Persistencia y modelado de datos',
  dotnet: 'Stack .NET / C#',
  angular: 'Stack Angular',
  typescript: 'Código TypeScript (front o back)',
  libreria: 'Librería publicada (feed privado / npm)',
};

export function isValidTag(tag: string): tag is Tag {
  return VALID_TAGS.includes(tag as Tag);
}

export interface RuleFrontmatter {
  title: string;
  category: string;
  slug: string;
  version?: string;
  last_updated?: string;
  applies_to?: string[];
  /** `superseded`: reemplazada por otra regla/ADR (vocabulario estándar de ADRs). */
  status?: 'active' | 'deprecated' | 'draft' | 'superseded';
}

export interface RuleEntry {
  slug: string;
  title: string;
  applies_to: string[];
  status: string;
  last_updated: string;
}

export type RuleError = { error: string; message: string };

function listMarkdownFiles(category: Category): string[] {
  const dir = path.join(RULES_DIR, category);
  try {
    return fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.md') && f !== '_index.md');
  } catch {
    return [];
  }
}

function readFrontmatter(filePath: string): Partial<RuleFrontmatter> {
  try {
    const { data } = matter(fs.readFileSync(filePath, 'utf8'));
    return data as Partial<RuleFrontmatter>;
  } catch {
    return {};
  }
}

export function countRulesInCategory(category: Category): number {
  return listMarkdownFiles(category).length;
}

export function listRulesInCategory(category: Category): RuleEntry[] {
  return listMarkdownFiles(category).map(file => {
    const fm = readFrontmatter(path.join(RULES_DIR, category, file));
    return {
      slug: fm.slug ?? file.replace('.md', ''),
      title: fm.title ?? file,
      applies_to: fm.applies_to ?? ['all'],
      status: fm.status ?? 'active',
      last_updated: fm.last_updated ?? '',
    };
  });
}

export function getRule(
  category: Category,
  slug: string,
): { frontmatter: RuleFrontmatter; content: string } | RuleError {
  const dir = path.join(RULES_DIR, category);
  const files = listMarkdownFiles(category);

  const file = files.find(f => {
    const fm = readFrontmatter(path.join(dir, f));
    return fm.slug === slug || f === `${slug}.md`;
  });

  if (!file) {
    return {
      error: 'rule_not_found',
      message: `No existe regla con slug '${slug}' en categoría '${category}'.`,
    };
  }

  try {
    const { data, content } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
    return { frontmatter: data as RuleFrontmatter, content };
  } catch {
    return {
      error: 'rule_not_found',
      message: `No se pudo leer la regla '${slug}' en categoría '${category}'.`,
    };
  }
}

export interface SearchMatch {
  category: Category;
  slug: string;
  title: string;
  excerpt: string;
}

/**
 * Pliega un code point para búsqueda: quita diacríticos (migración → migracion)
 * y pasa a minúsculas. Garantiza mapeo 1:1 en code points para que los índices
 * del texto plegado coincidan con los del texto original.
 */
function foldCodePoint(c: string): string {
  const folded = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const points = Array.from(folded);
  return points.length === 1 ? points[0] : c;
}

function foldToCodePoints(s: string): string[] {
  return Array.from(s).map(foldCodePoint);
}

/** indexOf de subsecuencia sobre arreglos de code points. */
function indexOfCodePoints(haystack: string[], needle: string[]): number {
  if (needle.length === 0 || needle.length > haystack.length) return -1;
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

export function searchRules(query: string, category?: Category): SearchMatch[] {
  const foldedQuery = foldToCodePoints(query.trim());
  if (foldedQuery.length === 0) return [];

  const categories = category ? [category] : VALID_CATEGORIES;
  const results: SearchMatch[] = [];

  for (const cat of categories) {
    for (const file of listMarkdownFiles(cat)) {
      try {
        const raw = fs.readFileSync(path.join(RULES_DIR, cat, file), 'utf8');
        const { data, content } = matter(raw);
        const fm = data as Partial<RuleFrontmatter>;

        const original = Array.from(`${fm.title ?? ''} ${content}`);
        const folded = original.map(foldCodePoint);

        const idx = indexOfCodePoints(folded, foldedQuery);
        if (idx === -1) continue;

        const start = Math.max(0, idx - 80);
        const end = Math.min(original.length, idx + foldedQuery.length + 80);
        const excerpt = `...${original.slice(start, end).join('').trim()}...`;

        results.push({
          category: cat,
          slug: fm.slug ?? file.replace('.md', ''),
          title: fm.title ?? file,
          excerpt,
        });
      } catch {
        // skip unreadable files
      }
    }
  }

  return results;
}

export interface ApplicableRule {
  category: Category;
  slug: string;
  title: string;
  applies_to: string[];
  status: string;
  /** Presente solo en mode='full'. */
  content?: string;
  /** Presente solo en mode='summary': primeras líneas útiles del cuerpo. */
  excerpt?: string;
}

/**
 * Decide si una regla, según su `applies_to`, aplica a un conjunto de tags de
 * contexto. Una regla `["all"]` aplica siempre; en caso contrario, aplica si hay
 * intersección entre sus tags y los pedidos. El match es exacto sobre el
 * vocabulario cerrado (VALID_TAGS), no por substring.
 */
export function appliesToTags(ruleTags: string[], requested: string[]): boolean {
  if (ruleTags.includes('all')) return true;
  return ruleTags.some(t => requested.includes(t));
}

/** Extrae un excerpt corto del cuerpo: la primera línea de prosa no vacía. */
function firstProseLine(content: string): string {
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#') || line.startsWith('>')) continue;
    return line.length > 160 ? `${line.slice(0, 157)}...` : line;
  }
  return '';
}

/**
 * Devuelve, en UNA sola pasada por todo el corpus, las reglas activas que aplican
 * a los tags de contexto dados. Es el atajo pensado para el arranque de una tarea
 * de desarrollo: en vez de encadenar list_rule_categories → list_rules → get_rule,
 * el agente pide de golpe todo lo que aplica a, p. ej., ["angular","frontend"].
 *
 * - mode='summary' (default): título, slug, applies_to y un excerpt de una línea.
 *   Pensado para que el agente decida qué leer sin saturar su contexto.
 * - mode='full': incluye el contenido completo de cada regla.
 *
 * Excluye reglas deprecated/superseded: nunca se sugiere aplicar una regla obsoleta.
 * El orden prioriza las reglas más específicas (menos tags 'all') primero.
 */
export function getApplicableRules(
  tags: string[],
  mode: 'summary' | 'full' = 'summary',
): ApplicableRule[] {
  const results: ApplicableRule[] = [];

  for (const cat of VALID_CATEGORIES) {
    for (const file of listMarkdownFiles(cat)) {
      try {
        const raw = fs.readFileSync(path.join(RULES_DIR, cat, file), 'utf8');
        const { data, content } = matter(raw);
        const fm = data as Partial<RuleFrontmatter>;

        const status = fm.status ?? 'active';
        if (status === 'deprecated' || status === 'superseded') continue;

        const ruleTags = fm.applies_to ?? ['all'];
        if (!appliesToTags(ruleTags, tags)) continue;

        const base: ApplicableRule = {
          category: cat,
          slug: fm.slug ?? file.replace('.md', ''),
          title: fm.title ?? file,
          applies_to: ruleTags,
          status,
        };
        if (mode === 'full') base.content = content;
        else base.excerpt = firstProseLine(content);

        results.push(base);
      } catch {
        // se omiten archivos ilegibles; rulesContent.test.ts los cazaría
      }
    }
  }

  // Reglas específicas antes que transversales (['all'] al final).
  results.sort((a, b) => {
    const aAll = a.applies_to.includes('all') ? 1 : 0;
    const bAll = b.applies_to.includes('all') ? 1 : 0;
    if (aAll !== bAll) return aAll - bAll;
    return a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug);
  });

  return results;
}
